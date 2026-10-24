"use client";
// 管理画面の枠：左のメニュー（流れの順）、上の帯（利用者の切り替え＝事務所と役割、モード、注意書き）
import { Activity, BookOpen, Building2, FileText, Gavel, Globe, Megaphone, Menu, Newspaper, RotateCcw, Scale, Settings, ShieldCheck, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FIRMS, ROLE_LABEL, USERS, firmById } from "@/lib/data";
import { PHOTO_CREDIT } from "@/lib/photos";
import { currentUser, draftsOf } from "@/lib/state";
import { resetState, useAppState } from "@/lib/store";

type Item = { href: string; label: string; icon: LucideIcon };
const FLOW: Item[] = [
  { href: "/admin/collect", label: "収集", icon: Newspaper },
  { href: "/admin/incidents", label: "事件の候補", icon: FileText },
  { href: "/admin/drafts", label: "下書きと編集", icon: BookOpen },
  { href: "/admin/check", label: "公開前のチェック", icon: ShieldCheck },
  { href: "/admin/approvals", label: "弁護士の承認", icon: Gavel },
  { href: "/admin/public", label: "事務所の公開ページ", icon: Globe },
];
const MORE: Item[] = [
  { href: "/admin/announce", label: "告知文の案", icon: Megaphone },
  { href: "/admin/settings", label: "事務所の設定", icon: Settings },
  { href: "/admin/ops", label: "運営（通知・契約・AI利用量）", icon: Activity },
  { href: "/design", label: "設計の説明（他業種への転用）", icon: Building2 },
];
export const ALL_ITEMS = [...FLOW, ...MORE];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const [state] = useAppState();
  const me = currentUser(state);
  const mine = draftsOf(state, me.firmId);
  const badge: Record<string, number> = {
    "/admin/approvals": mine.filter((d) => d.status === "pending").length,
    "/admin/drafts": mine.filter((d) => d.status === "needs_reapproval" || d.status === "rejected").length,
    "/admin/ops": state.notices.filter((n) => n.firmId === me.firmId || n.firmId === null).filter((n) => n.level !== "info").length,
  };
  const row = (s: Item, i?: number) => {
    const Icon = s.icon;
    const on = path === s.href || path.startsWith(`${s.href}/`);
    return (
      <li key={s.href}>
        <Link href={s.href} onClick={onNavigate} aria-current={on ? "page" : undefined} className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition ${on ? "bg-white text-navy shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)]" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${on ? "bg-ai text-white" : "bg-white/8 text-white/80"}`}>
            <Icon size={15} strokeWidth={2.2} />
          </span>
          <span className="flex-1 truncate font-medium">
            {i !== undefined && <span className={`mr-1 text-[10px] ${on ? "text-mute" : "text-white/40"}`}>{i + 1}.</span>}
            {s.label}
          </span>
          {badge[s.href] ? <span className="rounded-full bg-human px-1.5 text-[10px] font-bold text-white">{badge[s.href]}</span> : null}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="メニュー" className="space-y-5">
      <div>
        <div className="eyebrow mb-2 px-2.5 text-white/40">事件ページができるまで</div>
        <ol className="space-y-0.5">{FLOW.map((s, i) => row(s, i))}</ol>
      </div>
      <div>
        <div className="eyebrow mb-2 px-2.5 text-white/40">運営と設計</div>
        <ul className="space-y-0.5">{MORE.map((s) => row(s))}</ul>
      </div>
    </nav>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 bg-[radial-gradient(120%_60%_at_0%_0%,#23406e_0%,#0d1b33_55%)] px-3 py-5 text-white">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#c9a35a] to-[#8a6424] shadow-[0_8px_20px_-8px_rgb(201_163_90/0.8)]">
          <Scale size={19} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-black tracking-wide">事件情報AI</span>
          <span className="block text-[11px] text-white/55">法律事務所向け・デモ版</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto">
        <Nav onNavigate={onNavigate} />
      </div>
      <div className="space-y-2 px-1">
        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/8"
          onClick={() => {
            if (confirm("デモの操作をすべて消して、初期の状態に戻しますか？")) resetState();
          }}
        >
          <RotateCcw size={13} />
          初期の状態に戻す
        </button>
        <p className="px-1 text-[10px] leading-relaxed text-white/40">{PHOTO_CREDIT}</p>
      </div>
    </div>
  );
}

function UserSwitch() {
  const [state, update] = useAppState();
  const me = currentUser(state);
  const firm = firmById(me.firmId);
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="hidden h-2.5 w-2.5 rounded-full sm:inline-block" style={{ background: firm.color }} />
      <span className="sr-only">利用者を切り替える</span>
      <select className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-bold" value={me.id} onChange={(e) => update((s) => ({ ...s, userId: e.target.value }))} data-testid="user-switch">
        {FIRMS.map((f) => (
          <optgroup key={f.id} label={f.name}>
            {USERS.filter((u) => u.firmId === f.id).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}・{ROLE_LABEL[u.role]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [state] = useAppState();
  const me = currentUser(state);
  const current = path === "/admin/draft" ? { label: "下書きの編集" } : ALL_ITEMS.find((s) => path === s.href || path.startsWith(`${s.href}/`));
  return (
    <div className="min-h-screen lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="メニュー">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
          <button className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-navy" onClick={() => setOpen(false)} aria-label="メニューを閉じる">
            <X size={18} />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2 px-4 py-2.5 md:px-8">
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-line lg:hidden" onClick={() => setOpen(true)} aria-label="メニューを開く">
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="font-bold text-ink">{current?.label ?? "ホーム"}</span>
            <span className="ml-2 text-xs text-mute">{firmById(me.firmId).name}</span>
          </div>
          <span className="hidden rounded-full bg-[#fff6dd] px-3 py-1 text-xs font-medium text-[#7a5600] xl:inline-flex">架空のデータ・実際には公開・送信しません</span>
          <span className="rounded-full bg-ai-soft px-3 py-1 text-xs font-bold text-ai" data-testid="mode">
            AI事前生成モード（公開側は API を呼ばない）
          </span>
          <UserSwitch />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-8 text-xs text-mute md:px-8">
        デモ版：企業、事件、法律事務所、弁護士、ニュースサイトはすべて架空です。実在のサイトにはアクセスしていません。人物の写真は場面のイメージです。{PHOTO_CREDIT}
      </footer>
    </div>
  );
}
