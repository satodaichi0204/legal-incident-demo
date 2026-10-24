import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import View from "@/views/DraftEditor";

export const metadata: Metadata = { title: "下書きの編集" };

export default function Page() {
  return (
    <ClientOnly>
      <View />
    </ClientOnly>
  );
}
