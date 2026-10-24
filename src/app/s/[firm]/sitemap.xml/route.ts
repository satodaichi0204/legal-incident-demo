import { FIRMS, SLUG, firmBySlug } from "@/lib/data";
import { initialState, draftsOf } from "@/lib/state";

// 事務所ごとのサイトマップ。デモでは初期の状態で公開中のページを出す（本番はデータベースの公開中のページから作る）
export function generateStaticParams() {
  return FIRMS.map((f) => ({ firm: f.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ firm: string }> }) {
  const firm = firmBySlug((await params).firm);
  if (!firm) return new Response("Not found", { status: 404 });
  const s = initialState(new Date());
  const base = `https://${firm.domain}`;
  const urls = [
    `<url><loc>${base}/</loc></url>`,
    ...draftsOf(s, firm.id)
      .filter((d) => d.published)
      .map((d) => `<url><loc>${base}/${SLUG[d.incidentId]}</loc><lastmod>${d.published!.at.slice(0, 10)}</lastmod></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
