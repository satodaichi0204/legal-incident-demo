import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { SettingsPage } from "@/views/Ops";

export const metadata: Metadata = { title: "事務所の設定" };

export default function Page() {
  return (
    <ClientOnly>
      <SettingsPage />
    </ClientOnly>
  );
}
