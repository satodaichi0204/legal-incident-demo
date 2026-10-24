"use client";
// 公開デモの「その場の生成」：ボタンを押すと、サーバーが Claude API を実際に呼ぶ（キーはサーバー側だけ。予算の上限は合計1ドル）
import { Loader2, Sparkles, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DraftOut, StyleId } from "@/lib/ai-core";
import type { BudgetView } from "@/lib/budget";
import type { DraftBody } from "@/lib/data";
import { YEN } from "@/lib/state";

export type LiveUsage = { model: string; inTok: number; outTok: number; usd: number };
const yen = (usd: number) => `${(usd * YEN).toFixed(2)}円`;

/** 予算の残り（ほかの画面で生成したときにも更新する） */
const listeners = new Set<() => void>();
export const refreshBudget = () => listeners.forEach((l) => l());

export function useBudget() {
  const [b, setB] = useState<BudgetView | null>(null);
  const load = useCallback(() => {
    fetch("/api/ai/budget", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => setB(x && !x.error ? x : null))
      .catch(() => setB(null));
  }, []);
  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);
  return b;
}

export function BudgetMeter({ compact = false }: { compact?: boolean }) {
  const b = useBudget();
  if (!b) return <span className="text-xs text-mute">AI の予算を確認しています…</span>;
  const used = Math.min(100, (b.spentUsd / b.capUsd) * 100);
  return (
    <div className={compact ? "text-xs" : "text-sm"} data-testid="budget">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Wallet size={14} className="text-ai" />
        <span>
          公開デモの AI の予算：使用 <b className="tabular-nums">{b.spentUsd.toFixed(3)}</b> / {b.capUsd} ドル（残り <b className="tabular-nums" data-testid="budget-remaining">{b.remainingUsd.toFixed(3)}</b> ドル）
        </span>
        {!compact && <span className="text-mute">本日 {b.todayUsd.toFixed(3)} / {b.dailyUsd} ドル</span>}
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-2 rounded-full bg-ai" style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}

async function post<T>(path: string, body: unknown): Promise<T | { error: string }> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await r.json()) as T | { error: string };
  } catch {
    return { error: "通信に失敗しました。" };
  } finally {
    refreshBudget();
  }
}

type LiveDraftRes = { ok: boolean; draft: DraftOut | null; problems: string[]; attempts: number; retryReason?: string[]; usage: LiveUsage; ms: number };

const STYLE_OPTIONS: { id: StyleId; label: string }[] = [
  { id: "standard", label: "標準" },
  { id: "short", label: "短く" },
  { id: "timeline", label: "時系列を重視" },
];

/** 下書きを Claude でその場で作り直す。合格したものだけを編集の欄に入れる（保存と承認は人が行う） */
export function LiveDraftPanel({ articleIds, onApply }: { articleIds: string[]; onApply: (body: DraftBody, note: string, usage: LiveUsage) => void }) {
  const [style, setStyle] = useState<StyleId>("standard");
  const [busy, setBusy] = useState(false);
  const [sec, setSec] = useState(0);
  const [res, setRes] = useState<LiveDraftRes | { error: string } | null>(null);
  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [busy]);
  const go = async () => {
    setBusy(true);
    setSec(0);
    setRes(null);
    const r = await post<LiveDraftRes>("/api/ai/draft", { articleIds, style });
    setBusy(false);
    setRes(r);
    if (!("error" in r) && r.ok && r.draft) {
      const label = STYLE_OPTIONS.find((s) => s.id === style)!.label;
      onApply(
        { title: r.draft.title, facts: r.draft.facts, guidance: r.draft.guidance, showLawyer: true, showFee: true },
        `Claude（${r.usage.model}）でその場で作り直し（${label}・${(r.ms / 1000).toFixed(1)}秒・${yen(r.usage.usd)}）`,
        r.usage,
      );
    }
  };
  return (
    <section className="card space-y-3 border-ai/30 bg-gradient-to-br from-white to-ai-soft" data-testid="live-draft">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ai text-white">
          <Sparkles size={17} />
        </span>
        <div>
          <h3 className="font-bold">Claude でいま作り直す（実際に API を呼びます）</h3>
          <p className="text-xs leading-relaxed text-sub">この事件の出典の記事だけを Claude（claude-sonnet-5-5）に渡して、下書きをその場で作ります。受け取った下書きは、出典の照合と公開前のチェックを通ったものだけを編集の欄に入れます。保存と承認は人が行います。</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="field w-auto py-2 text-sm" value={style} onChange={(e) => setStyle(e.target.value as StyleId)} aria-label="書き方" disabled={busy}>
          {STYLE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              書き方：{s.label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={go} disabled={busy} data-testid="live-draft-run">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? `Claude が作成中… ${sec}秒` : "Claude で作り直す"}
        </button>
      </div>
      <BudgetMeter compact />
      {res && "error" in res && (
        <p className="rounded-xl bg-human-soft p-3 text-sm font-bold text-human" role="status">
          {res.error}
        </p>
      )}
      {res && !("error" in res) && (
        <div className={`rounded-xl p-3 text-sm ${res.ok ? "bg-ok-soft" : "bg-human-soft"}`} role="status" data-testid="live-draft-result">
          <div className={`font-bold ${res.ok ? "text-ok" : "text-human"}`}>
            {res.ok ? (res.attempts > 1 ? "チェックで止まったので作り直させ、2回目で合格しました。編集の欄に入れました（まだ保存していません）。" : "出典の照合と公開前のチェックに合格しました。編集の欄に入れました（まだ保存していません）。") : "2回作らせましたが、チェックで止まったため使いません（いまの下書きのままです）。"}
          </div>
          <div className="mt-1 text-xs text-sub tabular-nums">
            {res.usage.model}・{(res.ms / 1000).toFixed(1)}秒・入力 {res.usage.inTok.toLocaleString()} / 出力 {res.usage.outTok.toLocaleString()} トークン・{yen(res.usage.usd)}（実測）
          </div>
          {res.retryReason && <div className="mt-1 text-xs text-sub">1回目に止まった点：{res.retryReason.join(" / ")}</div>}
          {!res.ok && res.problems.length > 0 && <div className="mt-1 text-xs text-human">止まった点：{res.problems.join(" / ")}</div>}
        </div>
      )}
    </section>
  );
}

type LiveSummaryRes = { summary: { summary: string; category: string } | null; usage: LiveUsage; ms: number };

/** 事件の概要を Claude（haiku）でその場で作る */
export function LiveSummaryButton({ articleIds }: { articleIds: string[] }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<LiveSummaryRes | { error: string } | null>(null);
  const key = articleIds.join("+");
  const [forKey, setForKey] = useState(key);
  if (forKey !== key) {
    setForKey(key);
    setRes(null);
  }
  return (
    <div className="space-y-2" data-testid="live-summary">
      <button
        className="btn px-3 py-1.5 text-xs"
        disabled={busy}
        data-testid="live-summary-run"
        onClick={async () => {
          setBusy(true);
          setRes(await post<LiveSummaryRes>("/api/ai/summary", { articleIds }));
          setBusy(false);
        }}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {busy ? "Claude が要約中…" : "Claude でいま要約し直す（実際に API を呼ぶ）"}
      </button>
      {res && "error" in res && <p className="text-xs font-bold text-human">{res.error}</p>}
      {res && !("error" in res) && (
        <div className="rounded-xl border border-ai/30 bg-white p-3 text-sm" data-testid="live-summary-result">
          <div className="mb-1 text-xs font-bold text-ai">いま生成した概要（{res.usage.model}・{(res.ms / 1000).toFixed(1)}秒・{yen(res.usage.usd)}）</div>
          {res.summary?.summary ?? "形が崩れたため、使いません。"}
        </div>
      )}
    </div>
  );
}

/** 公開デモで呼ばれた記録（運営の画面） */
export function LiveCallLog() {
  const b = useBudget();
  return (
    <section className="card mt-5" data-testid="live-log">
      <h2 className="h2 text-base">
        <Sparkles size={18} className="text-ai" />
        公開デモでの AI の呼び出し（その場の生成・費用の実測）
      </h2>
      <div className="mb-3">
        <BudgetMeter />
      </div>
      <p className="mb-3 text-xs leading-relaxed text-sub">
        キーはサーバーの環境変数だけに置き、ブラウザには出しません。渡すのは架空の記事と、決まった書き方の選択肢だけです（自由な文は受け付けません）。呼ぶ前に「かかりうる最大の費用」を予算から予約し、合計1ドル（事前生成の分を含む）、1日0.2ドル、1人1日8回を超える呼び出しは断ります。
      </p>
      {!b || b.calls.length === 0 ? (
        <p className="text-sm text-sub">まだ呼び出しはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl text-xs">
            <thead>
              <tr>
                <th>日時</th>
                <th>処理</th>
                <th>結果</th>
                <th className="text-right">秒</th>
                <th className="text-right">トークン（入力/出力）</th>
                <th className="text-right">円</th>
              </tr>
            </thead>
            <tbody>
              {b.calls.map((c, k) => (
                <tr key={k}>
                  <td>{new Date(c.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>
                    {c.kind === "draft" ? "下書き" : "要約"}（{c.company}）<span className="text-mute">　{c.model}</span>
                  </td>
                  <td>{c.result}</td>
                  <td className="text-right tabular-nums">{(c.ms / 1000).toFixed(1)}</td>
                  <td className="text-right tabular-nums">
                    {c.inTok.toLocaleString()} / {c.outTok.toLocaleString()}
                  </td>
                  <td className="text-right tabular-nums">{(c.usd * YEN).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
