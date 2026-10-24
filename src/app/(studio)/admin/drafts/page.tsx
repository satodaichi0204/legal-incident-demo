import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { Drafts } from "@/views/Lists";

export const metadata: Metadata = { title: "下書きと編集" };

export default function Page() {
  return (
    <ClientOnly>
      <Drafts />
    </ClientOnly>
  );
}
