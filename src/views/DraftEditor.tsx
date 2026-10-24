"use client";
// 2〜4. 下書きの編集（出典つき）→ 公開前のチェック → 承認の依頼 → 弁護士の承認・差し戻し・公開停止
import { Check, ExternalLink, Gavel, History, Plus, Quote, Save, Send, StopCircle, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import CheckPanel from "@/components/CheckPanel";
import { Empty, PageHeader, RoleBox } from "@/components/ui";
import { checkDraft } from "@/lib/check";
import { articleById, sourceById, userById, type DraftBody } from "@/lib/data";
import { incidentPhoto } from "@/lib/photos";
import { approve, changeKind, currentUser, firmView, incidentById, nowOf, reject, requestApproval, saveDraft, settingsOf, stop, STATUS_LABEL, type Result, type State } from "@/lib/state";
import { GENERATED } from "@/lib/generated";
import { useAppState } from "@/lib/store";

const STATUS_CLS: Record<string, string> = {
  draft: "bg-paper text-sub",
  pending: "bg-found-soft text-found",
  rejected: "bg-human-soft text-human",
  published: "bg-ok-soft text-ok",
  needs_reapproval: "bg-human text-white",
  stopped: "bg-paper text-mute",
};
const ACTION_LABEL = { request: "承認を依頼", approve: "承認・公開", reject: "差し戻し", stop: "公開停止", auto_stop: "契約終了で自動停止", correction: "訂正（誤字）" };
const t = (iso: string) => new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 2つの版の違い（事実の文の追加・削除、お知らせ、題名） */
function diff(a: DraftBody, b: DraftBody) {
  const out: { kind: "add" | "del"; text: string }[] = [];
  const at = a.facts.map((f) => f.text);
  const bt = b.facts.map((f) => f.text);
  for (const x of at) if (!bt.includes(x)) out.push({ kind: "del", text: x });
  for (const x of bt) if (!at.includes(x)) out.push({ kind: "add", text: x });
  if (a.title !== b.title) out.push({ kind: "del", text: `題名：${a.title}` }, { kind: "add", text: `題名：${b.title}` });
  if (a.guidance !== b.guidance) out.push({ kind: "del", text: `お知らせ：${a.guidance}` }, { kind: "add", text: `お知らせ：${b.guidance}` });
  if (a.showFee !== b.showFee) out.push({ kind: b.showFee ? "add" : "del", text: "費用の条件の表示" });
  return out;
}

type Msg = { ok: boolean; text: string } | null;
function Editor({ msg, setMsg }: { msg: Msg; setMsg: (m: Msg) => void }) {
  const [state, update] = useAppState();
  const params = useSearchParams();
  const me = currentUser(state);
  const d = state.drafts.find((x) => x.id === params.get("id") && x.firmId === me.firmId);
  const [body, setBody] = useState<DraftBody | null>(d ? structuredClone(d.body) : null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [diffNo, setDiffNo] = useState<number | null>(null);

  if (!d || !body) {
    return (
      <>
        <PageHeader no="下書き" title="下書きの編集" lead="この事務所の下書きではないか、見つかりません。事務所ごとにデータは分かれています。" />
        <Empty>
          <Link href="/admin/drafts" className="font-bold text-ai underline">
            下書きの一覧へ
          </Link>
        </Empty>
      </>
    );
  }
  const inc = incidentById(state, d.incidentId)!;
  const firm = firmView(state, d.firmId);
  const result = checkDraft(body, firm);
  const saved = d.body;
  const dirty = changeKind(saved, body) !== "none";
  const isLawyer = me.role === "lawyer";
  const photo = incidentPhoto(inc.company, inc.category);
  const run = (fn: (s: State) => Result) => {
    let r: { ok: boolean; message: string } = { ok: false, message: "" };
    update((s) => {
      const out = fn(s);
      r = out;
      return out.state;
    });
    setMsg({ ok: r.ok, text: r.message });
  };
  const now = () => nowOf(state, new Date());
  const setFact = (i: number, patch: Partial<DraftBody["facts"][number]>) => setBody({ ...body, facts: body.facts.map((f, k) => (k === i ? { ...f, ...patch } : f)) });

  return (
    <>
      <PageHeader no="下書き" title="下書きの編集" lead="事件についての事実の文には、必ず出典を付けます。出典を押すと元の文が見られます。書き直すと、その場で公開前のチェックをやり直します。" photo={photo}>
        <span className={`chip px-3 py-1 text-sm ${STATUS_CLS[d.status]}`} data-testid="draft-status">
          {STATUS_LABEL[d.status]}
        </span>
      </PageHeader>
      <RoleBox
        ai={["出典の文から、事実の文と時系列の下書きを作る（Claude で事前に生成。出典の照合とチェックに合格したものだけを使い、不合格なら見本に戻す）", "書き直すたびに、広告の確認（8項目）をやり直す", "公開後の変更が重要か軽いかを見分ける"]}
        human={["事実の文と出典が合っているかを確かめ、言い回しを直す（事務員・弁護士）", "承認と公開停止は、弁護士だけが行う"]}
      />
      {msg && (
        <p className={`rise mb-5 rounded-2xl border p-3.5 text-sm font-bold ${msg.ok ? "border-ok/30 bg-ok-soft text-ok" : "border-human/30 bg-human-soft text-human"}`} role="status" data-testid="draft-msg">
          {msg.text}
          {msg.ok && d.published && (
            <Link href={`/s/${firm.slug}/${inc.slug}`} className="ml-2 underline">
              公開ページを見る
            </Link>
          )}
        </p>
      )}
      {d.status === "needs_reapproval" && (
        <p className="mb-5 rounded-2xl border border-human/30 bg-human-soft p-3.5 text-sm" data-testid="reapproval-banner">
          <b className="text-human">公開後に重要な変更（事実の文、出典、費用、弁護士の情報）があったため、再承認が必要です。</b>公開ページには、承認済みの前の版（版 {d.published?.versionNo}）を表示しています。
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <section className="card space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-sub">題名</span>
              <input className="field font-bold" value={body.title} onChange={(e) => setBody({ ...body, title: e.target.value })} aria-label="題名" />
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-sub">事件の概要（事実の文。1文ごとに出典を付ける）</span>
                <span className={`chip ${d.mode === "ai" ? "bg-ai-soft text-ai" : d.mode === "sample" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`} data-testid="draft-mode">
                  {d.mode === "ai" ? `Claude（${GENERATED.models.draft}）で実際に生成した下書き` : d.mode === "sample" ? "見本（完成形）" : "簡易作成（記事の文から組み立て）"}
                </span>
              </div>
              <ol className="space-y-3" data-testid="facts">
                {body.facts.map((f, i) => {
                  const bad = result.issues.some((x) => x.check === "grounding" && x.factIndex === i);
                  return (
                    <li key={i} className={`rounded-xl border p-3 ${bad ? "border-human/50 bg-human-soft/40" : "border-line"}`}>
                      <div className="flex gap-2">
                        <span className="mt-2 text-xs font-bold text-mute">{i + 1}</span>
                        <textarea className="field min-h-[72px] leading-6" value={f.text} onChange={(e) => setFact(i, { text: e.target.value })} aria-label={`事実の文 ${i + 1}`} />
                        <button className="self-start rounded-lg p-1.5 text-mute hover:bg-human-soft hover:text-human" onClick={() => setBody({ ...body, facts: body.facts.filter((_, k) => k !== i) })} aria-label={`事実の文 ${i + 1} を消す`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
                        <span className="text-[11px] font-bold text-sub">出典：</span>
                        {inc.articleIds.map((aid, k) => {
                          const on = f.sources.includes(aid);
                          return (
                            <span key={aid} className="inline-flex overflow-hidden rounded-lg border border-line text-[11px]">
                              <button className={`px-2 py-1 font-bold ${on ? "bg-ai text-white" : "bg-white text-sub"}`} onClick={() => setFact(i, { sources: on ? f.sources.filter((x) => x !== aid) : [...f.sources, aid] })} aria-pressed={on} aria-label={`事実の文 ${i + 1} の出典 ${k + 1}`}>
                                {on && <Check size={10} className="mr-0.5 inline" />}出典{k + 1}
                              </button>
                              <button className="border-l border-line bg-white px-1.5 text-ai" onClick={() => setOpenSrc(aid)} aria-label={`出典${k + 1}の元の文を見る`}>
                                <Quote size={11} />
                              </button>
                            </span>
                          );
                        })}
                        {f.sources.length === 0 && <span className="text-[11px] font-bold text-human">出典なし</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button className="btn mt-2 text-xs" onClick={() => setBody({ ...body, facts: [...body.facts, { text: "", sources: [] }] })}>
                <Plus size={13} />
                事実の文を足す
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-sub">この事件でお困りの方へ（事務所からのお知らせ）</span>
              <textarea className="field min-h-[90px] leading-6" value={body.guidance} onChange={(e) => setBody({ ...body, guidance: e.target.value })} aria-label="お知らせ" />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={body.showLawyer} onChange={(e) => setBody({ ...body, showLawyer: e.target.checked })} /> 事務所名・弁護士の情報を表示
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={body.showFee} onChange={(e) => setBody({ ...body, showFee: e.target.checked })} /> 費用の条件を表示
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <input className="field max-w-xs py-2" placeholder="変更のメモ（例：続報で件数を更新）" value={note} onChange={(e) => setNote(e.target.value)} aria-label="変更のメモ" />
              <button
                className="btn btn-primary"
                disabled={!dirty}
                onClick={() => {
                  let kind = "none";
                  update((s) => {
                    const r = saveDraft(s, d.id, body, me.id, note, nowOf(s, new Date()));
                    kind = r.kind;
                    return r.state;
                  });
                  setNote("");
                  setMsg({ ok: true, text: d.published && kind === "minor" ? "誤字の修正として保存し、公開ページに反映しました（再承認は不要です）。" : d.published && kind === "major" ? "重要な変更として保存しました。公開ページに反映するには、再承認が必要です。" : "版を保存しました。" });
                }}
              >
                <Save size={15} />
                版を保存
              </button>
              {dirty && <span className="text-xs font-bold text-warn">保存していない変更があります</span>}
            </div>
          </section>

          {/* 承認の操作（状態と役割で出すボタンが変わる） */}
          <section className="card space-y-3 border-found/30 bg-gradient-to-br from-white to-found-soft" data-testid="approval-box">
            <h3 className="flex items-center gap-2 font-bold">
              <Gavel size={18} className="text-found" />
              承認（最終の判断は弁護士）
            </h3>
            <div className="text-sm text-sub">
              あなた：{me.name}（{me.role === "lawyer" ? "弁護士・承認者" : "事務員・編集者"}）
            </div>
            <div className="flex flex-wrap gap-2">
              {["draft", "rejected", "needs_reapproval", "stopped"].includes(d.status) && (
                <button className="btn btn-primary" disabled={dirty || !result.pass} onClick={() => run((s) => requestApproval(s, d.id, me.id, now()))} data-testid="request">
                  <Send size={15} />
                  承認を依頼
                </button>
              )}
              {d.status === "pending" && isLawyer && (
                <>
                  <button className="btn btn-ok" onClick={() => run((s) => approve(s, d.id, me.id, now()))} data-testid="approve">
                    <Check size={15} strokeWidth={3} />
                    承認して公開する
                  </button>
                  <button className="btn btn-danger" onClick={() => run((s) => reject(s, d.id, me.id, reason, now()))} data-testid="reject">
                    <Undo2 size={15} />
                    差し戻す
                  </button>
                </>
              )}
              {d.published && isLawyer && d.status !== "pending" && (
                <button className="btn btn-danger" onClick={() => run((s) => stop(s, d.id, me.id, reason, now()))} data-testid="stop">
                  <StopCircle size={15} />
                  公開を停止
                </button>
              )}
            </div>
            {isLawyer && (d.status === "pending" || d.published) && <input className="field" placeholder="差し戻し・公開停止の理由（差し戻しは必須）" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="理由" />}
            {d.status === "pending" && !isLawyer && <p className="text-sm text-sub">弁護士の承認を待っています。承認・差し戻しは弁護士だけができます。</p>}
            {!result.pass && ["draft", "rejected", "needs_reapproval"].includes(d.status) && <p className="text-xs font-bold text-human">止める項目を直し、版を保存すると、承認を依頼できます。</p>}
            {d.published && (
              <Link href={`/s/${firm.slug}/${inc.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-ai underline" data-testid="public-link">
                <ExternalLink size={14} />
                公開ページ：{settingsOf(state, d.firmId).domain}/{inc.slug}
              </Link>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <CheckPanel result={result} />
          {openSrc && (
            <section className="card rise" data-testid="source-panel">
              <div className="mb-1 text-xs text-sub">
                出典の元の文　{articleById(openSrc).date}　{sourceById(articleById(openSrc).sourceId).name}
              </div>
              <div className="mb-2 font-bold">{articleById(openSrc).title}</div>
              <blockquote className="border-l-4 border-ai pl-3 leading-7">{articleById(openSrc).text}</blockquote>
            </section>
          )}
          <section className="card">
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <History size={17} />
              版の一覧
            </h3>
            <ul className="space-y-1.5 text-sm" data-testid="versions">
              {[...d.versions].reverse().map((v) => (
                <li key={v.no} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">版 {v.no}</span>
                  <span className="text-xs text-sub">
                    {t(v.at)}・{userById(v.by)?.name ?? v.by}・{v.note}
                  </span>
                  {d.published?.versionNo === v.no && <span className="chip bg-ok-soft text-ok">公開中</span>}
                  {v.no > 1 && (
                    <button className="text-xs text-ai underline" onClick={() => setDiffNo(diffNo === v.no ? null : v.no)}>
                      前の版との差分
                    </button>
                  )}
                  {diffNo === v.no && (
                    <ul className="w-full space-y-1 rounded-lg bg-paper p-2 text-xs" data-testid="diff">
                      {diff(d.versions[v.no - 2].body, v.body).map((x, k) => (
                        <li key={k} className={x.kind === "add" ? "text-ok" : "text-human line-through"}>
                          {x.kind === "add" ? "＋ " : "－ "}
                          {x.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Gavel size={17} />
              承認の記録（追加だけで、書き換えません）
            </h3>
            {d.approvals.length === 0 ? (
              <p className="text-sm text-sub">まだありません。</p>
            ) : (
              <table className="tbl text-xs" data-testid="approvals-log">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>操作</th>
                    <th>した人</th>
                    <th>版</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.approvals].reverse().map((a, k) => (
                    <tr key={k}>
                      <td className="whitespace-nowrap">{t(a.at)}</td>
                      <td>
                        {ACTION_LABEL[a.action]}
                        {a.reason && <div className="text-sub">理由：{a.reason}</div>}
                      </td>
                      <td>{a.by === "system" ? "システム" : userById(a.by)?.name}</td>
                      <td>版 {a.versionNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/** 別の下書きに移ったとき、版が増えたとき、利用者を切り替えたときは、編集中の内容を読み直す（作り直す） */
export default function DraftEditor() {
  const [state] = useAppState();
  const params = useSearchParams();
  const d = state.drafts.find((x) => x.id === params.get("id"));
  const [msg, setMsg] = useState<Msg>(null);
  return <Editor key={`${d?.id}-${d?.versions.length}-${state.userId}`} msg={msg} setMsg={setMsg} />;
}
