import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import View from "@/views/Incidents";

export const metadata: Metadata = { title: "事件の候補" };

export default function Page() {
  return (
    <ClientOnly>
      <View />
    </ClientOnly>
  );
}
