import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const CreateSongSchema = z.object({
  title: z.string().min(1).max(200).default("Sin título"),
  theme: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  language: z.enum(["es", "en"]).default("es"),
  styleReferenceIds: z.array(z.string().uuid()).max(3).optional(),
});

export async function GET() {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("songs")
    .select("id, title, genre, mood, language, status, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSongSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { styleReferenceIds, ...songData } = parsed.data;

  const { data: song, error } = await sb
    .from("songs")
    .insert({ ...songData, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (styleReferenceIds?.length) {
    await sb.from("song_style_references").insert(
      styleReferenceIds.map((id) => ({
        song_id: song.id,
        style_reference_id: id,
        source: "curated_manual" as const,
      }))
    );
  }

  return NextResponse.json(song, { status: 201 });
}
