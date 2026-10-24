"use client";
// 事務所の公開サイト（共通のテンプレート）。承認された版だけを表示する
import { ExternalLink, Scale } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import IncidentArticle from "@/components/IncidentArticle";
import { CATEGORY_LABEL, type Firm } from "@/lib/data";
import { incidentPhoto, PHOTOS, PHOTO_CREDIT } from "@/lib/photos";
import { draftsOf, firmView, incidentsOf } from "@/lib/state";
import { useAppState } from "@/lib/store";

function Frame({ firm, children }: { firm: Firm & { active?: boolean }; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#fff6dd] px-4 py-1 text-center text-[11px] text-[#7a5600]">デモ版の公開ページです。事務所、事件、企業はすべて架空です。</div>
      <header className="text-white" style={{ background: firm.color }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link href={`/s/${firm.slug}`} className="flex items-center gap-2 font-black">
            <Scale size={20} />
            {firm.name}
          </Link>
          <a href={firm.formUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-3 py-1.5 text-xs font-bold" style={{ color: firm.color }} data-testid="form-button">
            ご相談の受付
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer className="border-t border-line bg-paper px-4 py-6 text-center text-xs text-sub">
        {firm.name}　{firm.address}
        <br />
        {PHOTO_CREDIT}
      </footer>
    </div>
  );
}

export function PublicIndex({ firmId }: { firmId: string }) {
  const [state] = useAppState();
  const firm = firmView(state, firmId);
  const pages = draftsOf(state, firmId).filter((d) => d.published);
  return (
    <Frame firm={firm}>
      <section className="relative mb-8 overflow-hidden rounded-3xl text-white">
        <Image src={PHOTOS.building.src} alt={PHOTOS.building.alt} fill priority sizes="768px" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${firm.color} 10%, ${firm.color}aa 60%, transparent)` }} />
        <div className="relative p-6 md:p-8">
          <h1 className="text-2xl font-black md:text-3xl">事件情報</h1>
          <p className="mt-2 max-w-md text-sm text-white/85">個人情報の漏えい、サイバー攻撃、消費者被害について、公表されている情報を出典つきで整理しています。</p>
        </div>
      </section>
      {!firm.active && <p className="mb-4 rounded-xl bg-human-soft p-3 text-sm text-human">このサイトは現在公開を停止しています。</p>}
      {pages.length === 0 ? (
        <p className="text-sm text-sub">現在、公開中のページはありません。</p>
      ) : (
        <ul className="space-y-3" data-testid="public-index">
          {pages.map((d) => {
            const inc = incidentsOf(state).find((i) => i.id === d.incidentId)!;
            const photo = incidentPhoto(inc.company, inc.category);
            return (
              <li key={d.id}>
                <Link href={`/s/${firm.slug}/${inc.slug}`} className="flex gap-4 rounded-2xl border border-line p-3 transition hover:shadow-card">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl">
                    <Image src={photo.src} alt={photo.alt} fill sizes="112px" className="object-cover" />
                  </div>
                  <div>
                    <span className="chip bg-paper text-sub">{CATEGORY_LABEL[inc.category]}</span>
                    <div className="mt-1 font-bold">{d.published!.body.title}</div>
                    <div className="text-xs text-sub">更新 {d.published!.at.slice(0, 10)}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}

export function PublicIncident({ firmId, slug }: { firmId: string; slug: string }) {
  const [state] = useAppState();
  const firm = firmView(state, firmId);
  const inc = incidentsOf(state).find((i) => i.slug === slug);
  const d = inc && draftsOf(state, firmId).find((x) => x.incidentId === inc.id);
  if (!inc || !d?.published) {
    return (
      <Frame firm={firm}>
        <div className="py-16 text-center" data-testid="not-published">
          <h1 className="text-xl font-bold">このページは現在公開されていません</h1>
          <p className="mt-2 text-sm text-sub">公開を停止したか、まだ弁護士の承認が済んでいないページです。</p>
          <Link href={`/s/${firm.slug}`} className="mt-4 inline-block text-sm font-bold underline" style={{ color: firm.color }}>
            事件情報の一覧へ
          </Link>
        </div>
      </Frame>
    );
  }
  const photo = incidentPhoto(inc.company, inc.category);
  const url = `https://${firm.domain}/${inc.slug}`;
  return (
    <Frame firm={firm}>
      <div className="relative mb-6 h-48 overflow-hidden rounded-3xl md:h-60">
        <Image src={photo.src} alt={photo.alt} fill priority sizes="768px" className="object-cover" />
        <span className="chip absolute top-3 left-3 bg-white/90 text-ink">{CATEGORY_LABEL[inc.category]}</span>
      </div>
      <IncidentArticle body={d.published.body} incident={inc} firm={firm} corrections={d.corrections} publishedAt={d.published.at} />
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5" data-testid="share">
        <a href={firm.formUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: firm.color }}>
          弁護士に相談する（外部のフォーム）
          <ExternalLink size={14} />
        </a>
        <a href={`https://x.com/intent/post?text=${encodeURIComponent(d.published.body.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-4 py-2 text-sm font-bold">
          Xで共有
        </a>
        <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-4 py-2 text-sm font-bold">
          LINEで共有
        </a>
      </div>
    </Frame>
  );
}
