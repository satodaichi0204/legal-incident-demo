// 画面の共通の部品
import { Bot, UserRound } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Photo } from "@/lib/photos";

const STAGE: Record<string, { label: string; cls: string }> = {
  収集: { label: "1 収集・整理", cls: "bg-ai text-white" },
  下書き: { label: "2 出典つきの下書き", cls: "bg-ai text-white" },
  チェック: { label: "3 公開前のチェック", cls: "bg-found text-white" },
  承認: { label: "4 弁護士の承認", cls: "bg-human text-white" },
  公開: { label: "5 事務所の公開ページ", cls: "bg-prep text-white" },
  運営: { label: "運営の省力化", cls: "bg-white/15 text-white ring-1 ring-white/30" },
  全体: { label: "設計", cls: "bg-white/15 text-white ring-1 ring-white/30" },
};

export function StageBadge({ no }: { no: string }) {
  const s = STAGE[no] ?? STAGE["全体"];
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

/** 画面の見出し。写真つきの帯（左に見出し、右に写真） */
export function PageHeader({ no, title, lead, photo, children }: { no: string; title: string; lead: ReactNode; photo?: Photo; children?: ReactNode }) {
  return (
    <section className="rise relative mb-6 overflow-hidden rounded-3xl bg-navy text-white shadow-lift">
      {photo && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[58%]">
          <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/10 md:via-navy/55" />
        </div>
      )}
      <div className="relative flex min-h-[176px] flex-col justify-end gap-3 p-6 md:p-8">
        <div>
          <StageBadge no={no} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-black tracking-wide md:text-[30px]">{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/80">{lead}</p>
          </div>
          {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** すべての画面に出す「AIがすること」と「弁護士・事務所が確認すること」の2つの枠（最終の判断は弁護士、という方針を画面で示す） */
export function RoleBox({ ai, human }: { ai: string[]; human: string[] }) {
  return (
    <div className="rise mb-7 grid gap-3 md:grid-cols-2" data-testid="rolebox">
      <section className="relative overflow-hidden rounded-2xl border border-ai/20 bg-gradient-to-br from-white to-ai-soft p-4 pl-5 shadow-card">
        <span className="absolute inset-y-0 left-0 w-1 bg-ai" />
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ai">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ai text-white">
            <Bot size={15} />
          </span>
          AIがすること
        </h2>
        <ul className="space-y-1 text-sm">
          {ai.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ai" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="relative overflow-hidden rounded-2xl border border-human/25 bg-gradient-to-br from-white to-human-soft p-4 pl-5 shadow-card">
        <span className="absolute inset-y-0 left-0 w-1 bg-human" />
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-human">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-human text-white">
            <UserRound size={15} />
          </span>
          弁護士・事務所が確認すること
        </h2>
        <ul className="space-y-1 text-sm">
          {human.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-human" />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function Empty({ children, photo }: { children: ReactNode; photo?: Photo }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center text-sm text-sub">
      {photo && (
        <div className="relative h-28 w-44 overflow-hidden rounded-xl">
          <Image src={photo.src} alt={photo.alt} fill sizes="176px" className="object-cover" />
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

/** 点数の円グラフ（品質チェック） */
export function ScoreRing({ score, pass, size = 72 }: { score: number; pass: boolean; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = pass ? "var(--color-ok)" : "var(--color-human)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${score}点`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} style={{ transition: "stroke-dasharray .5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none" style={{ color }}>
        <span className="text-xl font-black">{score}</span>
        <span className="text-[10px]">点</span>
      </div>
    </div>
  );
}

/** 会社の写真（業種の写真）の小さな四角 */
export function Thumb({ photo, size = 44, className = "" }: { photo: Photo; size?: number; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 ${className}`} style={{ width: size, height: size }}>
      <Image src={photo.src} alt={photo.alt} fill sizes={`${size * 2}px`} className="object-cover" />
    </div>
  );
}

/** 数字のタイル */
export function Stat({ label, value, note, icon }: { label: string; value: ReactNode; note?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-sub">{label}</div>
        {icon && <div className="grid h-8 w-8 place-items-center rounded-lg bg-ai-soft text-ai">{icon}</div>}
      </div>
      <div className="mt-1 text-[28px] leading-tight font-black tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-sub">{note}</div>}
    </div>
  );
}
