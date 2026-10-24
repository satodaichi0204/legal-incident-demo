import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { PublicPages } from "@/views/Lists";

export const metadata: Metadata = { title: "事務所の公開ページ" };

export default function Page() {
  return (
    <ClientOnly>
      <PublicPages />
    </ClientOnly>
  );
}
