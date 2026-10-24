import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import View from "@/views/Collect";

export const metadata: Metadata = { title: "収集" };

export default function Page() {
  return (
    <ClientOnly>
      <View />
    </ClientOnly>
  );
}
