"use client";
// 事件の候補：重複のまとめ、続報、出典、AI の概要。候補から、この事務所の下書きを作る
import { ArrowRight, Layers, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, RoleBox } from "@/components/ui";
import { summaryOf } from "@/lib/collect";
import { CATEGORY_LABEL, articleById, sourceById } from "@/lib/data";
import { PHOTOS, incidentPhoto } from "@/lib/photos";
import { createDraft, currentUser, draftsOf, incidentsOf, nowOf, STATUS_LABEL } from "@/lib/state";
import { useAppState } from "@/lib/store";

export default function Incidents() {
  const [state, update] = useAppState();
  const router = useRouter();
  const params = useSearchParams();
  const me = currentUser(state);
  const incidents = incidentsOf(state);
  const sel = incidents.find((i) => i.id === params.get("id")) ?? incidents[0];
  const mine = draftsOf(state, me.firmId);
  const draftFor = (id: string) => mine.find((d) => d.incidentId === id);

  return (
    <>
      <PageHeader no="収集" title="事件の候補" lead="同じ事件を別の情報源が報じた記事は1件にまとめ、あとから届いた続報は「更新あり」にします。候補を選ぶと、出典の元の文と AI の概要を確かめられます。" photo={PHOTOS.matrix} />
      <RoleBox
        ai={["記事を事件ごとにまとめ、概要を整理する", "続報で変わった数（被害の件数など）を見つける"]}
        human={["どの事件のページを作るかを決める（下書きを作る）", "出典の元の文を確かめる"]}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="incident-list">
          {incidents.map((inc) => {
            const d = draftFor(inc.id);
            const on = inc.id === sel?.id;
            const photo = incidentPhoto(inc.company, inc.category);
            return (
              <li key={inc.id}>
                <Link href={`/admin/incidents?id=${encodeURIComponent(inc.id)}`} className={`group block overflow-hidden rounded-2xl border-2 bg-white shadow-card transition ${on ? "border-ai" : "border-transparent hover:shadow-lift"}`} data-testid="incident-card" data-company={inc.company}>
                  <div className="relative h-28">
                    <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 100vw, 30vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className="chip bg-white/90 text-ink">{CATEGORY_LABEL[inc.category]}</span>
                      {inc.updated && (
                        <span className="chip bg-human text-white" data-testid="updated-badge">
                          <RefreshCw size={11} />
                          更新あり
                        </span>
                      )}
                    </div>
                    <div className="absolute right-3 bottom-2 left-3 text-white">
                      <div className="font-black">{inc.company}（架空）</div>
                    </div>
                  </div>
                  <div className="space-y-1 p-3 text-xs text-sub">
                    <div>
                      {inc.firstDate}
                      {inc.lastDate !== inc.firstDate && ` 〜 ${inc.lastDate}`}・出典 {inc.articleIds.length}本
                    </div>
                    {inc.merged > 0 && (
                      <div className="flex items-center gap-1 font-bold text-ai" data-testid="merged-badge">
                        <Layers size={12} />
                        重複の記事 {inc.merged}本を1件にまとめました
                      </div>
                    )}
                    {inc.change && <div className="font-bold text-human">続報で変更：{inc.change.from} → {inc.change.to}</div>}
                    <div>{d ? <span className="chip bg-found-soft text-found">この事務所：{STATUS_LABEL[d.status]}</span> : <span className="chip bg-paper">まだ下書きなし</span>}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {sel && (
          <aside className="card h-fit space-y-4 lg:sticky lg:top-[72px]" data-testid="incident-detail">
            <div>
              <span className="chip bg-ai-soft text-ai">{CATEGORY_LABEL[sel.category]}</span>
              <h2 className="mt-1 text-xl font-black">{sel.company}（架空）</h2>
            </div>
            <div className="rounded-xl bg-ai-soft p-3 text-sm">
              <div className="mb-1 flex items-center gap-1 text-xs font-bold text-ai">
                <Sparkles size={13} />
                AI の概要（見本モード：本番は AI で要約）
              </div>
              {summaryOf(sel)}
            </div>
            <div>
              <div className="mb-2 text-xs font-bold text-sub">出典（{sel.articleIds.length}本）</div>
              <ol className="space-y-2">
                {sel.articleIds.map(articleById).map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3 text-sm">
                    <div className="text-xs text-sub">
                      {a.date}　{sourceById(a.sourceId).name}
                      {sourceById(a.sourceId).kind === "press" && <span className="chip ml-1 bg-ok-soft text-ok">公式の発表</span>}
                    </div>
                    <div className="font-bold">{a.title}</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-sub">{a.text}</p>
                  </li>
                ))}
              </ol>
            </div>
            {draftFor(sel.id) ? (
              <Link href={`/admin/draft?id=${draftFor(sel.id)!.id}`} className="btn btn-primary w-full">
                この事務所の下書きを開く
                <ArrowRight size={16} />
              </Link>
            ) : (
              <button
                className="btn btn-primary w-full"
                data-testid="create-draft"
                onClick={() => {
                  let id = "";
                  update((s) => {
                    const next = createDraft(s, me.firmId, sel.id, me.id, nowOf(s, new Date()));
                    id = next.drafts[next.drafts.length - 1].id;
                    return next;
                  });
                  router.push(`/admin/draft?id=${id}`);
                }}
              >
                <Sparkles size={16} />
                この事件の下書きを作る（出典つき）
              </button>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
