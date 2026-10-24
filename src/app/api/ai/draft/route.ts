import { InputError, clientIp, liveDraft, parseInput, sameOrigin } from "@/lib/ai-server";

// その場で Claude（claude-sonnet-5-5）に下書きを作らせる。予算の上限は lib/budget.ts
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "このページからだけ呼べます。" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "この環境では AI を呼べません（事前に生成した結果をご覧ください）。" }, { status: 503 });
  try {
    const { articleIds, company, style } = parseInput(await req.json().catch(() => null));
    const r = await liveDraft(articleIds, company, style, clientIp(req.headers));
    return Response.json(r, { status: "error" in r ? 429 : 200 });
  } catch (e) {
    if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "生成に失敗しました。" }, { status: 500 });
  }
}
