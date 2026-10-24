import { ArrowRight, Bell, FileText, Gavel, Globe, Newspaper, Scale, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RoleBox } from "@/components/ui";
import { ARTICLES, FIRMS, SOURCES } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";

const FLOW = [
  { title: "収集", text: "企業の公式の発表とニュースを定期的に取得。取得の失敗だけを通知", href: "/admin/collect", icon: Newspaper, photo: PHOTOS.newspaper },
  { title: "整理", text: "同じ事件の記事を1件にまとめ、続報は「更新あり」に。被害の件数の変化も見つける", href: "/admin/incidents", icon: FileText, photo: PHOTOS.matrix },
  { title: "出典つきの下書き", text: "事実の文に必ず出典。押すと元の文が見られる", href: "/admin/drafts", icon: Sparkles, photo: PHOTOS.notePc },
  { title: "公開前のチェック", text: "「必ず全額取り戻せます」「日本一」、費用の条件の記載なし、出典のない事実を止める", href: "/admin/check", icon: ShieldCheck, photo: PHOTOS.contract },
  { title: "弁護士の承認", text: "承認と公開停止は弁護士だけ。承認者、日時、版を記録", href: "/admin/approvals", icon: Gavel, photo: PHOTOS.gavel },
  { title: "事務所の公開ページ", text: "承認するとすぐ公開。SEO、OGP、構造化データ、サイトマップ、受付のボタン", href: "/admin/public", icon: Globe, photo: PHOTOS.building },
];

export default function Home() {
  return (
    <>
      <section className="rise relative mb-8 overflow-hidden rounded-[28px] bg-navy text-white shadow-lift">
        <div className="absolute inset-0">
          <Image src={PHOTOS.gavel.src} alt={PHOTOS.gavel.alt} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30" />
        </div>
        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold backdrop-blur">
              <Scale size={13} />
              法律事務所向け・デモ版（見本モード）
            </span>
            <h1 className="mt-4 text-[24px] leading-tight font-black tracking-wide sm:text-[32px] md:text-[40px]">
              事件の情報を、AIが集めて整理し、
              <br />
              <span className="bg-gradient-to-r from-[#e7c983] to-[#f3e2b5] bg-clip-text text-transparent">弁護士の承認で、事務所のページに。</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 md:text-base">
              個人情報の漏えい、サイバー攻撃、消費者被害の公開情報を AI が集めて整理し、出典つきの事件ページの下書きを作ります。広告の確認を通り、<b className="text-white">弁護士が承認したものだけ</b>が、事務所専用の公開ページに出ます。
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/admin/collect" className="btn btn-primary px-5 py-3 text-[15px]">
                最初から試す（収集から）
                <ArrowRight size={16} />
              </Link>
              <Link href="/admin/check" className="btn border-white/25 bg-white/10 px-5 py-3 text-[15px] text-white hover:bg-white/20">
                チェックで止まる例
              </Link>
              <Link href="/s/sakura" className="btn border-white/25 bg-white/10 px-5 py-3 text-[15px] text-white hover:bg-white/20">
                公開ページの見本
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
            <div className="font-bold">このデモで動かせること</div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [`${SOURCES.length}つ`, "情報源"],
                [`${ARTICLES.length}本`, "記事"],
                [`${FIRMS.length}事務所`, "データは分離"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 px-2 py-3">
                  <dt className="text-xl font-black">{v}</dt>
                  <dd className="text-[11px] text-white/65">{l}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 space-y-2 text-sm">
              {["重複のまとめと続報の検知", "出典のない事実は公開できない", "誇大・断定の表現を止める", "契約が切れたら自動で公開停止"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#22c55e] text-[11px] font-black text-white">✓</span>
                  {t}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#c9a35a] text-[11px] font-black text-white">弁</span>
                最終の判断は、必ず弁護士
              </li>
            </ul>
          </div>
        </div>
      </section>

      <RoleBox
        ai={["公開情報の収集、要約、分類、重複の排除、続報の検知", "出典つきの下書きと、告知文の案の作成", "広告の確認、通知、契約の期限の管理"]}
        human={["事件ページの内容と出典の確認、編集（事務員・弁護士）", "公開の承認、差し戻し、公開停止（弁護士だけ）", "費用の条件など、事務所の情報の決定"]}
      />

      <h2 className="h2">事件ページができるまで</h2>
      <ol className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FLOW.map((f, i) => {
          const Icon = f.icon;
          return (
            <li key={f.href}>
              <Link href={f.href} className="group block h-full overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative h-32">
                  <Image src={f.photo.src} alt={f.photo.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2.5 left-4 flex items-center gap-2 text-white">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 backdrop-blur">
                      <Icon size={16} />
                    </span>
                    <span className="text-lg font-black">
                      {i + 1}. {f.title}
                    </span>
                  </div>
                </div>
                <p className="p-4 text-[13px] leading-relaxed text-sub">{f.text}</p>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Bell, title: "運営を半自動に", text: "定期の収集、重複のまとめ、異常だけの通知、契約の期限の通知と自動の公開停止、AI の利用量の上限。", href: "/admin/ops" },
          { icon: Scale, title: "他業種へ転用しやすい設計", text: "業種の設定を1か所にまとめ、分類、チェックの規則、ページの言葉を差し替えるだけで転用できる作り。", href: "/design" },
          { icon: ShieldCheck, title: "守っていること", text: "企業、事件、事務所はすべて架空。実在のサイトにはアクセスしない。被害者の情報は扱わず、受付は外部のフォームへのリンクだけ。", href: "/design" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.title} href={c.href} className="card block transition hover:shadow-lift">
              <Icon className="mb-2 text-ai" size={22} />
              <div className="font-bold">{c.title}</div>
              <p className="mt-1 text-sm text-sub">{c.text}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
