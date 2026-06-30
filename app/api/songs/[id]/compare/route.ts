import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { SYSTEM_PROMPT, buildComparePrompt } from "@/lib/llm/prompts/compare";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { versionA, versionB, labels } = await req.json() as {
    versionA: string;
    versionB: string;
    labels: { a: string; b: string };
  };

  if (!versionA?.trim() || !versionB?.trim()) {
    return new Response(JSON.stringify({ error: "Both versions are required" }), { status: 400 });
  }

  const userPrompt = buildComparePrompt(versionA, versionB, labels ?? { a: "Versión anterior", b: "Versión actual" });
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
          userId: user.id,
          songId: id,
          callType: "review",
        })) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
