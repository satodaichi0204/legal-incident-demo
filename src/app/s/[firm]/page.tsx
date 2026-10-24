import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { FIRMS, firmBySlug } from "@/lib/data";
import { PublicIndex } from "@/views/PublicSite";

export function generateStaticParams() {
  return FIRMS.map((f) => ({ firm: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ firm: string }> }): Promise<Metadata> {
  const firm = firmBySlug((await params).firm);
  if (!firm) return {};
  return {
    title: { absolute: `事件情報｜${firm.name}` },
    description: `${firm.name}が、個人情報の漏えい、サイバー攻撃、消費者被害について、公表されている情報を出典つきで整理しています。`,
    alternates: { canonical: `/s/${firm.slug}` },
    openGraph: { type: "website", siteName: firm.name, title: `事件情報｜${firm.name}`, images: ["/photos/building.jpg"], locale: "ja_JP" },
  };
}

export default async function Page({ params }: { params: Promise<{ firm: string }> }) {
  const firm = firmBySlug((await params).firm);
  if (!firm) notFound();
  return (
    <ClientOnly>
      <PublicIndex firmId={firm.id} />
    </ClientOnly>
  );
}
