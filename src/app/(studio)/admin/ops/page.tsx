import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { OpsPage } from "@/views/Ops";

export const metadata: Metadata = { title: "運営" };

export default function Page() {
  return (
    <ClientOnly>
      <OpsPage />
    </ClientOnly>
  );
}
