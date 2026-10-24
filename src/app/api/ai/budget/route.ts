import { budget } from "@/lib/budget";

// 公開デモの AI の予算の残りと、最近の呼び出しの記録（費用の実測）
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await budget(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "予算の記録を読めませんでした。" }, { status: 500 });
  }
}
