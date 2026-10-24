"use client";
// 下書きの一覧、公開前のチェック（問題の見本）、弁護士の承認、事務所の公開ページの一覧
import { ArrowRight, ExternalLink, Gavel, Globe, OctagonX } from "lucide-react";
import Link from "next/link";
import CheckPanel from "@/components/CheckPanel";
import { Empty, PageHeader, RoleBox, Thumb } from "@/components/ui";
import { checkDraft } from "@/lib/check";
import { CATEGORY_LABEL, PROBLEM_DRAFTS, userById } from "@/lib/data";
import { PHOTOS, incidentPhoto } from "@/lib/photos";
import { currentUser, draftsOf, firmView, incidentById, settingsOf, STATUS_LABEL, type Draft, type State } from "@/lib/state";
import { useAppState } from "@/lib/store";

const STATUS_CLS: Record<string, string> = {
  draft: "bg-paper text-sub",
  pending: "bg-found-soft text-found",
  rejected: "bg-human-soft text-human",
  published: "bg-ok-soft text-ok",
  needs_reapproval: "bg-human text-white",
  stopped: "bg-paper text-mute",
};
const t = (iso: string) => new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function DraftRow({ s, d }: { s: State; d: Draft }) {
  const inc = incidentById(s, d.incidentId)!;
  const r = checkDraft(d.body, firmView(s, d.firmId));
  return (
    <tr data-draft={d.incidentId} data-status={d.status}>
      <td>
        <div className="flex items-center gap-3">
          <Thumb photo={incidentPhoto(inc.company, inc.category)} size={44} />
          <div>
            <div className="font-bold">{d.body.title}</div>
            <div className="text-xs text-sub">
              {CATEGORY_LABEL[inc.category]}・版 {d.versions.length}
              {inc.updated && d.published && <span className="chip ml-1 bg-human-soft text-human">続報あり</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="align-middle">
        <span className={`chip ${STATUS_CLS[d.status]}`}>{STATUS_LABEL[d.status]}</span>
      </td>
      <td className="align-middle">
        <span className={`font-black ${r.pass ? "text-ok" : "text-human"}`}>{r.score}</span>
        <span className="text-xs text-sub">点</span>
      </td>
      <td className="align-middle text-right">
        <Link href={`/admin/draft?id=${d.id}`} className="btn px-3 py-1.5 text-xs">
          開く
          <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  );
}

export function Drafts() {
  const [state] = useAppState();
  const me = currentUser(state);
  const mine = draftsOf(state, me.firmId);
  return (
    <>
      <PageHeader no="下書き" title="下書きと編集" lead={`${firmView(state, me.firmId).name}の下書きです。ほかの事務所の下書きは見えません（事務所ごとにデータを分けています）。`} photo={PHOTOS.notePc}>
        <Link href="/admin/incidents" className="btn">
          事件の候補から作る
        </Link>
      </PageHeader>
      <RoleBox ai={["事件の候補から、出典つきの下書きを作る", "下書きごとに、公開前のチェックの点数を出す"]} human={["下書きを開いて確かめ、直し、承認を依頼する"]} />
      {mine.length === 0 ? (
        <Empty>まだ下書きはありません。</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="tbl min-w-[680px]" data-testid="draft-table">
            <thead>
              <tr>
                <th>事件ページ</th>
                <th>状態</th>
                <th>チェック</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mine.map((d) => (
                <DraftRow key={d.id} s={state} d={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function CheckExamples() {
  const [state] = useAppState();
  const me = currentUser(state);
  const firm = firmView(state, me.firmId);
  return (
    <>
      <PageHeader no="チェック" title="公開前のチェック" lead="広告の確認の8項目です。止める項目が1つでもあれば、承認の依頼に進めません。下は、わざと問題を入れた下書きの見本です。" photo={PHOTOS.contract} />
      <RoleBox ai={["すべての下書きを、送る前に自動で確かめる", "問題の箇所と理由を示す"]} human={["チェックを通っても、最後は弁護士が読んで判断する（チェックは適法性を保証しない）"]} />
      <div className="space-y-5">
        {PROBLEM_DRAFTS.map((p, k) => {
          const r = checkDraft(p.body, firm);
          return (
            <article key={p.id} className="card overflow-hidden p-0" data-testid={`problem-${p.id}`}>
              <div className="flex items-center gap-3 border-b border-line bg-[#fbfcfe] px-5 py-3.5">
                <OctagonX className="text-human" size={20} />
                <div>
                  <div className="eyebrow">問題の見本 {k + 1}</div>
                  <h3 className="font-bold">{p.title}</h3>
                </div>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <div className="font-bold">{p.body.title}</div>
                  {p.body.facts.map((f, i) => (
                    <p key={i} className={`rounded-lg p-2 ${r.issues.some((x) => x.factIndex === i) ? "bg-human-soft" : "bg-paper"}`}>
                      {f.text}
                      <span className="ml-1 text-xs text-sub">{f.sources.length ? `［出典 ${f.sources.length}件］` : "［出典なし］"}</span>
                    </p>
                  ))}
                  <p className="rounded-lg bg-paper p-2">{p.body.guidance}</p>
                  <p className="text-xs text-sub">費用の条件の表示：{p.body.showFee ? "あり" : "なし"}</p>
                  <button className="btn" disabled>
                    承認を依頼（止める項目があるため不可）
                  </button>
                </div>
                <CheckPanel result={r} />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export function Approvals() {
  const [state] = useAppState();
  const me = currentUser(state);
  const mine = draftsOf(state, me.firmId);
  const pending = mine.filter((d) => d.status === "pending");
  const log = mine.flatMap((d) => d.approvals.map((a) => ({ ...a, d }))).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHeader no="承認" title="弁護士の承認" lead="承認と公開停止は、弁護士だけが行えます。承認すると、すぐに事務所の公開ページに出ます。承認の記録は追加だけで、書き換えられません。" photo={PHOTOS.gavel} />
      <RoleBox ai={["チェックを通った下書きを、承認待ちに集める", "承認者、日時、版を自動で記録する"]} human={["弁護士が本文と出典を読み、承認か差し戻し（理由は必須）を選ぶ"]} />
      {me.role !== "lawyer" && <p className="mb-4 rounded-2xl bg-warn-soft p-3 text-sm text-warn">今は事務員（編集者）として見ています。承認するには、右上で弁護士に切り替えてください。</p>}
      <h2 className="h2">
        <Gavel size={18} className="text-found" />
        承認待ち（{pending.length}件）
      </h2>
      {pending.length === 0 ? (
        <Empty>承認待ちの下書きはありません。</Empty>
      ) : (
        <div className="card mb-8 overflow-x-auto p-0">
          <table className="tbl min-w-[680px]" data-testid="pending-table">
            <thead>
              <tr>
                <th>事件ページ</th>
                <th>状態</th>
                <th>チェック</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((d) => (
                <DraftRow key={d.id} s={state} d={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="h2 mt-8">承認の記録</h2>
      <div className="card overflow-x-auto p-0">
        <table className="tbl min-w-[680px]">
          <thead>
            <tr>
              <th>日時</th>
              <th>事件ページ</th>
              <th>操作</th>
              <th>した人</th>
              <th>版</th>
            </tr>
          </thead>
          <tbody>
            {log.map((a, k) => (
              <tr key={k}>
                <td className="whitespace-nowrap">{t(a.at)}</td>
                <td>{a.d.body.title}</td>
                <td>
                  {{ request: "承認を依頼", approve: "承認・公開", reject: "差し戻し", stop: "公開停止", auto_stop: "契約終了で自動停止", correction: "訂正（誤字）" }[a.action]}
                  {a.reason && <div className="text-xs text-sub">理由：{a.reason}</div>}
                </td>
                <td>{a.by === "system" ? "システム" : userById(a.by)?.name}</td>
                <td>版 {a.versionNo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PublicPages() {
  const [state] = useAppState();
  const me = currentUser(state);
  const firm = firmView(state, me.firmId);
  const st = settingsOf(state, me.firmId);
  const pub = draftsOf(state, me.firmId).filter((d) => d.published);
  return (
    <>
      <PageHeader no="公開" title="事務所の公開ページ" lead="承認した事件ページは、共通のテンプレートで、事務所ごとの公開サイトに出ます。デモでは /s/事務所/ に出し、本番ではサブドメインか独自ドメインに対応させます。" photo={PHOTOS.building}>
        <Link href={`/s/${firm.slug}`} className="btn btn-primary" target="_blank">
          <Globe size={15} />
          公開サイトを開く
        </Link>
      </PageHeader>
      <RoleBox ai={["承認された版だけを、公開ページに出す", "タイトル、説明文、OGP、構造化データ、サイトマップを自動で付ける"]} human={["公開ページを確かめ、必要なら訂正や公開停止をする"]} />
      <div className="card mb-5 text-sm">
        公開先：<b>{st.domain}</b>（{st.domainType === "sub" ? "サブドメイン" : "独自ドメイン"}）　ページ枠：{pub.filter((d) => d.status !== "stopped").length} / {st.pageQuota}　{st.active ? <span className="chip bg-ok-soft text-ok">契約中</span> : <span className="chip bg-human text-white">契約終了・公開停止中</span>}
        <div className="mt-1 text-xs text-sub">
          サイトマップ：
          <a href={`/s/${firm.slug}/sitemap.xml`} className="text-ai underline" target="_blank">
            /s/{firm.slug}/sitemap.xml
          </a>
        </div>
      </div>
      {pub.length === 0 ? (
        <Empty>公開中のページはありません。</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="public-list">
          {pub.map((d) => {
            const inc = incidentById(state, d.incidentId)!;
            return (
              <li key={d.id} className="card flex items-center gap-3 p-4">
                <Thumb photo={incidentPhoto(inc.company, inc.category)} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{d.published!.body.title}</div>
                  <div className="text-xs text-sub">
                    版 {d.published!.versionNo}・承認 {userById(d.published!.by)?.name}・{t(d.published!.at)}
                  </div>
                  {d.status === "needs_reapproval" && <span className="chip bg-human text-white">再承認が必要（前の版を表示中）</span>}
                </div>
                <Link href={`/s/${firm.slug}/${inc.slug}`} target="_blank" className="btn px-3 py-1.5 text-xs">
                  <ExternalLink size={13} />
                  開く
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
