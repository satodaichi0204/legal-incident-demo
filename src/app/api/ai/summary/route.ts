import { InputError, clientIp, liveSummary, parseInput, sameOrigin } from "@/lib/ai-server";

// その場で Claude（claude-haiku-5-5）に事件の概要と分類を作らせる。予算の上限は lib/budget.ts
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "このページからだけ呼べます。" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "この環境では AI を呼べません（事前に生成した結果をご覧ください）。" }, { status: 503 });
  try {
    const { articleIds, company } = parseInput(await req.json().catch(() => null));
    const r = await liveSummary(articleIds, company, clientIp(req.headers));
    if ("error" in r) return Response.json(r, { status: 429 });
    return Response.json({ summary: r.value, usage: r.usage, ms: r.ms });
  } catch (e) {
    if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "生成に失敗しました。" }, { status: 500 });
  }
}
