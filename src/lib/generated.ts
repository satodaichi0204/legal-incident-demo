// Claude API で事前に生成した結果（scripts/pregenerate.ts が作る data/generated.json）。
// 公開したデモは API を呼ばず、この JSON を表示するだけ（キーが公開側に出ない、他人に使われて費用がかかることもない）。
import raw from "../../data/generated.json";
import type { Category, DraftBody } from "./data";

export type GenUsage = { model: string; inTok: number; outTok: number; usd: number };
export type GenAnnounce = { x: string; line: string; hp: string };
export type GenItem = {
  key: string;
  company: string;
  articleIds: string[];
  summary?: { text: string; category: Category } & GenUsage;
  draft?: { title: string; facts: { text: string; sources: string[] }[]; guidance: string; announce: GenAnnounce; attempts: number; retryReason?: string[] } & GenUsage;
  /** 出典の照合か公開前のチェックで止まった点（見本モードの方法に戻した） */
  failed?: string[];
};
export type Generated = { generatedAt: string; models: { summary: string; draft: string }; yenPerUsd: number; totalUsd: number; inputArticles: number; items: GenItem[] };

export const GENERATED = raw as Generated;

/** 事件の記事の組み合わせ（例：a1+a2+a3）ごとの生成の結果 */
export const genFor = (articleIds: string[]): GenItem | undefined => GENERATED.items.find((i) => i.key === articleIds.join("+"));

/** 生成した下書き（出典の照合と公開前のチェックに合格したものだけ） */
export function genDraft(articleIds: string[]): { body: DraftBody; usage: GenUsage } | null {
  const d = genFor(articleIds)?.draft;
  if (!d) return null;
  return {
    body: { title: d.title, facts: d.facts.map((f) => ({ text: f.text, sources: [...f.sources] })), guidance: d.guidance, showLawyer: true, showFee: true },
    usage: { model: d.model, inTok: d.inTok, outTok: d.outTok, usd: d.usd },
  };
}

/** 告知文の案（題名が生成した時のままのときだけ使う。直した後は、ひな形に戻す） */
export function genAnnounce(company: string, title: string, firmName: string, url: string): GenAnnounce | null {
  const d = GENERATED.items.findLast((i) => i.company === company && i.draft?.title === title)?.draft;
  if (!d) return null;
  const fill = (s: string) => s.split("{URL}").join(url).split("{FIRM}").join(firmName);
  return { x: fill(d.announce.x), line: fill(d.announce.line), hp: fill(d.announce.hp) };
}
