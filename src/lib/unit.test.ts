import { describe, expect, it } from "vitest";
import { checkDraft, checkText, groundFact } from "./check";
import { cluster, extractCount, fetchRun } from "./collect";
import { ARTICLES, FIRMS, PROBLEM_DRAFTS, SAMPLE_DRAFTS, firmById } from "./data";
import { INDUSTRIES } from "./industry";
import { advanceDays, approve, changeKind, collect, createDraft, draftsOf, firmView, incidentsOf, initialState, parseState, reject, requestApproval, saveDraft, settingsOf, stop, type State } from "./state";

const NOW = new Date("2026-10-24T10:00:00+09:00");
const firmA = firmById("firm-a");
const fresh = () => initialState(NOW);
const draftOf = (s: State, firmId: string, company: string) => draftsOf(s, firmId).find((d) => d.incidentId === company)!;

describe("架空のデータ", () => {
  it("企業、事務所、弁護士、情報源はすべて架空（名前に（架空））で、URL は架空のドメイン", () => {
    for (const a of ARTICLES) expect(a.text).toContain("（架空）");
    for (const f of FIRMS) {
      expect(f.name).toContain("（架空）");
      for (const l of f.lawyers) expect(l.name + l.bar).toMatch(/（架空）.*（架空）/);
    }
    for (const a of ARTICLES) expect(new URL(a.url).hostname.endsWith(".example")).toBe(true);
  });
});

describe("収集と整理", () => {
  it("1回目の収集では、取得に失敗する情報源が1つある", () => {
    const r = fetchRun(1, []);
    expect(r.failed).toEqual(["n-kurashi"]);
    expect(r.fetched).not.toContain("a10");
  });
  it("重複の2組（ミドリ通販、東和精工）が1件にまとめられ、1回目で6件の事件になる", () => {
    const s = fresh();
    const incs = incidentsOf(s);
    expect(incs).toHaveLength(6);
    expect(incs.find((i) => i.company === "ミドリ通販")!.merged).toBe(1);
    expect(incs.find((i) => i.company === "東和精工")!.merged).toBe(1);
  });
  it("2回目の収集で8件になり、ミドリ通販は続報で「更新あり」、件数の変化も分かる", () => {
    const s = collect(fresh(), NOW);
    const incs = incidentsOf(s);
    expect(incs).toHaveLength(8);
    const m = incs.find((i) => i.company === "ミドリ通販")!;
    expect(m.updated).toBe(true);
    expect(m.change).toEqual({ from: "約12万件", to: "約18万件" });
    expect(incs.find((i) => i.company === "東和精工")!.updated).toBe(false);
  });
  it("公開中のページの事件に続報が来たら、その事務所に通知する（異常と重要な変更だけ通知）", () => {
    const s = collect(fresh(), NOW);
    expect(s.notices.some((n) => n.firmId === "firm-a" && n.title.includes("続報"))).toBe(true);
    expect(s.notices.some((n) => n.firmId === "firm-b" && n.title.includes("続報"))).toBe(false);
  });
  it("件数の取り出し", () => {
    expect(extractCount("約3,200件を保存した")).toBe("約3,200件");
    expect(cluster({ a1: 1, a2: 1 })).toHaveLength(1);
  });
});

describe("公開前のチェック（広告の確認）", () => {
  it("見本の下書き4件は、すべて通る", () => {
    for (const [company, body] of Object.entries(SAMPLE_DRAFTS)) {
      const r = checkDraft(body, firmA);
      expect(r.issues.filter((i) => i.stop), company).toEqual([]);
    }
  });
  it("「必ず全額取り戻せます」は断定的な表現として止める", () => {
    const r = checkDraft(PROBLEM_DRAFTS[0].body, firmA);
    expect(r.pass).toBe(false);
    expect(r.status.assertive).toBe("stop");
  });
  it("「日本一」は誇大な表現として止める", () => {
    expect(checkDraft(PROBLEM_DRAFTS[0].body, firmA).issues.some((i) => i.check === "hype" && i.match === "日本一")).toBe(true);
  });
  it("条件のない「無料」は誤認させる表現として止める。条件があれば通る", () => {
    expect(checkDraft(PROBLEM_DRAFTS[0].body, firmA).status.misleading).toBe("stop");
    const ok = { ...SAMPLE_DRAFTS["北斗旅行"], guidance: "初回のご相談は30分まで無料です。" };
    expect(checkDraft(ok, firmA).status.misleading).toBe("ok");
  });
  it("費用の条件が表示されないと止める", () => {
    expect(checkDraft(PROBLEM_DRAFTS[1].body, firmA).status.fee).toBe("stop");
    expect(checkDraft(SAMPLE_DRAFTS["北斗旅行"], { ...firmA, fee: "" }).status.fee).toBe("stop");
  });
  it("弁護士の所属の弁護士会がないと止める", () => {
    expect(checkDraft(SAMPLE_DRAFTS["北斗旅行"], { ...firmA, lawyers: [{ name: "山本 一郎（架空）", bar: "" }] }).status.lawyer).toBe("stop");
  });
  it("出典のない事実の文を止める", () => {
    const r = checkDraft(PROBLEM_DRAFTS[1].body, firmA);
    expect(r.issues.some((i) => i.check === "grounding" && i.factIndex === 1)).toBe(true);
  });
  it("出典にない数字（12万件を15万件に書き換え）を止める", () => {
    expect(groundFact("会員の情報約15万件が流出した可能性があると発表しました。", ["a1"])).toBeNull();
    expect(groundFact("会員の情報約12万件が流出した可能性があると発表しました。", ["a1"])).toBe("a1");
  });
  it("被害者の氏名と年齢（個人の情報）を止める", () => {
    expect(checkDraft(PROBLEM_DRAFTS[1].body, firmA).status.privacy).toBe("stop");
  });
  it("報道だけが出典なら、一次情報の注意を出す（止めはしない）", () => {
    const r = checkDraft(SAMPLE_DRAFTS["スマイル美容"], firmA);
    expect(r.status.primary).toBe("warn");
    expect(r.pass).toBe(true);
  });
  it("告知文の案も、表現と個人の情報をチェックする", () => {
    expect(checkText("被害は必ず回復できます")).toHaveLength(1);
    expect(checkText("ご相談はこちら")).toHaveLength(0);
  });
});

describe("承認と公開", () => {
  it("弁護士以外は承認できない", () => {
    const s = fresh();
    const d = draftOf(s, "firm-a", "北斗旅行");
    expect(approve(s, d.id, "u-a2", NOW).ok).toBe(false);
    const r = approve(s, d.id, "u-a1", NOW);
    expect(r.ok).toBe(true);
    const after = draftOf(r.state, "firm-a", "北斗旅行");
    expect(after.status).toBe("published");
    expect(after.published?.by).toBe("u-a1");
    expect(after.approvals.at(-1)).toMatchObject({ action: "approve", by: "u-a1", versionNo: 1 });
  });
  it("差し戻しには理由が必要", () => {
    const s = fresh();
    const d = draftOf(s, "firm-a", "北斗旅行");
    expect(reject(s, d.id, "u-a1", "  ", NOW).ok).toBe(false);
    const r = reject(s, d.id, "u-a1", "出典を追加してください", NOW);
    expect(draftOf(r.state, "firm-a", "北斗旅行").status).toBe("rejected");
  });
  it("チェックを通らない下書きは、承認を依頼できない", () => {
    let s = fresh();
    const d = draftOf(s, "firm-a", "青葉学習塾");
    s = saveDraft(s, d.id, { ...d.body, guidance: "当事務所が必ず解決します。" }, "u-a2", "", NOW).state;
    expect(requestApproval(s, d.id, "u-a2", NOW).ok).toBe(false);
  });
  it("公開後に事実の文を変えると「再承認が必要」になり、公開ページは前の版のまま", () => {
    let s = fresh();
    const d = draftOf(s, "firm-a", "ミドリ通販");
    const body = structuredClone(d.body);
    body.facts[0].text = body.facts[0].text.replace("約12万件", "約18万件");
    body.facts[0].sources = ["a1", "a3"];
    const r = saveDraft(s, d.id, body, "u-a2", "続報で件数を更新", NOW);
    expect(r.kind).toBe("major");
    s = r.state;
    const after = draftOf(s, "firm-a", "ミドリ通販");
    expect(after.status).toBe("needs_reapproval");
    expect(after.published?.body.facts[0].text).toContain("約12万件");
  });
  it("お知らせの文の誤字の修正は、再承認なしで訂正として反映する", () => {
    const s = fresh();
    const d = draftOf(s, "firm-a", "ミドリ通販");
    const r = saveDraft(s, d.id, { ...d.body, guidance: d.body.guidance.replace("ご注意ください", "ご注意下さい") }, "u-a2", "", NOW);
    expect(r.kind).toBe("minor");
    const after = draftOf(r.state, "firm-a", "ミドリ通販");
    expect(after.status).toBe("published");
    expect(after.corrections).toHaveLength(1);
    expect(changeKind(d.body, { ...d.body, title: "別の題名" })).toBe("major");
  });
  it("公開停止は弁護士だけ。停止すると公開の版がなくなる", () => {
    const s = fresh();
    const d = draftOf(s, "firm-a", "東和精工");
    expect(stop(s, d.id, "u-a2", "", NOW).ok).toBe(false);
    const r = stop(s, d.id, "u-a1", "依頼者の判断", NOW);
    expect(draftOf(r.state, "firm-a", "東和精工").published).toBeNull();
    expect(r.state.indexNow[0].action).toContain("削除");
  });
  it("承認の記録は追加だけ（前の記録を書き換えない）", () => {
    const s = fresh();
    const d = draftOf(s, "firm-a", "北斗旅行");
    const before = structuredClone(d.approvals);
    const after = draftOf(approve(s, d.id, "u-a1", NOW).state, "firm-a", "北斗旅行").approvals;
    expect(after.slice(0, before.length)).toEqual(before);
  });
});

describe("事務所ごとの分離", () => {
  it("事務所Aの利用者は、事務所Bの下書きを操作できない", () => {
    const s = fresh();
    const b = draftOf(s, "firm-b", "まちの電力");
    expect(requestApproval(s, b.id, "u-a2", NOW).ok).toBe(false);
    expect(saveDraft(s, b.id, { ...b.body, title: "x" }, "u-a2", "", NOW).kind).toBe("none");
    expect(draftsOf(s, "firm-a").every((d) => d.firmId === "firm-a")).toBe(true);
  });
  it("同じ事件でも、事務所ごとに別の下書きと公開ページになる", () => {
    const s = fresh();
    expect(draftOf(s, "firm-a", "北斗旅行").id).not.toBe(draftOf(s, "firm-b", "北斗旅行").id);
    expect(draftOf(s, "firm-a", "北斗旅行").status).toBe("pending");
    expect(draftOf(s, "firm-b", "北斗旅行").status).toBe("published");
  });
  it("下書きの作成は、その事務所の中だけに増える", () => {
    const s = createDraft(fresh(), "firm-b", "東和精工", "u-b2", NOW);
    expect(draftsOf(s, "firm-b").some((d) => d.incidentId === "東和精工")).toBe(true);
    expect(draftsOf(s, "firm-a").filter((d) => d.incidentId === "東和精工")).toHaveLength(1);
  });
});

describe("契約と運営", () => {
  it("契約の期限の30日前から通知する", () => {
    const s = fresh();
    expect(s.notices.some((n) => n.firmId === "firm-b" && n.title.startsWith("契約の期限"))).toBe(true);
    expect(s.notices.some((n) => n.firmId === "firm-a" && n.title.startsWith("契約の期限"))).toBe(false);
  });
  it("契約期間が過ぎると、事務所Bのページは自動で公開停止になり、事務所Aは影響を受けない", () => {
    const s = advanceDays(fresh(), 30, NOW);
    expect(settingsOf(s, "firm-b").active).toBe(false);
    expect(draftsOf(s, "firm-b").every((d) => d.published === null)).toBe(true);
    expect(draftOf(s, "firm-a", "ミドリ通販").published).not.toBeNull();
    expect(draftOf(s, "firm-b", "北斗旅行").approvals.at(-1)?.action).toBe("auto_stop");
  });
  it("AI の利用量（見積もり）を記録する", () => {
    expect(fresh().usage.length).toBeGreaterThan(0);
  });
  it("壊れた保存データは初期の状態として読む", () => {
    expect(parseState("{x", NOW).drafts.length).toBeGreaterThan(0);
  });
  it("事務所の設定を反映した表示用の情報", () => {
    expect(firmView(fresh(), "firm-b").name).toBe("みなと法律事務所（架空）");
  });
});

describe("他業種への転用", () => {
  it("業種の設定を替えるだけで、分類とチェックの言葉が変わる", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(INDUSTRIES.map((i) => i.categories.join())).size).toBe(INDUSTRIES.length);
  });
});

describe("出典の照合（複数の出典）", () => {
  it("第1報の日付と第2報の件数を合わせた文は、両方の出典を付ければ通る。片方だけなら止まる", () => {
    const text = "株式会社ミドリ通販（架空）は2026年9月28日、通販サイトが不正アクセスを受け、会員の情報約18万件が流出した可能性があると発表しました。";
    expect(groundFact(text, ["a1", "a3"])).not.toBeNull();
    expect(groundFact(text, ["a1"])).toBeNull();
  });
});
