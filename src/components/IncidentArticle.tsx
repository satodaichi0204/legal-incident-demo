// 事件ページの本文（公開ページと、管理画面のプレビューで同じものを使う＝共通のテンプレート）
import { CalendarDays, ExternalLink, Scale } from "lucide-react";
import { articleById, sourceById, type DraftBody, type Firm } from "@/lib/data";
import type { Incident } from "@/lib/collect";

const fmt = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${y}年${Number(m)}月${Number(dd)}日`;
};

export default function IncidentArticle({ body, incident, firm, corrections = [], publishedAt }: { body: DraftBody; incident: Incident; firm: Firm; corrections?: { at: string; note: string }[]; publishedAt?: string }) {
  const sourceIds = [...new Set(body.facts.flatMap((f) => f.sources))];
  const n = (id: string) => sourceIds.indexOf(id) + 1;
  const timeline = incident.articleIds.map(articleById).filter((a) => sourceIds.includes(a.id) || true);
  return (
    <article className="space-y-6" data-testid="incident-article">
      <div>
        <h1 className="text-2xl leading-snug font-black md:text-3xl">{body.title}</h1>
        {publishedAt && <div className="mt-1 text-xs text-sub">公開 {fmt(publishedAt)}　{corrections.length > 0 && `更新 ${fmt(corrections[corrections.length - 1].at)}`}</div>}
      </div>
      <section>
        <h2 className="mb-2 text-lg font-bold">事件の概要</h2>
        <div className="space-y-2 leading-8">
          {body.facts.map((f, i) => (
            <p key={i}>
              {f.text}
              {f.sources.map((s) => (
                <a key={s} href={`#src-${n(s)}`} className="ml-0.5 align-super text-[10px] font-bold text-ai">
                  [{n(s)}]
                </a>
              ))}
            </p>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <CalendarDays size={18} />
          時系列
        </h2>
        <ol className="space-y-2 border-l-2 border-line pl-4">
          {timeline.map((a) => (
            <li key={a.id} className="relative text-sm">
              <span className="absolute top-2 -left-[21px] h-2.5 w-2.5 rounded-full bg-ai" />
              <span className="font-bold">{fmt(a.date)}</span>　{a.title}
              <span className="text-xs text-sub">（{sourceById(a.sourceId).name}）</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-2xl bg-ai-soft p-5">
        <h2 className="mb-2 text-lg font-bold">この事件でお困りの方へ</h2>
        <p className="leading-7">{body.guidance}</p>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5" data-testid="firm-block">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Scale size={18} className="text-found" />
          掲載している法律事務所
        </h2>
        {body.showLawyer && (
          <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-sub">事務所</dt>
            <dd className="font-bold">
              {firm.name}　<span className="font-normal text-sub">{firm.address}</span>
            </dd>
            <dt className="text-sub">弁護士</dt>
            <dd>
              {firm.lawyers.map((l) => (
                <div key={l.name}>
                  {l.name}（{l.bar}所属）
                </div>
              ))}
            </dd>
          </dl>
        )}
        {body.showFee && (
          <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
            <div className="mb-1 font-bold">費用の条件</div>
            {firm.fee}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold">出典（一次情報と報道）</h2>
        <ol className="space-y-1.5 text-sm">
          {sourceIds.map((id, i) => {
            const a = articleById(id);
            const src = sourceById(a.sourceId);
            return (
              <li key={id} id={`src-${i + 1}`} className="flex gap-2">
                <span className="font-bold text-ai">[{i + 1}]</span>
                <span>
                  <span className={`chip mr-1 ${src.kind === "press" ? "bg-ok-soft text-ok" : "bg-paper text-sub"}`}>{src.kind === "press" ? "公式の発表" : "報道"}</span>
                  {src.name}「{a.title}」（{fmt(a.date)}）
                  <span className="ml-1 inline-flex items-center gap-0.5 text-xs break-all text-ai">
                    <ExternalLink size={11} />
                    {a.url}（架空のURL）
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
      {corrections.length > 0 && (
        <section data-testid="corrections">
          <h2 className="mb-2 text-lg font-bold">訂正・更新の履歴</h2>
          <ul className="space-y-1 text-sm">
            {corrections.map((c, i) => (
              <li key={i}>
                {fmt(c.at)}　{c.note}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="rounded-xl bg-paper p-3 text-xs leading-relaxed text-sub">
        このページは、公開されている情報をもとに事件の概要を整理したもので、法的な評価や、結果を約束するものではありません。個別の事情については、弁護士にご相談ください。
      </p>
    </article>
  );
}
