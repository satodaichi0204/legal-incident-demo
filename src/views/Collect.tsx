"use client";
// 1. 収集：架空の情報源（企業の発表、ニュース）から記事を取り、事件にまとめる
import { AlertTriangle, CheckCircle2, Download, Newspaper, Rss } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, RoleBox, Stat } from "@/components/ui";
import { ARTICLES, SOURCES, articleById } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";
import { collect, incidentsOf, nowOf } from "@/lib/state";
import { useAppState } from "@/lib/store";

export default function Collect() {
  const [state, update] = useAppState();
  const [msg, setMsg] = useState("");
  const last = state.runs[state.runs.length - 1];
  const incidents = incidentsOf(state);
  const remaining = ARTICLES.length - Object.keys(state.arrived).length;
  const run = () => {
    let added = 0;
    update((s) => {
      const next = collect(s, nowOf(s, new Date()));
      added = next.runs[next.runs.length - 1].fetched;
      return next;
    });
    setMsg(added > 0 ? `${added}件の記事を取得し、事件にまとめました。` : "新しい記事はありませんでした。");
  };
  const fetchedNow = last ? Object.entries(state.arrived).filter(([, r]) => r === last.no).map(([id]) => articleById(id)) : [];

  return (
    <>
      <PageHeader no="収集" title="収集" lead="企業の公式の発表とニュース（どちらも架空）から、事件の情報を定期的に取得します。本番では毎日決まった時刻に自動で動き、異常（取得の失敗）と重要な変更（続報）だけを通知します。" photo={PHOTOS.newspaper}>
        <button className="btn btn-primary px-5 py-2.5" onClick={run} data-testid="run-collect">
          <Download size={16} />
          収集を実行（{state.runs.length + 1}回目）
        </button>
      </PageHeader>
      <RoleBox
        ai={["情報源を定期的に読み、記事の要約と分類（漏えい、サイバー攻撃、消費者被害）を行う", "同じ事件の記事を1つにまとめ（重複の排除）、続報を見つける", "取得の失敗など、異常だけを通知する"]}
        human={["情報源（どのサイトを読むか）を決める", "通知を見て、続報があった公開中のページを確かめる"]}
      />
      {msg && (
        <p className="rise mb-5 flex items-center gap-2 rounded-2xl border border-ok/30 bg-ok-soft p-3.5 text-sm font-bold text-ok" role="status" data-testid="collect-msg">
          <CheckCircle2 size={17} />
          {msg}
          <Link href="/admin/incidents" className="underline">
            事件の候補を見る
          </Link>
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="収集の回数" value={`${state.runs.length}回`} note={last ? `前回 ${new Date(last.at).toLocaleString("ja-JP")}` : ""} icon={<Rss size={16} />} />
        <Stat label="取得した記事" value={`${Object.keys(state.arrived).length}本`} note={remaining > 0 ? `まだ取得していない記事 ${remaining}本（デモ）` : "すべて取得済み"} icon={<Newspaper size={16} />} />
        <Stat label="事件の候補" value={`${incidents.length}件`} note={`重複でまとめた記事 ${incidents.reduce((a, i) => a + i.merged, 0)}本`} />
        <Stat label="続報があった事件" value={`${incidents.filter((i) => i.updated).length}件`} note="「更新あり」" />
      </div>

      <h2 className="h2">情報源（すべて架空）</h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SOURCES.map((s) => {
          const failed = last?.failed.includes(s.id);
          const count = Object.keys(state.arrived).filter((id) => articleById(id).sourceId === s.id).length;
          return (
            <div key={s.id} className={`card p-4 ${failed ? "border-human/40" : ""}`} data-testid={`source-${s.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`chip mb-1 ${s.kind === "press" ? "bg-ok-soft text-ok" : "bg-ai-soft text-ai"}`}>{s.kind === "press" ? "企業の公式の発表" : "ニュース"}</span>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs break-all text-mute">{s.url}</div>
                </div>
                {failed ? <AlertTriangle className="shrink-0 text-human" size={20} /> : <CheckCircle2 className="shrink-0 text-ok" size={20} />}
              </div>
              <div className={`mt-2 text-xs font-bold ${failed ? "text-human" : "text-sub"}`}>{failed ? "前回の取得に失敗（応答なし）。次の回で再試行します" : `取得した記事 ${count}本`}</div>
            </div>
          );
        })}
      </div>

      {fetchedNow.length > 0 && (
        <>
          <h2 className="h2">前回（{last.no}回目）に取得した記事</h2>
          <div className="card overflow-x-auto p-0">
            <table className="tbl min-w-[720px]">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>情報源</th>
                  <th>見出し</th>
                </tr>
              </thead>
              <tbody>
                {fetchedNow.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{a.date}</td>
                    <td className="text-xs">{SOURCES.find((x) => x.id === a.sourceId)?.name}</td>
                    <td className="font-medium">{a.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
