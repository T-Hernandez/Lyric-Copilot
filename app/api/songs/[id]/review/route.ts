import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { buildUserPrompt } from "@/lib/llm/prompts/review/shared";
import { type ReviewLens } from "@/lib/llm/prompts/review/shared";
import { SYSTEM_PROMPT as emotional } from "@/lib/llm/prompts/review/emotional";
import { SYSTEM_PROMPT as storytelling } from "@/lib/llm/prompts/review/storytelling";
import { SYSTEM_PROMPT as hook } from "@/lib/llm/prompts/review/hook";
import { SYSTEM_PROMPT as lyrics } from "@/lib/llm/prompts/review/lyrics";
import { SYSTEM_PROMPT as commercial } from "@/lib/llm/prompts/review/commercial";
import { SYSTEM_PROMPT as full } from "@/lib/llm/prompts/review/full";
import { checkRateLimit } from "@/lib/llm/rateLimit";

const SYSTEM_PROMPTS: Record<ReviewLens, string> = {
  emotional,
  storytelling,
  hook,
  lyrics,
  commercial,
  full,
};

const ReviewBodySchema = z.object({
  lens: z.enum(["emotional", "storytelling", "hook", "lyrics", "commercial", "full"]),
  lyrics: z.string().min(1).max(10000),
  metadata: z
    .object({
      genre: z.string().max(100).optional(),
      emotionalIntent: z.string().max(200).optional(),
      sonicInfluences: z.array(z.string().max(100)).max(10).optional(),
    })
    .optional()
    .default({}),
});

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  // H-1: Verificar que el song existe y pertenece al usuario autenticado
  const { data: song } = await sb
    .from("songs")
    .select("id")
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

  const { lens, lyrics: lyricsText, metadata } = parsed.data;
  const systemPrompt = SYSTEM_PROMPTS[lens];
  const userPrompt = buildUserPrompt(lyricsText, metadata);

  const enc = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({
          systemPrompt,
          userPrompt,
          userId: user.id,
          songId: id,
          callType: "review",
        })) {
          fullContent += chunk;
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        await sb.from("song_reviews").insert({
          song_id: id,
          user_id: user.id,
          lens,
          content: fullContent,
        });

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        console.error("[review]", err);
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ error: "Error al procesar la solicitud" })}\n\n`)
        );
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
