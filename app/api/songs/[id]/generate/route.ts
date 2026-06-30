import { getSupabaseServer } from "@/lib/supabase/server";
import { streamCompletion } from "@/lib/llm/router";
import { buildGeneratePrompt, type StyleTraitEntry } from "@/lib/llm/prompts/generate";
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

  // Fetch style references with their traits
  const { data: styleRows } = await sb
    .from("song_style_references")
    .select("style_reference_id, style_references(artist_name, style_traits)")
    .eq("song_id", id)
    .not("style_reference_id", "is", null);

  const styleReferences: StyleTraitEntry[] = (styleRows ?? [])
    .filter((r) => r.style_references)
    .map((r) => {
      const ref = r.style_references as unknown as { artist_name: string; style_traits: Record<string, string> };
      return {
        artistName: ref.artist_name,
        traits: ref.style_traits,
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

        const result = await saveNewVersion({
          songId: id,
          plainText: fullText,
          tiptapJson: textToTiptapJson(fullText),
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
