import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { buildGeneratePrompt, type ArtistProfile } from "@/lib/llm/prompts/generate";
import { type WritingStrength } from "@/lib/catalog/writing-strengths";
import { saveNewVersion } from "@/lib/songs/versioning";
import { textToTiptapJson } from "@/lib/songs/textToTiptapJson";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data: song } = await sb
    .from("songs")
    .select("id, theme, genre, mood, language")
    .eq("id", id)
    .single();

  if (!song) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  const { data: styleRows } = await sb
    .from("song_style_references")
    .select("style_reference_id, style_references(artist_name, writing_strengths, style_traits)")
    .eq("song_id", id)
    .not("style_reference_id", "is", null);

  const styleReferences: ArtistProfile[] = (styleRows ?? [])
    .filter((r) => r.style_references)
    .map((r) => {
      const ref = r.style_references as unknown as {
        artist_name: string;
        writing_strengths: WritingStrength[] | null;
        style_traits: Record<string, string> | null;
      };
      return {
        artistName: ref.artist_name,
        writingStrengths: ref.writing_strengths ?? null,
        legacyTraits: ref.writing_strengths ? null : ref.style_traits,
      };
    });

  await sb.from("songs").update({ status: "generating" }).eq("id", id);

  const { systemPrompt, userPrompt } = buildGeneratePrompt({
    theme: song.theme,
    genre: song.genre,
    mood: song.mood,
    language: song.language,
    styleReferences,
  });

  const enc = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({
          systemPrompt,
          userPrompt,
          userId: user.id,
          songId: id,
          callType: "generate",
        })) {
          fullText += chunk;
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        const tiptapJson = textToTiptapJson(fullText);
        // Strip section label lines so plain_text matches what editor.getText() produces
        const plainText = fullText
          .split('\n')
          .filter(line => !line.trim().match(/^\[[^\]]+\]$/))
          .join('\n')
          .trim();

        const result = await saveNewVersion({
          songId: id,
          plainText,
          tiptapJson,
          createdBy: user.id,
          changeSummary: "Generación con IA",
        });

        const versionId = result.created ? result.versionId : undefined;
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, versionId })}\n\n`));
        controller.close();
      } catch (err) {
        await sb.from("songs").update({ status: "draft" }).eq("id", id);
        console.error("[generate]", err);
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
