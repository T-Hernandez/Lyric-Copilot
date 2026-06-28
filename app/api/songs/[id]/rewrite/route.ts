import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { buildRewritePrompt } from "@/lib/llm/prompts/rewrite";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { selectedText, instruction } = await req.json() as {
    selectedText: string;
    instruction?: string;
  };

  if (!selectedText?.trim()) {
    return new Response(JSON.stringify({ error: "selectedText is required" }), { status: 400 });
  }

  const { data: song } = await sb
    .from("songs")
    .select("genre, mood")
    .eq("id", id)
    .single();

  const { systemPrompt, userPrompt } = buildRewritePrompt({
    selectedText,
    instruction,
    genre: song?.genre,
    mood: song?.mood,
  });

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({
          systemPrompt,
          userPrompt,
          userId: user.id,
          songId: id,
          callType: "rewrite",
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
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
