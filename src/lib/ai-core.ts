// Claude API に渡す指示と出力の形、受け取った後の照合（事前生成のスクリプトと、公開デモのその場の生成で共通）。
// 入力は架空の記事だけ。利用者の自由な文は渡さない（書き方は決まった選択肢から選ぶだけ）。
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { checkDraft, groundFact } from "./check";
import type { Incident } from "./collect";
import { CATEGORY_LABEL, FIRMS, articleById, sourceById } from "./data";
import { PRICING } from "./state";

export const SUMMARY_MODEL = "claude-haiku-5-5";
export const DRAFT_MODEL = "claude-sonnet-5-5";
export const SUMMARY_MAX_TOKENS = 2000;
export const DRAFT_MAX_TOKENS = 4000;

export const cost = (model: keyof typeof PRICING, u: { input_tokens: number; output_tokens: number }) => (u.input_tokens * PRICING[model].in + u.output_tokens * PRICING[model].out) / 1_000_000;

/** 1回の呼び出しで、かかりうる最大の費用（入力は多めに見積もり、出力は max_tokens いっぱい）。予算の予約に使う */
export const WORST_USD = {
  summary: cost(SUMMARY_MODEL, { input_tokens: 3000, output_tokens: SUMMARY_MAX_TOKENS }),
  draft: cost(DRAFT_MODEL, { input_tokens: 5000, output_tokens: DRAFT_MAX_TOKENS }),
};

/** 「(架空)」を全角の「（架空）」にそろえる（表記の統一だけ。内容は変えない） */
export const norm = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(/\(架空\)/g, "（架空）"));

export const sourcesText = (articleIds: string[]) =>
  articleIds
    .map((id) => {
      const a = articleById(id);
      const s = sourceById(a.sourceId);
      return `<article id="${a.id}" kind="${s.kind === "press" ? "企業の公式の発表" : "報道"}" source="${s.name}" date="${a.date}">\n${a.title}\n${a.text}\n</article>`;
    })
    .join("\n");

const COMMON = `入力の記事は、デモ用に作った架空のものです（企業名の後ろに「（架空）」を付けて書いてください）。記事に書かれていないことは書かないでください。`;

export const SummarySchema = z.object({
  summary: z.string().describe("事件の概要。1〜2文、100文字以内。です・ます調"),
  category: z.enum(["leak", "cyber", "consumer"]).describe("leak=個人情報の漏えい、cyber=サイバー攻撃、consumer=消費者被害"),
});
export type SummaryOut = z.infer<typeof SummarySchema>;

export function summaryRequest(articleIds: string[]) {
  return {
    model: SUMMARY_MODEL,
    max_tokens: SUMMARY_MAX_TOKENS,
    output_config: { effort: "low" as const, format: zodOutputFormat(SummarySchema) },
    system: `あなたは法律事務所の事務を助けるアシスタントです。収集したニュースの記事を、事件ごとに短く要約し、分類します。${COMMON}`,
    messages: [{ role: "user" as const, content: `次の記事は同じ事件についてのものです。最新の情報を優先して、事件の概要を書き、分類してください。\n\n${sourcesText(articleIds)}` }],
  };
}

export const DraftSchema = z.object({
  title: z.string().describe("事件ページの見出し。40文字以内"),
  facts: z
    .array(z.object({ text: z.string().describe("事実の文。1文。です・ます調"), sources: z.array(z.string()).describe("この文の根拠の記事の id（例：a1）") }))
    .describe("事件の事実。2〜4文"),
  guidance: z.string().describe("影響を受けた可能性のある方へのお知らせ。2〜3文"),
  announce: z.object({
    x: z.string().describe("X（旧Twitter）用の告知文。URL は書かず、末尾に {URL} と書く。全体で100文字以内"),
    line: z.string().describe("LINE 用の告知文。事務所名は {FIRM} と書き、末尾に改行と {URL}"),
    hp: z.string().describe("事務所のホームページのお知らせ欄の文。1〜2文"),
  }),
});
export type DraftOut = z.infer<typeof DraftSchema>;

const DRAFT_RULES = `あなたは法律事務所のウェブページの下書きを作るアシスタントです。収集した記事から、事件の情報を整理するページの下書きを作ります。下書きは、弁護士が確認して承認したものだけが公開されます。

事実の文の決まり：
- 記事に書かれていることだけを書く。推測、評価、法的な見解は書かない
- 数字、日付は記事にある通りに書く（「約12万件」なら「約12万件」）。記事にない数字は書かない
- 文ごとに、根拠の記事の id を sources に入れる。企業の公式の発表は「〜と発表しました」、報道は「〜と報じられています」と書き分ける
- 続報で数字が変わっていれば、新しい数字を書き、その続報の記事を出典にする
- 記事の言葉をできるだけそのまま使う（言い換えない）

広告の決まり（弁護士の広告の規程に合わせる）：
- 結果を約束する言葉（必ず、確実に、全額取り戻せる、勝訴できる など）を使わない
- 根拠のない最上級の言葉（日本一、No.1、唯一、業界最大 など）を使わない
- 「無料」と書かない
- 個人の氏名、年齢、電話番号、メールアドレスを書かない
- 不安をあおらない。落ち着いた、です・ます調で書く

${COMMON}`;

/** 書き方の選択肢（利用者は、この中から選ぶだけ。自由な文は受け付けない） */
export const STYLES = {
  standard: { label: "標準", prompt: "" },
  short: { label: "短く", prompt: "全体を短くしてください。事実の文は2つまで、お知らせは1〜2文にしてください。" },
  timeline: { label: "時系列を重視", prompt: "事実の文は、日付の古い順に並べ、できるだけ日付を入れてください（日付は記事にあるものだけ）。" },
} as const;
export type StyleId = keyof typeof STYLES;

export function draftRequest(inc: Pick<Incident, "articleIds" | "category">, style: StyleId = "standard", feedback?: string) {
  const content = `次の記事は同じ事件についてのものです（分類：${CATEGORY_LABEL[inc.category]}）。事件ページの下書きと、告知文の案を作ってください。お知らせ（guidance）は、まず企業の公式の発表を確かめることと、弁護士に相談できることを伝えてください。${STYLES[style].prompt ? `\n書き方：${STYLES[style].prompt}` : ""}\n\n${sourcesText(inc.articleIds)}${feedback ? `\n\n前回の下書きは、公開前のチェックで次の点が止まりました。直して作り直してください。\n${feedback}` : ""}`;
  return {
    model: DRAFT_MODEL,
    max_tokens: DRAFT_MAX_TOKENS,
    output_config: { effort: "medium" as const, format: zodOutputFormat(DraftSchema) },
    system: DRAFT_RULES,
    messages: [{ role: "user" as const, content }],
  };
}

/** 出典の照合と、公開前のチェック。止まる点の一覧（空なら合格） */
export function validateDraft(articleIds: string[], d: DraftOut): string[] {
  const problems: string[] = [];
  if (d.facts.length === 0) problems.push("事実の文がありません");
  d.facts.forEach((f, i) => {
    const bad = f.sources.filter((s) => !articleIds.includes(s));
    if (bad.length || f.sources.length === 0) problems.push(`事実の文 ${i + 1}：存在しない出典 ${bad.join(", ") || "（なし）"}`);
    else if (!groundFact(f.text, f.sources)) problems.push(`事実の文 ${i + 1}：出典の文と合わない（数字が出典にない、または言葉が出典と離れている）「${f.text}」`);
  });
  const r = checkDraft({ title: d.title, facts: d.facts, guidance: d.guidance, showLawyer: true, showFee: true }, FIRMS[0]);
  for (const i of r.issues.filter((x) => x.stop && x.check !== "grounding")) problems.push(i.message);
  for (const t of [d.announce.x, d.announce.line, d.announce.hp]) {
    const a = checkDraft({ title: "", facts: [], guidance: t, showLawyer: true, showFee: true }, FIRMS[0]);
    for (const i of a.issues.filter((x) => x.stop && (x.check === "assertive" || x.check === "hype" || x.check === "misleading" || x.check === "privacy"))) problems.push(`告知文：${i.message}`);
  }
  return problems;
}

/** 呼び出しの結果から、使った量と費用を取り出す */
export const usageOf = (model: keyof typeof PRICING, u: Anthropic.Usage) => ({ model, inTok: u.input_tokens, outTok: u.output_tokens, usd: cost(model, u) });
