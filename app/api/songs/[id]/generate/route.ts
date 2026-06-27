import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateCompletion } from "@/lib/llm/router";
import { buildGeneratePrompt } from "@/lib/llm/prompts/generate";
import { saveNewVersion } from "@/lib/songs/versioning";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: song } = await sb
    .from("songs")
    .select("id, theme, genre, mood, language")
    .eq("id", id)
    .single();

  if (!song) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await sb.from("songs").update({ status: "generating" }).eq("id", id);

  try {
    const { systemPrompt, userPrompt } = buildGeneratePrompt({
      theme: song.theme,
      genre: song.genre,
      mood: song.mood,
      language: song.language,
    });

    const text = await generateCompletion({
      systemPrompt,
      userPrompt,
      userId: user.id,
      songId: id,
      callType: "generate",
    });

    await saveNewVersion({
      songId: id,
      plainText: text,
      createdBy: user.id,
      changeSummary: "Generación con IA",
    });

    return NextResponse.json({ text });
  } catch (err) {
    await sb.from("songs").update({ status: "draft" }).eq("id", id);
    console.error("[generate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
