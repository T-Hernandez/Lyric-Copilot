import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { buildRewritePrompt } from "@/lib/llm/prompts/rewrite";
import { checkRateLimit } from "@/lib/llm/rateLimit";

const RewriteBodySchema = z.object({
  selectedText: z.string().min(1).max(5000),
  instruction: z.string().max(500).optional(),
});

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = RewriteBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  // H-1: Verificar que el song existe y pertenece al usuario autenticado
  const { data: song } = await sb
    .from("songs")
    .select("genre, mood")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // H-2: Rate limiting — max 30 llamadas LLM por hora por usuario
  const { allowed } = await checkRateLimit(sb, user.id);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  const { selectedText, instruction } = parsed.data;

  const { systemPrompt, userPrompt } = buildRewritePrompt({
    selectedText,
    instruction,
    genre: song.genre,
    mood: song.mood,
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
        console.error("[rewrite]", err);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "Error al procesar la solicitud" })}\n\n`));
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
