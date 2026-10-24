// 事前生成：手元で Claude API を呼び、架空の記事だけをもとに、事件の概要・分類・下書き・告知文の案を作って data/generated.json に保存する。
// 指示と出力の形、照合は src/lib/ai-core.ts（公開デモのその場の生成と共通）。
// 実行：npx tsx --env-file=.env.local scripts/pregenerate.ts
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { DRAFT_MODEL, SUMMARY_MODEL, draftRequest, norm, summaryRequest, usageOf, validateDraft, type DraftOut } from "../src/lib/ai-core";
import { cluster, fetchRun, type Incident } from "../src/lib/collect";
import { ARTICLES, type Category } from "../src/lib/data";
import { YEN } from "../src/lib/state";

/** この金額（ドル）を超えたら止める */
const BUDGET_USD = 1;

const client = new Anthropic();
let spent = 0;

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

async function summarize(inc: Incident) {
  const res = await client.messages.parse(summaryRequest(inc.articleIds));
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`要約の形が崩れました（${res.stop_reason}）`);
  return { ...norm(res.parsed_output), ...usageOf(SUMMARY_MODEL, res.usage) };
}

async function draft(inc: Incident, feedback?: string) {
  const res = await client.messages.parse(draftRequest(inc, "standard", feedback));
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`下書きの形が崩れました（${res.stop_reason}）`);
  return { out: norm(res.parsed_output), ...usageOf(DRAFT_MODEL, res.usage) };
}

type Item = {
  key: string;
  company: string;
  articleIds: string[];
  summary?: { text: string; category: Category; model: string; inTok: number; outTok: number; usd: number };
  draft?: { title: string; facts: { text: string; sources: string[] }[]; guidance: string; announce: DraftOut["announce"]; model: string; inTok: number; outTok: number; usd: number; attempts: number; retryReason?: string[] };
  failed?: string[];
};

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
    let problems = validateDraft(inc.articleIds, attempt.out);
    let retryReason: string[] | undefined;
    let attempts = 1;
    if (problems.length) {
      retryReason = problems;
      attempt = await draft(inc, problems.map((p) => `- ${p}`).join("\n"));
      attempts = 2;
      tok = { inTok: tok.inTok + attempt.inTok, outTok: tok.outTok + attempt.outTok, usd: tok.usd + attempt.usd };
      spent += attempt.usd;
      problems = validateDraft(inc.articleIds, attempt.out);
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
