// 公開デモの AI の予算（サーバー側だけ）。Vercel Blob（非公開）に記録し、ETag を使った条件つきの書き込みで、同時の呼び出しでも上限を超えない。
// 呼ぶ前に「かかりうる最大の費用」を予約し、呼んだ後に実際の費用に置き換える。失敗しても予約は費用として残す（多めに数える）。
import "server-only";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";
import { GENERATED } from "./generated";

/** 合計の上限（ドル）。手元の事前生成で使った分も含める */
export const CAP_USD = 1;
/** 上限の手前で止める余裕 */
const SAFETY_USD = 0.05;
/** 1日（日本時間）に使える上限。予算が数日で尽きないように */
export const DAILY_USD = 0.2;
/** 1人（IP アドレスのハッシュ）が1日に呼べる回数 */
export const PER_IP_DAILY = 8;
/** 同時に進められる呼び出しの数 */
const MAX_OPEN = 3;
/** 予約が残ったままの呼び出しは、この時間で費用として確定する */
const STALE_MS = 5 * 60_000;

const PATH = "ledger/ai-budget.json";

export type CallLog = { at: string; kind: "summary" | "draft"; company: string; model: string; inTok: number; outTok: number; usd: number; ms: number; result: string };
type Ledger = {
  /** 確定した費用（事前生成の分を含む） */
  spentUsd: number;
  open: Record<string, { usd: number; at: number }>;
  days: Record<string, number>;
  ipDays: Record<string, number>;
  calls: CallLog[];
};

const empty = (): Ledger => ({ spentUsd: GENERATED.totalUsd, open: {}, days: {}, ipDays: {}, calls: [] });
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const openUsd = (l: Ledger) => Object.values(l.open).reduce((a, r) => a + r.usd, 0);
export const ipKey = (ip: string) => createHash("sha256").update(`legal-demo:${ip}:${today()}`).digest("hex").slice(0, 16);

async function load(): Promise<{ ledger: Ledger; etag: string | null }> {
  const r = await get(PATH, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return { ledger: empty(), etag: null };
  const ledger = JSON.parse(await new Response(r.stream).text()) as Ledger;
  // 古い予約は、費用として確定する
  for (const [id, o] of Object.entries(ledger.open)) {
    if (Date.now() - o.at > STALE_MS) {
      ledger.spentUsd += o.usd;
      delete ledger.open[id];
    }
  }
  return { ledger, etag: r.blob.etag };
}

/** 記録を読み、変えて、条件つきで書く（ほかの呼び出しが先に書いていたら、読み直してやり直す） */
async function update<T>(fn: (l: Ledger) => T): Promise<T> {
  for (let i = 0; i < 8; i++) {
    const { ledger, etag } = await load();
    const out = fn(ledger);
    try {
      await put(PATH, JSON.stringify(ledger), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      });
      return out;
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError || (e instanceof Error && /already exists|precondition/i.test(e.message))) {
        await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
        continue;
      }
      throw e;
    }
  }
  throw new Error("予算の記録が混み合っています。少し待ってからお試しください。");
}

export type BudgetView = { capUsd: number; spentUsd: number; remainingUsd: number; todayUsd: number; dailyUsd: number; calls: CallLog[]; available: boolean };

const view = (l: Ledger): BudgetView => {
  const used = l.spentUsd + openUsd(l);
  return {
    capUsd: CAP_USD,
    spentUsd: used,
    remainingUsd: Math.max(0, CAP_USD - SAFETY_USD - used),
    todayUsd: l.days[today()] ?? 0,
    dailyUsd: DAILY_USD,
    calls: l.calls.slice(-12).reverse(),
    available: !!process.env.ANTHROPIC_API_KEY,
  };
};

export async function budget(): Promise<BudgetView> {
  return view((await load()).ledger);
}

/** かかりうる最大の費用を予約する。上限を超えるなら、理由を返す */
export async function reserve(worstUsd: number, ip: string): Promise<{ id: string } | { error: string }> {
  const k = ipKey(ip);
  return update((l) => {
    const used = l.spentUsd + openUsd(l);
    if (used + worstUsd > CAP_USD - SAFETY_USD) return { error: `公開デモの AI の予算（合計 ${CAP_USD} ドル）を使い切りました。事前に生成した結果をご覧ください。` };
    if ((l.days[today()] ?? 0) + openUsd(l) + worstUsd > DAILY_USD) return { error: "本日の AI の予算に達しました。明日またお試しください（事前に生成した結果はご覧いただけます）。" };
    if ((l.ipDays[k] ?? 0) >= PER_IP_DAILY) return { error: `その場の生成は、1日 ${PER_IP_DAILY} 回までです。` };
    if (Object.keys(l.open).length >= MAX_OPEN) return { error: "ほかの方の生成が進んでいます。数秒後にお試しください。" };
    const id = randomUUID();
    l.open[id] = { usd: worstUsd, at: Date.now() };
    l.ipDays[k] = (l.ipDays[k] ?? 0) + 1;
    // 古い日の IP の記録は消す（ハッシュに日付を含むので、その日のうちしか使わない）
    if (Object.keys(l.ipDays).length > 500) l.ipDays = { [k]: l.ipDays[k] };
    return { id };
  });
}

/** 予約を、実際の費用に置き換える（呼び出しが失敗して費用が分からないときは、予約の額のまま確定する） */
export async function settle(id: string, log: CallLog | null) {
  await update((l) => {
    const r = l.open[id];
    delete l.open[id];
    const usd = log ? log.usd : (r?.usd ?? 0);
    l.spentUsd += usd;
    l.days[today()] = (l.days[today()] ?? 0) + usd;
    if (log) l.calls = [...l.calls, log].slice(-50);
  });
}
