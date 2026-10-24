import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://legal-incident-demo.vercel.app"),
  title: { default: "事件情報AI（法律事務所向け・デモ）", template: "%s｜事件情報AI（デモ）" },
  description: "AI が公開情報を集めて整理し、出典つきの事件ページの下書きを作り、弁護士が承認すると事務所の公開ページに出る仕組みのデモ。データはすべて架空。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
