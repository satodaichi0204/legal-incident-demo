// 公開デモの「その場の生成」（サーバー側だけ）。キーはサーバーの環境変数だけにあり、ブラウザには出ない。
// 入力は、決まった架空の記事の組み合わせと、決まった書き方の選択肢だけ。予算（budget.ts）を予約してから呼ぶ。
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_MODEL, STYLES, SUMMARY_MODEL, WORST_USD, draftRequest, norm, summaryRequest, usageOf, validateDraft, type DraftOut, type StyleId, type SummaryOut } from "./ai-core";
import { reserve, settle, type CallLog } from "./budget";
import { ARTICLES, articleById } from "./data";

const client = () => new Anthropic({ maxRetries: 0, timeout: 50_000 });

export class InputError extends Error {}

/** 記事の組み合わせを確かめる（実在する架空の記事で、同じ企業のもの、5本まで） */
export function parseInput(raw: unknown): { articleIds: string[]; company: string; style: StyleId } {
  const o = (raw ?? {}) as { articleIds?: unknown; style?: unknown };
  const ids = Array.isArray(o.articleIds) ? o.articleIds.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0 || ids.length > 5 || !ids.every((id) => ARTICLES.some((a) => a.id === id))) throw new InputError("記事の指定が正しくありません。");
  const company = articleById(ids[0]).company;
  if (!ids.every((id) => articleById(id).company === company)) throw new InputError("同じ事件の記事だけを指定してください。");
  const style = typeof o.style === "string" && o.style in STYLES ? (o.style as StyleId) : "standard";
  return { articleIds: [...new Set(ids)], company, style };
}

type Usage = { model: string; inTok: number; outTok: number; usd: number };

/** 予算を予約して1回呼ぶ。失敗したときも、予約の扱いを必ず確定する */
async function call<T>(kind: CallLog["kind"], company: string, worst: number, ip: string, run: () => Promise<{ value: T; usage: Usage; result: (v: T) => string }>): Promise<{ value: T; usage: Usage; ms: number } | { error: string }> {
  const r = await reserve(worst, ip);
  if ("error" in r) return r;
  const t0 = Date.now();
  try {
    const { value, usage, result } = await run();
    const ms = Date.now() - t0;
    await settle(r.id, { at: new Date().toISOString(), kind, company, ...usage, ms, result: result(value) });
    return { value, usage, ms };
  } catch (e) {
    // 状態コードのある API のエラーは課金されないので 0、通信の途中の失敗は予約の額のまま（多めに数える）
    const billed = !(e instanceof Anthropic.APIError && e.status !== undefined);
    await settle(r.id, billed ? null : { at: new Date().toISOString(), kind, company, model: "-", inTok: 0, outTok: 0, usd: 0, ms: Date.now() - t0, result: "エラー" });
    if (e instanceof Anthropic.RateLimitError) return { error: "AI が混み合っています。少し待ってからお試しください。" };
    if (e instanceof Anthropic.APIError) return { error: `AI の呼び出しに失敗しました（${e.status ?? "通信"}）。` };
    throw e;
  }
}

export async function liveSummary(articleIds: string[], company: string, ip: string) {
  return call<SummaryOut | null>("summary", company, WORST_USD.summary, ip, async () => {
    const res = await client().messages.parse(summaryRequest(articleIds));
    const value = res.stop_reason === "refusal" || !res.parsed_output ? null : norm(res.parsed_output);
    return { value, usage: usageOf(SUMMARY_MODEL, res.usage), result: (v) => (v ? "要約" : `形が崩れた（${res.stop_reason}）`) };
  });
}

export type LiveDraft = { ok: boolean; draft: DraftOut | null; problems: string[]; attempts: number; retryReason?: string[]; usage: Usage; ms: number };

/** 下書きを作り、出典の照合と公開前のチェックを通す。止まったら1回だけ理由を伝えて作り直させる */
export async function liveDraft(articleIds: string[], company: string, style: StyleId, ip: string): Promise<LiveDraft | { error: string }> {
  const category = articleById(articleIds[0]).category;
  const once = (feedback?: string) =>
    call<DraftOut | null>("draft", company, WORST_USD.draft, ip, async () => {
      const res = await client().messages.parse(draftRequest({ articleIds, category }, style, feedback));
      const value = res.stop_reason === "refusal" || !res.parsed_output ? null : norm(res.parsed_output);
      return { value, usage: usageOf(DRAFT_MODEL, res.usage), result: (v) => (v ? (validateDraft(articleIds, v).length ? "チェックで停止" : "合格") : `形が崩れた（${res.stop_reason}）`) };
    });
  const check = (d: DraftOut | null) => (d ? validateDraft(articleIds, d) : ["出力の形が崩れました"]);

  const first = await once();
  if ("error" in first) return first;
  let problems = check(first.value);
  if (problems.length === 0) return { ok: true, draft: first.value, problems, attempts: 1, usage: first.usage, ms: first.ms };

  const second = await once(problems.map((p) => `- ${p}`).join("\n"));
  const sum = (b?: Usage): Usage => ({ model: DRAFT_MODEL, inTok: first.usage.inTok + (b?.inTok ?? 0), outTok: first.usage.outTok + (b?.outTok ?? 0), usd: first.usage.usd + (b?.usd ?? 0) });
  if ("error" in second) return { ok: false, draft: first.value, problems, attempts: 1, usage: sum(), ms: first.ms };
  const retryReason = problems;
  problems = check(second.value);
  return { ok: problems.length === 0, draft: second.value, problems, attempts: 2, retryReason, usage: sum(second.usage), ms: first.ms + second.ms };
}

/** 呼び出した人の IP（予算の1日の回数に使う。ハッシュにしてから記録する） */
export const clientIp = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";

/** ほかのサイトからの呼び出しを断る */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
