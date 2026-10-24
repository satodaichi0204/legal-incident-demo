// デモの状態と、すべての操作（純粋な関数）。ブラウザでは store.ts が localStorage に保存する。
// 本番では Supabase（認証と、行の単位の権限で事務所ごとに分離）に置き換える想定。
import { checkDraft } from "./check";
import { cluster, fetchRun, type Incident } from "./collect";
import { genDraft, genFor } from "./generated";
import { ARTICLES, FIRMS, SAMPLE_DRAFTS, articleById, firmById, userById, type DraftBody, type Firm } from "./data";

export type DraftStatus = "draft" | "pending" | "rejected" | "published" | "needs_reapproval" | "stopped";
export const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: "下書き",
  pending: "承認待ち",
  rejected: "差し戻し",
  published: "公開中",
  needs_reapproval: "再承認が必要",
  stopped: "公開停止",
};
export type Version = { no: number; at: string; by: string; note: string; body: DraftBody };
export type Approval = { at: string; by: string; action: "request" | "approve" | "reject" | "stop" | "auto_stop" | "correction"; versionNo: number; reason?: string };
export type Draft = {
  id: string;
  firmId: string;
  incidentId: string;
  /** ai＝Claude で事前に生成、sample＝見本（完成形）、auto＝簡易作成 */
  mode: "ai" | "sample" | "auto";
  status: DraftStatus;
  body: DraftBody;
  versions: Version[];
  /** 公開中の版（公開ページはこの版だけを表示する） */
  published: { versionNo: number; body: DraftBody; at: string; by: string } | null;
  /** 承認の記録（追加だけ。書き換えない） */
  approvals: Approval[];
  /** 公開ページに出す訂正の履歴 */
  corrections: { at: string; note: string }[];
};
export type Notice = { id: string; at: string; firmId: string | null; level: "error" | "warn" | "info"; title: string; body: string };
/** measured＝Claude API を実際に呼んだときの量（事前生成の実測）。ないものは見積もり */
export type Usage = { at: string; firmId: string | null; task: string; model: string; inTok: number; outTok: number; usd: number; measured?: boolean };
export type FirmSettings = Pick<Firm, "name" | "address" | "fee" | "formUrl" | "domain" | "domainType" | "pageQuota" | "aiCapYen" | "lawyers"> & { contractEnd: string; active: boolean };

export type State = {
  v: 1;
  seq: number;
  /** 「時間を進める」で進めた日数 */
  offsetDays: number;
  userId: string;
  runs: { no: number; at: string; fetched: number; failed: string[] }[];
  arrived: Record<string, number>;
  drafts: Draft[];
  notices: Notice[];
  usage: Usage[];
  settings: Record<string, FirmSettings>;
  indexNow: { at: string; firmId: string; url: string; action: string }[];
  backups: { at: string; note: string }[];
};

/** 料金（Claude API の公式の料金。1ドル150円で換算）。事前生成の実測がないものは、この料金で見積もって記録する */
export const PRICING = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
} as const;
export const YEN = 150;
const usage = (at: string, firmId: string | null, task: string, model: keyof typeof PRICING, inTok: number, outTok: number): Usage => ({
  at,
  firmId,
  task,
  model,
  inTok,
  outTok,
  usd: (inTok * PRICING[model].in + outTok * PRICING[model].out) / 1_000_000,
});

const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
export const nowOf = (s: State, real: Date) => addDays(real, s.offsetDays);

export const incidentsOf = (s: State): Incident[] => cluster(s.arrived);
export const incidentById = (s: State, id: string) => incidentsOf(s).find((i) => i.id === id);
export const settingsOf = (s: State, firmId: string): FirmSettings => s.settings[firmId];
export const firmView = (s: State, firmId: string): Firm & { active: boolean; contractEnd: string } => ({ ...firmById(firmId), ...settingsOf(s, firmId) });
/** その事務所の下書きだけ（事務所ごとの分離。本番は行の単位の権限で同じことをする） */
export const draftsOf = (s: State, firmId: string) => s.drafts.filter((d) => d.firmId === firmId);
export const currentUser = (s: State) => userById(s.userId);

/** 下書きを作る。Claude で事前に生成し、出典の照合と公開前のチェックに合格したものを使う。ないとき（不合格を含む）は見本の完成形、それもなければ記事の文から組み立てる「簡易作成」 */
export function buildBody(inc: Incident): { body: DraftBody; mode: Draft["mode"]; usage?: Pick<Usage, "model" | "inTok" | "outTok" | "usd"> } {
  const ai = genDraft(inc.articleIds);
  if (ai) return { body: ai.body, mode: "ai", usage: ai.usage };
  const sample = SAMPLE_DRAFTS[inc.company];
  if (sample && !inc.updated) return { body: structuredClone(sample), mode: "sample" };
  const arts = inc.articleIds.map(articleById);
  const facts = arts.flatMap((a) => a.text.split("。").filter(Boolean).slice(0, 2).map((t) => ({ text: t + "。", sources: [a.id] })));
  const seen = new Set<string>();
  return {
    body: {
      title: `${inc.company}（架空）に関する公表について`,
      facts: facts.filter((f) => (seen.has(f.text) ? false : (seen.add(f.text), true))).slice(0, 4),
      guidance: "影響を受けた可能性のある方は、まず同社の公式の発表をご確認ください。今後の対応について、弁護士にご相談いただけます。",
      showLawyer: true,
      showFee: true,
    },
    mode: "auto",
  };
}

export function initialState(real: Date): State {
  const settings: Record<string, FirmSettings> = {};
  for (const f of FIRMS) {
    settings[f.id] = { name: f.name, address: f.address, fee: f.fee, formUrl: f.formUrl, domain: f.domain, domainType: f.domainType, pageQuota: f.pageQuota, aiCapYen: f.aiCapYen, lawyers: structuredClone(f.lawyers), contractEnd: iso(addDays(real, f.contractDays)).slice(0, 10), active: true };
  }
  let s: State = { v: 1, seq: 0, offsetDays: 0, userId: "u-a2", runs: [], arrived: {}, drafts: [], notices: [], usage: [], settings, indexNow: [], backups: [] };
  // 1回目の収集は済んでいる（くらしの消費者ニュースは取得に失敗）
  s = collect(s, addDays(real, -3));
  // 事務所A：ミドリ通販と東和精工は公開中、北斗旅行は承認待ち、青葉学習塾は下書き
  const seed = (st: State, firmId: string, company: string, lawyer: string, clerk: string, to: "published" | "pending" | "draft", daysAgo: number) => {
    let x = createDraft(st, firmId, company, clerk, addDays(real, -daysAgo));
    const id = x.drafts[x.drafts.length - 1].id;
    if (to === "draft") return x;
    x = requestApproval(x, id, clerk, addDays(real, -daysAgo + 0.1)).state;
    if (to === "pending") return x;
    return approve(x, id, lawyer, addDays(real, -daysAgo + 0.2)).state;
  };
  s = seed(s, "firm-a", "ミドリ通販", "u-a1", "u-a2", "published", 3);
  s = seed(s, "firm-a", "東和精工", "u-a1", "u-a2", "published", 2);
  s = seed(s, "firm-a", "北斗旅行", "u-a1", "u-a2", "pending", 1);
  s = seed(s, "firm-a", "青葉学習塾", "u-a1", "u-a2", "draft", 1);
  s = seed(s, "firm-b", "北斗旅行", "u-b1", "u-b2", "published", 2);
  s = seed(s, "firm-b", "まちの電力", "u-b1", "u-b2", "draft", 1);
  s.backups = [{ at: iso(addDays(real, -1)), note: "毎日の自動バックアップ（デモ：記録だけ）" }];
  return checkContracts(s, real);
}

export function parseState(raw: string | null, real: Date): State {
  if (!raw) return initialState(real);
  try {
    const s = JSON.parse(raw);
    if (s?.v !== 1 || !Array.isArray(s.drafts)) return initialState(real);
    return s as State;
  } catch {
    return initialState(real);
  }
}

const notice = (s: State, n: Omit<Notice, "id">): State => ({ ...s, seq: s.seq + 1, notices: [{ ...n, id: `n${s.seq + 1}` }, ...s.notices].slice(0, 100) });

/** 収集を実行する。重要な変更（公開中のページの事件に続報）と異常（取得の失敗）だけを通知する */
export function collect(s: State, now: Date): State {
  const run = s.runs.length + 1;
  const r = fetchRun(run, Object.keys(s.arrived));
  const before = incidentsOf(s);
  const arrived = { ...s.arrived };
  for (const id of r.fetched) arrived[id] = run;
  let next: State = { ...s, arrived, runs: [...s.runs, { no: run, at: iso(now), fetched: r.fetched.length, failed: r.failed }] };
  // 記事が増えた事件ごとに、要約・分類の利用量を記録する（事前生成の実測があれば、その量）
  for (const inc of incidentsOf(next)) {
    const added = inc.articleIds.filter((id) => r.fetched.includes(id));
    if (added.length === 0) continue;
    const g = genFor(inc.articleIds)?.summary;
    next.usage = [
      ...next.usage,
      g
        ? { at: iso(now), firmId: null, task: `事件の要約・分類（${inc.company}）`, model: g.model, inTok: g.inTok, outTok: g.outTok, usd: g.usd, measured: true }
        : usage(iso(now), null, `事件の要約・分類（${inc.company}）`, "claude-haiku-5-5", 3000 * added.length, 1000),
    ];
  }
  for (const src of r.failed) {
    next = notice(next, { at: iso(now), firmId: null, level: "error", title: "情報源の取得に失敗しました", body: `${src}：応答がありません（次の回で自動で再試行します）` });
  }
  for (const inc of incidentsOf(next)) {
    const prev = before.find((b) => b.id === inc.id);
    if (prev && inc.articleIds.length > prev.articleIds.length && inc.updated) {
      for (const d of next.drafts.filter((x) => x.incidentId === inc.id && (x.status === "published" || x.status === "needs_reapproval"))) {
        next = notice(next, { at: iso(now), firmId: d.firmId, level: "warn", title: "公開中のページの事件に続報があります", body: `${inc.company}（架空）${inc.change ? `：${inc.change.from} → ${inc.change.to}` : ""}。下書きを更新し、再承認してください。` });
      }
    }
  }
  return next;
}

export function createDraft(s: State, firmId: string, incidentId: string, userId: string, now: Date): State {
  const inc = incidentById(s, incidentId);
  if (!inc) return s;
  const { body, mode, usage: u } = buildBody(inc);
  const id = `d${s.seq + 1}`;
  const d: Draft = { id, firmId, incidentId, mode, status: "draft", body, versions: [{ no: 1, at: iso(now), by: userId, note: mode === "ai" ? "下書きを作成（Claude で生成）" : mode === "sample" ? "下書きを作成（見本）" : "下書きを作成（簡易作成）", body: structuredClone(body) }], published: null, approvals: [], corrections: [] };
  return { ...s, seq: s.seq + 1, drafts: [...s.drafts, d], usage: [...s.usage, u ? { at: iso(now), firmId, task: `事件ページの下書き（${inc.company}）`, ...u, measured: true } : usage(iso(now), firmId, `事件ページの下書き（${inc.company}）`, "claude-sonnet-5-5", 4000, 2000)] };
}

const update = (s: State, id: string, fn: (d: Draft) => Draft): State => ({ ...s, drafts: s.drafts.map((d) => (d.id === id ? fn(d) : d)) });
const lastVersion = (d: Draft) => d.versions[d.versions.length - 1].no;

/** 公開後の変更の重さ：事実、出典、費用、弁護士、題名を変えたら重要（再承認）。お知らせの文の数文字の直しは軽い（誤字） */
export function changeKind(a: DraftBody, b: DraftBody): "none" | "minor" | "major" {
  if (JSON.stringify(a) === JSON.stringify(b)) return "none";
  const major = a.title !== b.title || a.showFee !== b.showFee || a.showLawyer !== b.showLawyer || JSON.stringify(a.facts) !== JSON.stringify(b.facts);
  if (major) return "major";
  return editDistance(a.guidance, b.guidance) <= 5 ? "minor" : "major";
}
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** 版を保存する。公開中に重要な変更をしたら「再承認が必要」、軽い直しは訂正として公開ページにすぐ反映 */
export function saveDraft(s: State, id: string, body: DraftBody, userId: string, note: string, now: Date): { state: State; kind: "none" | "minor" | "major" } {
  const d = s.drafts.find((x) => x.id === id);
  if (!d || d.firmId !== userById(userId).firmId) return { state: s, kind: "none" };
  const base = d.published && (d.status === "published" || d.status === "needs_reapproval") ? d.published.body : d.versions[d.versions.length - 1].body;
  const kind = changeKind(d.versions[d.versions.length - 1].body, body) === "none" ? "none" : changeKind(base, body);
  if (kind === "none") return { state: s, kind };
  const v: Version = { no: lastVersion(d) + 1, at: iso(now), by: userId, note: note || (kind === "minor" ? "誤字の修正" : "本文の修正"), body: structuredClone(body) };
  const next = update(s, id, (x) => {
    const versions = [...x.versions, v];
    if (x.status === "published" || x.status === "needs_reapproval") {
      if (kind === "minor" && x.status === "published") {
        return { ...x, body, versions, published: { versionNo: v.no, body: structuredClone(body), at: iso(now), by: userId }, corrections: [...x.corrections, { at: iso(now), note: v.note }], approvals: [...x.approvals, { at: iso(now), by: userId, action: "correction", versionNo: v.no, reason: "誤字の修正（再承認不要）" }] };
      }
      return { ...x, body, versions, status: "needs_reapproval" };
    }
    return { ...x, body, versions, status: x.status === "rejected" || x.status === "stopped" ? "draft" : x.status === "pending" ? "draft" : x.status };
  });
  return { state: next, kind };
}

export type Result = { state: State; ok: boolean; message: string };
const fail = (s: State, message: string): Result => ({ state: s, ok: false, message });

/** 承認の依頼（公開前のチェックを通ったものだけ） */
export function requestApproval(s: State, id: string, userId: string, now: Date): Result {
  const d = s.drafts.find((x) => x.id === id);
  const u = userById(userId);
  if (!d || d.firmId !== u.firmId) return fail(s, "この下書きは開けません。");
  if (!["draft", "rejected", "needs_reapproval", "stopped"].includes(d.status)) return fail(s, "この状態では承認を依頼できません。");
  if (!settingsOf(s, d.firmId).active) return fail(s, "契約が終了しているため、公開できません。");
  const r = checkDraft(d.body, firmView(s, d.firmId));
  if (!r.pass) return fail(s, "公開前のチェックで止める項目があります。直してから依頼してください。");
  const next = update(s, id, (x) => ({ ...x, status: "pending", approvals: [...x.approvals, { at: iso(now), by: userId, action: "request", versionNo: lastVersion(x) }] }));
  return { state: next, ok: true, message: "承認を依頼しました。弁護士の承認を待ちます。" };
}

const pageUrl = (s: State, d: Draft) => {
  const st = settingsOf(s, d.firmId);
  return `https://${st.domain}/${incidentById(s, d.incidentId)?.slug ?? d.incidentId}`;
};

/** 承認（弁護士だけ）。承認すると、すぐに事務所の公開ページに出る */
export function approve(s: State, id: string, userId: string, now: Date): Result {
  const d = s.drafts.find((x) => x.id === id);
  const u = userById(userId);
  if (!d || d.firmId !== u.firmId) return fail(s, "この下書きは開けません。");
  if (u.role !== "lawyer") return fail(s, "承認できるのは弁護士だけです。");
  if (d.status !== "pending") return fail(s, "承認待ちの下書きではありません。");
  const r = checkDraft(d.body, firmView(s, d.firmId));
  if (!r.pass) return fail(s, "公開前のチェックで止める項目があります。");
  const published = draftsOf(s, d.firmId).filter((x) => x.published && x.status !== "stopped" && x.id !== id).length;
  if (!d.published && published >= settingsOf(s, d.firmId).pageQuota) return fail(s, "契約のページ枠を超えるため、公開できません。");
  const v = lastVersion(d);
  const wasPublished = !!d.published;
  let next = update(s, id, (x) => ({
    ...x,
    status: "published",
    published: { versionNo: v, body: structuredClone(x.body), at: iso(now), by: userId },
    approvals: [...x.approvals, { at: iso(now), by: userId, action: "approve", versionNo: v }],
    corrections: wasPublished ? [...x.corrections, { at: iso(now), note: x.versions[x.versions.length - 1].note }] : x.corrections,
  }));
  next = { ...next, indexNow: [{ at: iso(now), firmId: d.firmId, url: pageUrl(s, d), action: wasPublished ? "更新（送信予定）" : "公開（送信予定）" }, ...next.indexNow] };
  return { state: next, ok: true, message: wasPublished ? "再承認しました。公開ページを更新しました。" : "承認しました。事務所の公開ページに公開しました。" };
}

/** 差し戻し（弁護士だけ。理由は必須） */
export function reject(s: State, id: string, userId: string, reason: string, now: Date): Result {
  const d = s.drafts.find((x) => x.id === id);
  const u = userById(userId);
  if (!d || d.firmId !== u.firmId) return fail(s, "この下書きは開けません。");
  if (u.role !== "lawyer") return fail(s, "差し戻しができるのは弁護士だけです。");
  if (d.status !== "pending") return fail(s, "承認待ちの下書きではありません。");
  if (!reason.trim()) return fail(s, "差し戻すときは、理由を入力してください。");
  const next = update(s, id, (x) => ({ ...x, status: x.published ? "needs_reapproval" : "rejected", approvals: [...x.approvals, { at: iso(now), by: userId, action: "reject", versionNo: lastVersion(x), reason: reason.trim() }] }));
  return { state: next, ok: true, message: "差し戻しました。" };
}

/** 公開停止（弁護士だけ） */
export function stop(s: State, id: string, userId: string, reason: string, now: Date): Result {
  const d = s.drafts.find((x) => x.id === id);
  const u = userById(userId);
  if (!d || d.firmId !== u.firmId) return fail(s, "この下書きは開けません。");
  if (u.role !== "lawyer") return fail(s, "公開停止ができるのは弁護士だけです。");
  if (!d.published || d.status === "stopped") return fail(s, "公開中のページではありません。");
  let next = update(s, id, (x) => ({ ...x, status: "stopped", published: null, approvals: [...x.approvals, { at: iso(now), by: userId, action: "stop", versionNo: lastVersion(x), reason: reason.trim() || undefined }] }));
  next = { ...next, indexNow: [{ at: iso(now), firmId: d.firmId, url: pageUrl(s, d), action: "削除（送信予定）" }, ...next.indexNow] };
  return { state: next, ok: true, message: "公開を停止しました。公開ページには表示されません。" };
}

/** 契約の期限：30日前から通知し、期限を過ぎたら自動で公開停止 */
export function checkContracts(s: State, real: Date): State {
  const now = nowOf(s, real);
  let next = s;
  for (const f of FIRMS) {
    const st = settingsOf(next, f.id);
    const days = Math.ceil((new Date(st.contractEnd + "T23:59:59").getTime() - now.getTime()) / 86_400_000);
    if (st.active && days < 0) {
      for (const d of draftsOf(next, f.id).filter((x) => x.published)) {
        next = update(next, d.id, (x) => ({ ...x, status: "stopped", published: null, approvals: [...x.approvals, { at: iso(now), by: "system", action: "auto_stop", versionNo: lastVersion(x), reason: "契約期間の終了" }] }));
      }
      next = { ...next, settings: { ...next.settings, [f.id]: { ...st, active: false } } };
      next = notice(next, { at: iso(now), firmId: f.id, level: "error", title: "契約期間が終了し、公開を自動で停止しました", body: `${st.name}：契約の終わり ${st.contractEnd}` });
    } else if (st.active && days <= 30 && !next.notices.some((n) => n.firmId === f.id && n.title.startsWith("契約の期限"))) {
      next = notice(next, { at: iso(now), firmId: f.id, level: "warn", title: `契約の期限まで ${days}日です`, body: `${st.name}：${st.contractEnd} に終了します。更新されない場合、公開ページは自動で停止します。` });
    }
  }
  return next;
}

export function advanceDays(s: State, days: number, real: Date): State {
  const next = { ...s, offsetDays: s.offsetDays + days };
  const now = nowOf(next, real);
  return checkContracts({ ...next, backups: [{ at: iso(now), note: "毎日の自動バックアップ（デモ：記録だけ）" }, ...next.backups] }, real);
}

/** AI の利用量（その月、事務所ごと）。見本モードでは、本番の見積もりとして記録する */
export function usageYen(s: State, firmId: string | null): number {
  return Math.round(s.usage.filter((u) => firmId === null || u.firmId === firmId).reduce((a, u) => a + u.usd, 0) * YEN * 100) / 100;
}

export const ARTICLE_COUNT = ARTICLES.length;
