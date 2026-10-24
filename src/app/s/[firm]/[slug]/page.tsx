import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { ARTICLES, CATEGORY_LABEL, FIRMS, SAMPLE_DRAFTS, SLUG, firmBySlug } from "@/lib/data";
import { INCIDENT_PHOTO } from "@/lib/photos";
import { PublicIncident } from "@/views/PublicSite";

// 公開ページの SEO（タイトル、説明文、OGP、構造化データ）。
// デモではデータがブラウザの中にあるため、ページの情報は事件のデータから作る（本番はデータベースの承認済みの版から作る）
const companyOf = (slug: string) => Object.entries(SLUG).find(([, s]) => s === slug)?.[0];
const infoOf = (company: string) => {
  const arts = ARTICLES.filter((a) => a.company === company).sort((a, b) => a.date.localeCompare(b.date));
  const title = SAMPLE_DRAFTS[company]?.title ?? `${company}（架空）に関する公表について`;
  return { title, description: arts[0].text.split("。")[0] + "。", first: arts[0], last: arts[arts.length - 1] };
};

export function generateStaticParams() {
  return FIRMS.flatMap((f) => Object.values(SLUG).map((slug) => ({ firm: f.slug, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ firm: string; slug: string }> }): Promise<Metadata> {
  const p = await params;
  const firm = firmBySlug(p.firm);
  const company = companyOf(p.slug);
  if (!firm || !company) return {};
  const info = infoOf(company);
  return {
    title: { absolute: `${info.title}｜${firm.name}` },
    description: info.description,
    alternates: { canonical: `/s/${firm.slug}/${p.slug}` },
    openGraph: { type: "article", siteName: firm.name, title: info.title, description: info.description, images: [INCIDENT_PHOTO[company].src], locale: "ja_JP", publishedTime: info.first.date, modifiedTime: info.last.date },
    twitter: { card: "summary_large_image", title: info.title, description: info.description },
  };
}

export default async function Page({ params }: { params: Promise<{ firm: string; slug: string }> }) {
  const p = await params;
  const firm = firmBySlug(p.firm);
  const company = companyOf(p.slug);
  if (!firm || !company) notFound();
  const info = infoOf(company);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: info.title,
    description: info.description,
    datePublished: info.first.date,
    dateModified: info.last.date,
    articleSection: CATEGORY_LABEL[info.first.category],
    image: [INCIDENT_PHOTO[company].src],
    author: { "@type": "LegalService", name: firm.name, address: firm.address },
    publisher: { "@type": "LegalService", name: firm.name },
    citation: ARTICLES.filter((a) => a.company === company).map((a) => a.url),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ClientOnly>
        <PublicIncident firmId={firm.id} slug={p.slug} />
      </ClientOnly>
    </>
  );
}
