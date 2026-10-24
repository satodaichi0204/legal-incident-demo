import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import { Announce } from "@/views/Ops";

export const metadata: Metadata = { title: "告知文の案" };

export default function Page() {
  return (
    <ClientOnly>
      <Announce />
    </ClientOnly>
  );
}
