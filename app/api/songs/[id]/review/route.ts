import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import {
  type ReviewLens,
  type ReviewMetadata,
  buildUserPrompt,
} from "@/lib/llm/prompts/review/shared";
import { SYSTEM_PROMPT as emotional } from "@/lib/llm/prompts/review/emotional";
import { SYSTEM_PROMPT as storytelling } from "@/lib/llm/prompts/review/storytelling";
import { SYSTEM_PROMPT as hook } from "@/lib/llm/prompts/review/hook";
import { SYSTEM_PROMPT as lyrics } from "@/lib/llm/prompts/review/lyrics";
import { SYSTEM_PROMPT as commercial } from "@/lib/llm/prompts/review/commercial";
import { SYSTEM_PROMPT as full } from "@/lib/llm/prompts/review/full";

const SYSTEM_PROMPTS: Record<ReviewLens, string> = {
  emotional,
  storytelling,
  hook,
  lyrics,
  commercial,
  full,
};

type ReviewBody = {
  lens: ReviewLens;
  lyrics: string;
  metadata?: ReviewMetadata;
};

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body: ReviewBody = await req.json();
  const { lens, lyrics: lyricsText, metadata = {} } = body;

  if (!lens || !SYSTEM_PROMPTS[lens]) {
    return new Response(JSON.stringify({ error: "Invalid lens" }), { status: 400 });
  }
  if (!lyricsText?.trim()) {
    return new Response(JSON.stringify({ error: "No lyrics provided" }), { status: 400 });
  }

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
          enc.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
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
