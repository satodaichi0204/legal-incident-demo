// 公開前のチェック（広告の確認）。確認を助けるもので、広告の適法性を保証するものではない。最終の判断は弁護士が行う
import { articleById, sourceById, type DraftBody, type Firm } from "./data";

export type CheckId = "assertive" | "hype" | "misleading" | "lawyer" | "fee" | "grounding" | "primary" | "privacy";
export const CHECKS: { id: CheckId; label: string; detail: string; stop: boolean }[] = [
  { id: "assertive", label: "断定的な表現", detail: "「必ず」「確実に」「全額取り戻せる」など、結果を約束する表現", stop: true },
  { id: "hype", label: "誇大な表現", detail: "「日本一」「No.1」「唯一」など、根拠のない最上級の表現", stop: true },
  { id: "misleading", label: "誤認させる表現", detail: "「無料」と書いて条件を書いていない、など", stop: true },
  { id: "lawyer", label: "弁護士の情報", detail: "事務所名、弁護士の氏名、所属の弁護士会の記載", stop: true },
  { id: "fee", label: "費用の条件", detail: "費用の条件の記載", stop: true },
  { id: "grounding", label: "事実の根拠", detail: "事件についての事実の文に、出典が結び付いているか", stop: true },
  { id: "primary", label: "一次情報へのリンク", detail: "企業の公式の発表などへのリンクがあるか", stop: false },
  { id: "privacy", label: "個人の情報", detail: "被害者や個人を特定できる情報がないか", stop: true },
];
export const CHECK_NOTICE = "このチェックは確認を助けるもので、広告の適法性を保証するものではありません。最終の判断は弁護士が行います。";

export type Issue = { check: CheckId; stop: boolean; message: string; match?: string; factIndex?: number };
export type CheckResult = { pass: boolean; score: number; issues: Issue[]; status: Record<CheckId, "ok" | "warn" | "stop">; grounded: (string | null)[] };

const ASSERTIVE = /必ず|確実に|絶対(に)?|全額(を)?(取り戻|返金|回収)|間違いなく|勝訴(でき|確実|します)|100[%％]/g;
const HYPE = /日本一|No\.?\s?1|ナンバーワン|業界(初|最大|最高|トップ)|唯一の?|最高の|圧倒的|地域一番/g;
const PRIVATE = /[一-龥ぁ-んァ-ヶ]{1,4}(様|さん|氏)（\d{1,3}）|\d{2,4}-\d{2,4}-\d{3,4}|[\w.+-]+@[\w-]+\.[\w.]+/g;

const bigrams = (s: string) => {
  const t = s.replace(/[\s、。・（）()「」『』：:]/g, "");
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
};
const BOILER = ["と発表しました", "と報じられています", "としています", "によると", "しました", "しています", "同社は", "同社"];

/** 文の言葉が、出典の文にどれだけ含まれているか（0〜1） */
export function containment(sentence: string, source: string): number {
  let s = sentence;
  for (const b of BOILER) s = s.split(b).join("、");
  const grams = bigrams(s);
  if (grams.length === 0) return 1;
  const src = new Set(bigrams(source));
  return grams.filter((g) => src.has(g)).length / grams.length;
}
const numbers = (s: string) => s.normalize("NFKC").replace(/,/g, "").match(/\d+/g) ?? [];

/**
 * 事実の文が、付けた出典に裏付けられるか（数字はすべて、付けた出典のどれかにそのままあり、言葉の半分以上が出典と重なる）。
 * 第1報の日付と第2報の件数のように、複数の出典を合わせた文も認める
 */
export function groundFact(text: string, sourceIds: string[]): string | null {
  const texts = sourceIds.map((id) => articleById(id)?.text).filter((x): x is string => !!x);
  if (texts.length === 0) return null;
  // 記事の日付（報じた日・発表した日）も出典の一部として数える
  const dates = sourceIds.flatMap((id) => articleById(id)?.date.split("-").map((p) => String(Number(p))) ?? []);
  const srcNums = new Set([...texts.flatMap(numbers), ...dates]);
  if (!numbers(text).every((n) => srcNums.has(n))) return null;
  return containment(text, texts.join("")) >= 0.5 ? sourceIds[0] : null;
}

export function checkDraft(body: DraftBody, firm: Firm): CheckResult {
  const issues: Issue[] = [];
  const allText = [body.title, ...body.facts.map((f) => f.text), body.guidance].join("\n");
  for (const m of new Set(allText.match(ASSERTIVE) ?? [])) issues.push({ check: "assertive", stop: true, message: `「${m}」は結果を約束する表現です。`, match: m });
  for (const m of new Set(allText.match(HYPE) ?? [])) issues.push({ check: "hype", stop: true, message: `「${m}」は根拠のない最上級の表現です。`, match: m });
  const free = /無料/.exec(body.guidance);
  if (free && !/無料(は|です)?[^。]{0,20}(初回|まで|分|回|条件|場合)|(初回|分まで|回まで)[^。]{0,10}無料/.test(body.guidance)) {
    issues.push({ check: "misleading", stop: true, message: "「無料」の条件（初回だけ、時間など）が書かれていません。", match: "無料" });
  }
  if (!body.showLawyer || firm.lawyers.length === 0 || firm.lawyers.some((l) => !l.name.trim() || !l.bar.trim()) || !firm.name.trim()) {
    issues.push({ check: "lawyer", stop: true, message: "事務所名、弁護士の氏名、所属の弁護士会が表示されません。" });
  }
  if (!body.showFee || !firm.fee.trim()) issues.push({ check: "fee", stop: true, message: "費用の条件が表示されません。" });
  const grounded = body.facts.map((f, i) => {
    if (f.sources.length === 0) {
      issues.push({ check: "grounding", stop: true, message: "出典のない事実の文です。出典を付けるか、文を消してください。", match: f.text, factIndex: i });
      return null;
    }
    const g = groundFact(f.text, f.sources);
    if (!g) issues.push({ check: "grounding", stop: true, message: "付けた出典に、この文の内容（数字や言葉）が見つかりません。", match: f.text, factIndex: i });
    return g;
  });
  if (!body.facts.some((f) => f.sources.some((s) => sourceById(articleById(s)?.sourceId)?.kind === "press"))) {
    issues.push({ check: "primary", stop: false, message: "企業の公式の発表（一次情報）へのリンクがありません。報道だけが出典です。" });
  }
  for (const m of new Set(allText.match(PRIVATE) ?? [])) issues.push({ check: "privacy", stop: true, message: `「${m}」は個人を特定できる情報です。`, match: m });

  const status = Object.fromEntries(CHECKS.map((c) => [c.id, "ok"])) as CheckResult["status"];
  for (const i of issues) status[i.check] = i.stop ? "stop" : status[i.check] === "stop" ? "stop" : "warn";
  const stops = issues.filter((i) => i.stop).length;
  return { pass: stops === 0, score: Math.max(0, 100 - stops * 20 - (issues.length - stops) * 5), issues, status, grounded };
}

/** 告知文の案のチェック（表現と個人の情報だけ） */
export function checkText(text: string): Issue[] {
  const out: Issue[] = [];
  for (const m of new Set(text.match(ASSERTIVE) ?? [])) out.push({ check: "assertive", stop: true, message: `「${m}」は結果を約束する表現です。`, match: m });
  for (const m of new Set(text.match(HYPE) ?? [])) out.push({ check: "hype", stop: true, message: `「${m}」は根拠のない最上級の表現です。`, match: m });
  for (const m of new Set(text.match(PRIVATE) ?? [])) out.push({ check: "privacy", stop: true, message: `「${m}」は個人を特定できる情報です。`, match: m });
  return out;
}
