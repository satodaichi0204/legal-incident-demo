// 事前生成：手元で Claude API を呼び、架空の記事だけをもとに、事件の概要・分類・下書き・告知文の案を作って data/generated.json に保存する。
// 公開したデモからは API を呼ばない（キーは .env.local だけに置き、画面はこの JSON を表示する）。
// 実行：npx tsx --env-file=.env.local scripts/pregenerate.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { checkDraft, groundFact } from "../src/lib/check";
import { cluster, fetchRun, type Incident } from "../src/lib/collect";
import { ARTICLES, CATEGORY_LABEL, FIRMS, articleById, sourceById, type Category } from "../src/lib/data";
import { PRICING, YEN } from "../src/lib/state";

const SUMMARY_MODEL = "claude-haiku-5-5";
const DRAFT_MODEL = "claude-sonnet-5-5";
/** この金額（ドル）を超えたら止める */
const BUDGET_USD = 1;

const client = new Anthropic();
let spent = 0;
const cost = (model: keyof typeof PRICING, u: { input_tokens: number; output_tokens: number }) => (u.input_tokens * PRICING[model].in + u.output_tokens * PRICING[model].out) / 1_000_000;

/** 生成する事件：1回目の収集の時点と、2回目（続報と、1回目に取れなかった情報源）の時点 */
function targets(): Incident[] {
  const arrived: Record<string, number> = {};
  for (const run of [1, 2]) for (const id of fetchRun(run, Object.keys(arrived)).fetched) arrived[id] = run;
  const run1: Record<string, number> = Object.fromEntries(Object.entries(arrived).filter(([, r]) => r === 1));
  const seen = new Set<string>();
  return [...cluster(run1), ...cluster(arrived)].filter((i) => {
    const k = i.articleIds.join("+");
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

const sourcesText = (inc: Incident) =>
  inc.articleIds
    .map((id) => {
      const a = articleById(id);
      const s = sourceById(a.sourceId);
      return `<article id="${a.id}" kind="${s.kind === "press" ? "企業の公式の発表" : "報道"}" source="${s.name}" date="${a.date}">\n${a.title}\n${a.text}\n</article>`;
    })
    .join("\n");

const COMMON = `入力の記事は、デモ用に作った架空のものです（企業名の後ろに「（架空）」を付けて書いてください）。記事に書かれていないことは書かないでください。`;

const SummarySchema = z.object({
  summary: z.string().describe("事件の概要。1〜2文、100文字以内。です・ます調"),
  category: z.enum(["leak", "cyber", "consumer"]).describe("leak=個人情報の漏えい、cyber=サイバー攻撃、consumer=消費者被害"),
});

async function summarize(inc: Incident) {
  const res = await client.messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(SummarySchema) },
    system: `あなたは法律事務所の事務を助けるアシスタントです。収集したニュースの記事を、事件ごとに短く要約し、分類します。${COMMON}`,
    messages: [{ role: "user", content: `次の記事は同じ事件についてのものです。最新の情報を優先して、事件の概要を書き、分類してください。\n\n${sourcesText(inc)}` }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`要約の形が崩れました（${res.stop_reason}）`);
  return { ...norm(res.parsed_output), model: SUMMARY_MODEL, inTok: res.usage.input_tokens, outTok: res.usage.output_tokens, usd: cost(SUMMARY_MODEL, res.usage) };
}

const DraftSchema = z.object({
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
type DraftOut = z.infer<typeof DraftSchema>;

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

async function draft(inc: Incident, feedback?: string) {
  const content = `次の記事は同じ事件についてのものです（分類：${CATEGORY_LABEL[inc.category]}）。事件ページの下書きと、告知文の案を作ってください。お知らせ（guidance）は、まず企業の公式の発表を確かめることと、弁護士に相談できることを伝えてください。\n\n${sourcesText(inc)}${feedback ? `\n\n前回の下書きは、公開前のチェックで次の点が止まりました。直して作り直してください。\n${feedback}` : ""}`;
  const res = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(DraftSchema) },
    system: DRAFT_RULES,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`下書きの形が崩れました（${res.stop_reason}）`);
  return { out: norm(res.parsed_output), inTok: res.usage.input_tokens, outTok: res.usage.output_tokens, usd: cost(DRAFT_MODEL, res.usage) };
}

/** 出典の照合と、公開前のチェック。止まる点の一覧（空なら合格） */
function validate(inc: Incident, d: DraftOut): string[] {
  const problems: string[] = [];
  d.facts.forEach((f, i) => {
    const bad = f.sources.filter((s) => !inc.articleIds.includes(s));
    if (bad.length) problems.push(`事実の文 ${i + 1}：存在しない出典 ${bad.join(", ")}`);
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

type Item = {
  key: string;
  company: string;
  articleIds: string[];
  summary?: { text: string; category: Category; model: string; inTok: number; outTok: number; usd: number };
  draft?: { title: string; facts: { text: string; sources: string[] }[]; guidance: string; announce: DraftOut["announce"]; model: string; inTok: number; outTok: number; usd: number; attempts: number; retryReason?: string[] };
  failed?: string[];
};

/** 「(架空)」を全角の「（架空）」にそろえる（表記の統一だけ。内容は変えない） */
const norm = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(/\(架空\)/g, "（架空）"));

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY がありません（.env.local に置いて --env-file で読み込む）");
  const items: Item[] = [];
  for (const inc of targets()) {
    if (spent > BUDGET_USD) throw new Error(`上限（$${BUDGET_USD}）を超えたので止めました`);
    const key = inc.articleIds.join("+");
    const item: Item = { key, company: inc.company, articleIds: inc.articleIds };
    const s = await summarize(inc);
    spent += s.usd;
    item.summary = { text: s.summary, category: s.category, model: s.model, inTok: s.inTok, outTok: s.outTok, usd: s.usd };

    let attempt = await draft(inc);
    let tok = { inTok: attempt.inTok, outTok: attempt.outTok, usd: attempt.usd };
    spent += attempt.usd;
    let problems = validate(inc, attempt.out);
    let retryReason: string[] | undefined;
    let attempts = 1;
    if (problems.length) {
      retryReason = problems;
      attempt = await draft(inc, problems.map((p) => `- ${p}`).join("\n"));
      attempts = 2;
      tok = { inTok: tok.inTok + attempt.inTok, outTok: tok.outTok + attempt.outTok, usd: tok.usd + attempt.usd };
      spent += attempt.usd;
      problems = validate(inc, attempt.out);
    }
    if (problems.length) item.failed = problems; // 見本モードの方法に戻す
    else item.draft = { ...attempt.out, model: DRAFT_MODEL, ...tok, attempts, retryReason };
    items.push(item);
    console.log(`${key}（${inc.company}）：概要 ${s.category}、下書き ${problems.length ? "不合格→見本に戻す" : `合格（${attempts}回目）`}　累計 $${spent.toFixed(4)}`);
  }
  const out = { generatedAt: new Date().toISOString(), models: { summary: SUMMARY_MODEL, draft: DRAFT_MODEL }, yenPerUsd: YEN, totalUsd: spent, inputArticles: ARTICLES.length, items };
  writeFileSync(new URL("../data/generated.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
  console.log(`保存しました：data/generated.json　合計 $${spent.toFixed(4)}（約${(spent * YEN).toFixed(1)}円）`);
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `API のエラー ${e.status}：${e.message}` : e);
  process.exit(1);
});
