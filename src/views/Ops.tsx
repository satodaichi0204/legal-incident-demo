"use client";
// 告知文の案、事務所の設定、運営（通知、時間を進める、AI の利用量、IndexNow、バックアップ）
import { Bell, Clock, Copy, Cpu, DatabaseBackup, FastForward, Save, Send } from "lucide-react";
import { useState } from "react";
import { PageHeader, RoleBox, Stat } from "@/components/ui";
import { checkText } from "@/lib/check";
import { PHOTOS } from "@/lib/photos";
import { advanceDays, currentUser, draftsOf, firmView, incidentById, nowOf, PRICING, settingsOf, usageYen, YEN, type FirmSettings } from "@/lib/state";
import { useAppState } from "@/lib/store";

const t = (iso: string) => new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function Announce() {
  const [state] = useAppState();
  const me = currentUser(state);
  const firm = firmView(state, me.firmId);
  const pub = draftsOf(state, me.firmId).filter((d) => d.published && d.status !== "stopped");
  const [copied, setCopied] = useState("");
  return (
    <>
      <PageHeader no="運営" title="告知文の案" lead="公開したページを知らせる文の案です（X用、LINE用、ホームページ用、更新の告知）。告知文も、表現と個人の情報のチェックを通します。送信はしません。" photo={PHOTOS.phone} />
      <RoleBox ai={["公開した事件ページから、媒体ごとの文の案を作る（見本モード：ひな形から作成）", "表現のチェックをかける"]} human={["文を確かめて、事務所の人が自分で投稿する（自動では投稿しない）"]} />
      {pub.length === 0 && <p className="card text-sm text-sub">公開中のページがありません。</p>}
      <div className="space-y-5">
        {pub.map((d) => {
          const inc = incidentById(state, d.incidentId)!;
          const url = `https://${settingsOf(state, d.firmId).domain}/${inc.slug}`;
          const texts = [
            { k: "X（旧Twitter）", v: `【事件情報】${d.published!.body.title}。公表の内容と時系列を、出典つきで整理しました。${url}` },
            { k: "LINE", v: `${firm.name}です。${d.published!.body.title}について、公表されている情報をまとめました。ご不安な方はご覧ください。\n${url}` },
            { k: "ホームページ", v: `${d.published!.body.title}について、企業の公式の発表と報道をもとに、事件の概要と時系列をまとめたページを公開しました。` },
            ...(d.corrections.length ? [{ k: "更新の告知", v: `【更新】${d.published!.body.title}のページを更新しました（${d.corrections[d.corrections.length - 1].note}）。${url}` }] : []),
          ];
          return (
            <section key={d.id} className="card">
              <h3 className="mb-3 font-bold">{d.published!.body.title}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {texts.map((x) => {
                  const issues = checkText(x.v);
                  return (
                    <div key={x.k} className="rounded-xl border border-line p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-sub">
                          {x.k}　{x.v.length}文字{x.k.startsWith("X") && x.v.length > 140 && <span className="text-human">（140文字を超えています）</span>}
                        </span>
                        {issues.length === 0 ? <span className="chip bg-ok-soft text-ok">チェックOK</span> : <span className="chip bg-human text-white">止める {issues.length}</span>}
                      </div>
                      <p className="whitespace-pre-wrap">{x.v}</p>
                      <button
                        className="btn mt-2 px-3 py-1 text-xs"
                        onClick={() => {
                          navigator.clipboard?.writeText(x.v).catch(() => {});
                          setCopied(d.id + x.k);
                        }}
                      >
                        <Copy size={12} />
                        {copied === d.id + x.k ? "コピーしました" : "コピー"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function SettingsPage() {
  const [state, update] = useAppState();
  const me = currentUser(state);
  const st = settingsOf(state, me.firmId);
  const [form, setForm] = useState<FirmSettings>(st);
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<FirmSettings>) => setForm({ ...form, ...patch });
  return (
    <>
      <PageHeader no="運営" title="事務所の設定" lead="事務所ごとの情報です。ここで入れた事務所名、弁護士、費用の条件は、すべての事件ページに共通で入ります（初期設定を簡単にするため）。" photo={PHOTOS.meetingRoom} />
      <RoleBox ai={["設定を、すべての事件ページに自動で反映する", "費用の条件などが空なら、公開前のチェックで止める"]} human={["事務所の情報、費用の条件、受付のフォームの URL を決める（弁護士）"]} />
      {msg && <p className="mb-4 rounded-2xl bg-ok-soft p-3 text-sm font-bold text-ok">{msg}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-sub">事務所名</span>
            <input className="field" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-sub">所在地</span>
            <input className="field" value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-xs font-bold text-sub">弁護士（氏名・所属の弁護士会）</span>
            {form.lawyers.map((l, i) => (
              <div key={i} className="mb-2 grid grid-cols-2 gap-2">
                <input className="field" value={l.name} onChange={(e) => set({ lawyers: form.lawyers.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} aria-label={`弁護士 ${i + 1} の氏名`} />
                <input className="field" value={l.bar} onChange={(e) => set({ lawyers: form.lawyers.map((x, k) => (k === i ? { ...x, bar: e.target.value } : x)) })} aria-label={`弁護士 ${i + 1} の所属`} />
              </div>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-sub">費用の条件</span>
            <textarea className="field min-h-[90px]" value={form.fee} onChange={(e) => set({ fee: e.target.value })} aria-label="費用の条件" />
          </label>
        </section>
        <section className="card space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-sub">被害に遭われた方の受付（事務所の外部のフォームの URL。このシステムでは入力を受け取りません）</span>
            <input className="field" value={form.formUrl} onChange={(e) => set({ formUrl: e.target.value })} />
          </label>
          <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-sub">公開先</span>
              <select className="field" value={form.domainType} onChange={(e) => set({ domainType: e.target.value as "sub" | "custom" })}>
                <option value="sub">サブドメイン</option>
                <option value="custom">独自ドメイン</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-sub">ドメイン</span>
              <input className="field" value={form.domain} onChange={(e) => set({ domain: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="mb-1 block text-xs font-bold text-sub">ページ枠</span>
              <div className="field bg-paper">{form.pageQuota} ページ</div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold text-sub">契約の終わり</span>
              <div className="field bg-paper">{form.contractEnd}</div>
            </div>
            <label>
              <span className="mb-1 block text-xs font-bold text-sub">AI の月の上限</span>
              <input type="number" className="field" value={form.aiCapYen} onChange={(e) => set({ aiCapYen: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          </div>
          <p className="text-xs text-sub">ページ枠と契約期間は、運営（契約の管理）側で設定します。</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              update((s) => ({ ...s, settings: { ...s.settings, [me.firmId]: form } }));
              setMsg("設定を保存しました。すべての事件ページに反映されます。");
            }}
          >
            <Save size={15} />
            保存する
          </button>
        </section>
      </div>
    </>
  );
}

export function OpsPage() {
  const [state, update] = useAppState();
  const me = currentUser(state);
  const now = nowOf(state, new Date());
  const notices = state.notices.filter((n) => n.firmId === me.firmId || n.firmId === null);
  const st = settingsOf(state, me.firmId);
  const yen = usageYen(state, me.firmId);
  const allYen = usageYen(state, null);
  const draftsUsage = state.usage.filter((u) => u.task.startsWith("事件ページ"));
  const perDraft = draftsUsage.length ? (draftsUsage.reduce((a, u) => a + u.usd, 0) / draftsUsage.length) * YEN : 0;
  return (
    <>
      <PageHeader no="運営" title="運営（通知・契約・AIの利用量）" lead="運営を半自動にする仕組みです。異常と重要な変更だけを通知し、契約の期限が来たら自動で公開を停止します。AI の利用量には上限を付けます。" photo={PHOTOS.laptop}>
        <button className="btn btn-primary" onClick={() => update((s) => advanceDays(s, 14, new Date()))} data-testid="advance">
          <FastForward size={15} />
          時間を14日進める（デモ）
        </button>
      </PageHeader>
      <RoleBox ai={["取得の失敗、続報、契約の期限、AI の上限を通知する", "契約期間が過ぎたら、その事務所のページを自動で公開停止する", "毎日バックアップを取る"]} human={["通知を見て対応する（運営者・事務所）", "契約の更新を決める"]} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="デモの今日" value={<span className="text-xl">{now.toLocaleDateString("ja-JP")}</span>} note={state.offsetDays ? `${state.offsetDays}日進めています` : "実際の今日"} icon={<Clock size={16} />} />
        <Stat label="契約の終わり" value={<span className="text-xl">{st.contractEnd}</span>} note={st.active ? "契約中" : "契約終了・公開停止"} />
        <Stat label="この事務所のAIの利用量" value={`${yen.toFixed(2)}円`} note={`上限 ${st.aiCapYen}円/月（見積もり）`} icon={<Cpu size={16} />} />
        <Stat label="下書き1件あたり（見積もり）" value={`${perDraft.toFixed(1)}円`} note="claude-sonnet-5-5 の料金で計算" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 text-base">
            <Bell size={18} className="text-human" />
            通知（異常と重要な変更だけ）
          </h2>
          <ul className="space-y-2 text-sm" data-testid="notices">
            {notices.length === 0 && <li className="text-sub">通知はありません。</li>}
            {notices.map((n) => (
              <li key={n.id} className={`rounded-xl p-3 ${n.level === "error" ? "bg-human-soft" : n.level === "warn" ? "bg-warn-soft" : "bg-paper"}`}>
                <div className="font-bold">{n.title}</div>
                <div className="text-xs text-sub">
                  {t(n.at)}　{n.body}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 text-base">
            <Cpu size={18} className="text-ai" />
            AI の利用量（見本モードのため実際の費用は0円。本番の見積もり）
          </h2>
          <div className="mb-3 h-3 overflow-hidden rounded-full bg-paper">
            <div className="h-3 rounded-full bg-ai" style={{ width: `${Math.min(100, (yen / st.aiCapYen) * 100)}%` }} />
          </div>
          <table className="tbl text-xs">
            <thead>
              <tr>
                <th>処理</th>
                <th>モデル</th>
                <th className="text-right">トークン（入力/出力）</th>
                <th className="text-right">円</th>
              </tr>
            </thead>
            <tbody>
              {state.usage
                .filter((u) => u.firmId === me.firmId || u.firmId === null)
                .slice(-8)
                .reverse()
                .map((u, k) => (
                  <tr key={k}>
                    <td>{u.task}</td>
                    <td>{u.model}</td>
                    <td className="text-right tabular-nums">
                      {u.inTok.toLocaleString()} / {u.outTok.toLocaleString()}
                    </td>
                    <td className="text-right tabular-nums">{(u.usd * YEN).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-sub">
            料金：haiku 入力 ${PRICING["claude-haiku-5-5"].in}・出力 ${PRICING["claude-haiku-5-5"].out}、sonnet 入力 ${PRICING["claude-sonnet-5-5"].in}・出力 ${PRICING["claude-sonnet-5-5"].out}（100万トークンあたり、1ドル{YEN}円）。収集全体の要約を含めた合計 {allYen.toFixed(2)}円。思考の分だけ実際は増えることがあります。
          </p>
        </section>
        <section className="card">
          <h2 className="h2 text-base">
            <Send size={18} className="text-ai" />
            IndexNow（検索エンジンへの更新の知らせ。デモでは送信の予定を記録するだけ）
          </h2>
          <ul className="space-y-1 text-xs" data-testid="indexnow">
            {state.indexNow.filter((x) => x.firmId === me.firmId).map((x, k) => (
              <li key={k}>
                {t(x.at)}　<b>{x.action}</b>　{x.url}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 text-base">
            <DatabaseBackup size={18} className="text-ok" />
            バックアップ
          </h2>
          <ul className="space-y-1 text-xs">
            {state.backups.map((b, k) => (
              <li key={k}>
                {t(b.at)}　{b.note}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
