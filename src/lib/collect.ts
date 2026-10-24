// 収集と整理：情報源から記事を取り、同じ事件の記事を1つにまとめ（重複の排除）、続報を見つける
import { ARTICLES, SLUG, SOURCES, articleById, type Article, type Category } from "./data";

export type RunResult = { run: number; fetched: string[]; failed: string[] };

/** その回の収集で取れる記事と、取得に失敗した情報源（デモ：実在のサイトにはアクセスしない） */
export function fetchRun(run: number, known: string[]): RunResult {
  const failed = SOURCES.filter((s) => s.failsOnRun === run).map((s) => s.id);
  const fetched = ARTICLES.filter((a) => a.availableFromRun <= run && !failed.includes(a.sourceId) && !known.includes(a.id)).map((a) => a.id);
  return { run, fetched, failed };
}

export type Incident = {
  id: string;
  company: string;
  slug: string;
  category: Category;
  articleIds: string[];
  firstDate: string;
  lastDate: string;
  /** 同じ事件として1つにまとめた記事の数（最初の1本を除く） */
  merged: number;
  /** 続報（あとの回の収集で届いた記事）があるか */
  updated: boolean;
  /** 続報で変わった数（例：約12万件 → 約18万件） */
  change: { from: string; to: string } | null;
};

/** 本文から被害の規模の数（約12万件、約450人分など）を取り出す */
export function extractCount(text: string): string | null {
  const m = text.match(/約[\d,]+(?:万)?(?:件|人)/);
  return m ? m[0] : null;
}

/** 重複の判定：同じ企業、同じ分類で、30日以内の記事は同じ事件 */
export function sameIncident(a: Article, b: Article): boolean {
  const days = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / 86_400_000;
  return a.company === b.company && a.category === b.category && days <= 30;
}

/**
 * 記事を事件にまとめる
 * @param arrived 記事ID → 届いた回
 */
export function cluster(arrived: Record<string, number>): Incident[] {
  const articles = Object.keys(arrived).map(articleById).sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
  const groups: Article[][] = [];
  for (const a of articles) {
    const g = groups.find((gr) => sameIncident(gr[0], a) || sameIncident(gr[gr.length - 1], a));
    if (g) g.push(a);
    else groups.push([a]);
  }
  return groups
    .map((g) => {
      const firstRun = Math.min(...g.map((a) => arrived[a.id]));
      const followUps = g.filter((a) => arrived[a.id] > firstRun);
      const firstCount = extractCount(g[0].text);
      const lastCount = extractCount(g[g.length - 1].text);
      return {
        id: g[0].company,
        company: g[0].company,
        slug: SLUG[g[0].company],
        category: g[0].category,
        articleIds: g.map((a) => a.id),
        firstDate: g[0].date,
        lastDate: g[g.length - 1].date,
        merged: g.length - 1 - followUps.length,
        updated: followUps.length > 0,
        change: followUps.length > 0 && firstCount && lastCount && firstCount !== lastCount ? { from: firstCount, to: lastCount } : null,
      };
    })
    .sort((x, y) => y.lastDate.localeCompare(x.lastDate));
}

/** AI の概要（見本モード：最初の記事の1文目を短く。本番は AI で要約） */
export function summaryOf(inc: Incident): string {
  const latest = articleById(inc.articleIds[inc.articleIds.length - 1]);
  return latest.text.split("。")[0] + "。";
}
