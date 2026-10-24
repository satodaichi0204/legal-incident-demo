"use client";
// 公開前のチェックの結果（点数、8項目、理由）
import { CircleCheck, OctagonX, TriangleAlert } from "lucide-react";
import { CHECKS, CHECK_NOTICE, type CheckResult } from "@/lib/check";
import { ScoreRing } from "./ui";

const MARK = {
  ok: { text: "OK", cls: "text-ok", icon: CircleCheck },
  warn: { text: "注意", cls: "text-warn", icon: TriangleAlert },
  stop: { text: "止める", cls: "text-human", icon: OctagonX },
};

export default function CheckPanel({ result, compact = false }: { result: CheckResult; compact?: boolean }) {
  const stops = result.issues.filter((i) => i.stop);
  return (
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-card ${result.pass ? "border-ok/25" : "border-human/30"}`} data-testid="check-panel" data-pass={result.pass}>
      <div className={`flex items-center gap-4 p-4 ${result.pass ? "bg-gradient-to-r from-ok-soft to-white" : "bg-gradient-to-r from-human-soft to-white"}`}>
        <ScoreRing score={result.score} pass={result.pass} />
        <div>
          <div className="eyebrow">公開前のチェック（広告の確認・8項目）</div>
          <div className={`text-lg font-black ${result.pass ? "text-ok" : "text-human"}`} data-testid="check-verdict">
            {result.pass ? "承認の依頼に進めます" : `止める項目が${stops.length}件あります`}
          </div>
        </div>
      </div>
      {!compact && (
        <ul className="grid grid-cols-2 gap-px border-t border-line bg-line text-[13px]">
          {CHECKS.map((c) => {
            const m = MARK[result.status[c.id]];
            const Icon = m.icon;
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 bg-white px-4 py-2" title={c.detail}>
                <span className="truncate">{c.label}</span>
                <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${m.cls}`}>
                  <Icon size={14} />
                  {m.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {result.issues.length > 0 && (
        <ul className="space-y-2 border-t border-line p-4 text-sm" data-testid="issues">
          {result.issues.map((i, k) => (
            <li key={k} className={`flex gap-2 rounded-xl px-3 py-2 ${i.stop ? "bg-human-soft" : "bg-warn-soft"}`}>
              {i.stop ? <OctagonX size={16} className="mt-0.5 shrink-0 text-human" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" />}
              <span>
                <span className="mr-1 text-xs font-bold">
                  {i.stop ? "止める" : "注意"}｜{CHECKS.find((c) => c.id === i.check)?.label}
                  {i.factIndex !== undefined && `（事実の文 ${i.factIndex + 1}）`}
                </span>
                {i.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-line bg-paper px-4 py-2 text-[11px] text-sub">{CHECK_NOTICE}</p>
    </section>
  );
}
