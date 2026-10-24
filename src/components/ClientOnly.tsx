"use client";
// 画面の中身は、ブラウザに保存した状態で決まるため、ブラウザの中でだけ描く
import { Suspense, useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

export default function ClientOnly({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <div className="py-16 text-center text-sm text-sub">読み込んでいます…</div>;
  return <Suspense fallback={<div className="py-16 text-center text-sm text-sub">読み込んでいます…</div>}>{children}</Suspense>;
}
