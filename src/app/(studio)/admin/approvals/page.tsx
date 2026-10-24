import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { Approvals } from "@/views/Lists";

export const metadata: Metadata = { title: "弁護士の承認" };

export default function Page() {
  return (
    <ClientOnly>
      <Approvals />
    </ClientOnly>
  );
}
