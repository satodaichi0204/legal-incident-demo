import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { CheckExamples } from "@/views/Lists";

export const metadata: Metadata = { title: "公開前のチェック" };

export default function Page() {
  return (
    <ClientOnly>
      <CheckExamples />
    </ClientOnly>
  );
}
