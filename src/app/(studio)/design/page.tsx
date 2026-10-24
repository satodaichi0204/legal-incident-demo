import type { Metadata } from "next";
import { Bell, Bot, Database, FileCode2, Gavel, KeyRound, Layers, Lock, Settings2, ShieldCheck } from "lucide-react";
import { PageHeader, RoleBox } from "@/components/ui";
import { INDUSTRIES } from "@/lib/industry";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = { title: "設計の説明" };

const COMMON = [
  { icon: Bot, name: "AI の処理", text: "要約、分類、重複の判定、下書き、告知文。出力は決まった形（JSON）で受け取り、出典の照合とチェックを必ず通す" },
  { icon: FileCode2, name: "ページの生成", text: "共通のテンプレート、SEO（メタデータ、OGP、構造化データ、サイトマップ、IndexNow）" },
  { icon: Settings2, name: "事業者ごとの設定", text: "事業者名、責任者、費用の条件、受付の URL、公開先のドメイン、ページ枠、契約期間、AI の上限" },
  { icon: KeyRound, name: "認証と権限", text: "事業者ごとに分離。役割（承認者、編集者）で操作を分ける" },
  { icon: Gavel, name: "承認と版", text: "承認の依頼、承認、差し戻し、公開停止、再承認。承認の記録は追加だけ" },
  { icon: Bell, name: "通知と運営", text: "異常と重要な変更だけの通知、契約の期限と自動の公開停止、バックアップ" },
];

export default function Design() {
  return (
    <>
      <PageHeader no="全体" title="設計の説明（他業種への転用）" lead="共通の部品と、業種ごとに替える部分を分けています。このデモで動いている「法律事務所」の設定を、別の業種の設定に差し替えるだけで転用できます。" photo={PHOTOS.meetingRoom} />
      <RoleBox ai={["共通の部品は、どの業種でも同じ動きをする"]} human={["業種ごとに、分類、チェックの規則、必ず載せる情報、承認する人を決める"]} />

      <section className="card mb-6">
        <h2 className="h2 text-base">
          <Layers size={18} className="text-ai" />
          共通の部品（どの業種でも使い回す）
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {COMMON.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.name} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2 font-bold">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-ai-soft text-ai">
                    <Icon size={16} />
                  </span>
                  {c.name}
                </div>
                <p className="mt-1 text-[13px] text-sub">{c.text}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-sub">コードでは、チェック（src/lib/check.ts）、収集と重複の判定（collect.ts）、状態の移り変わり（state.ts）を、画面から切り離した部品にしています。</p>
      </section>

      <h2 className="h2">業種ごとに替える部分（業種の設定）</h2>
      <div className="mb-8 grid gap-4 lg:grid-cols-3" data-testid="industries">
        {INDUSTRIES.map((i) => (
          <section key={i.id} className={`card ${i.active ? "ring-4 ring-ai/20" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-black">{i.name}</h3>
              {i.active ? <span className="chip bg-ai text-white">このデモ</span> : <span className="chip bg-paper text-sub">転用の例</span>}
            </div>
            <dl className="space-y-2 text-[13px]">
              <div>
                <dt className="font-bold text-sub">承認する人</dt>
                <dd>{i.approver}</dd>
              </div>
              <div>
                <dt className="font-bold text-sub">分類</dt>
                <dd>{i.categories.join("、")}</dd>
              </div>
              <div>
                <dt className="font-bold text-sub">情報源</dt>
                <dd>{i.sources.join("、")}</dd>
              </div>
              <div>
                <dt className="font-bold text-sub">チェックの規則</dt>
                <dd>{i.checks.join("、")}</dd>
              </div>
              <div>
                <dt className="font-bold text-sub">必ず載せる情報</dt>
                <dd>{i.required.join("、")}</dd>
              </div>
              <div>
                <dt className="font-bold text-sub">ページの言葉</dt>
                <dd>{i.pageWords}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 text-base">
            <Lock size={18} className="text-human" />
            セキュリティの対策
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>通信はすべて HTTPS。管理画面はログインが必要</li>
            <li>事務所ごとの分離：本番は Supabase の行の単位の権限（RLS）で、ほかの事務所のデータをデータベースの段階で読めなくする（デモは画面と処理の両方で分離し、テストで確認）</li>
            <li>承認と公開停止は弁護士の役割だけ。承認の記録は追加だけで、書き換えない（改ざんの防止）</li>
            <li>AI の API キーはサーバー側の環境変数だけ。ブラウザには出さない。AI の利用量に上限</li>
            <li>入力の無害化（画面の表示はすべてエスケープ。構造化データは &lt; を置き換え）</li>
            <li>被害者の氏名、連絡先、相談内容は扱わない（受付は事務所の外部のフォーム）。個人を特定できる情報は公開前のチェックで止める</li>
            <li>毎日のバックアップと、障害の自動の通知</li>
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 text-base">
            <Database size={18} className="text-ai" />
            本番の構成（想定）と、作らないもの
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Next.js（Vercel）、Supabase（認証、データベース、RLS）、定期の収集はスケジュールの仕組み（Vercel Cron など）</li>
            <li>AI：要約、分類、重複の判定は claude-haiku-5-5、下書きと告知文は claude-sonnet-5-5（費用は運営の画面で見積もり）</li>
            <li>公開先：事務所ごとのサブドメインか独自ドメイン（Vercel のドメインの設定）</li>
          </ul>
          <div className="mt-3 rounded-xl bg-human-soft p-3 text-sm">
            <div className="flex items-center gap-1 font-bold text-human">
              <ShieldCheck size={15} />
              作らないもの（ご依頼の範囲外）
            </div>
            法律事務所の比較・紹介・依頼者の割り当て、成果に連動する料金、AI による法的な評価・勝訴の見込み・賠償額の算定、広告の適法性の保証。
          </div>
        </section>
      </div>
    </>
  );
}
