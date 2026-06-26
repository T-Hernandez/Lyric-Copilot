import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { saveNewVersion } from "@/lib/songs/versioning";
import { z } from "zod";

const SaveVersionSchema = z.object({
  tiptapJson: z.record(z.unknown()),
  plainText: z.string(),
  changeSummary: z.string().optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("song_versions")
    .select("id, version_number, change_summary, created_at, content_hash")
    .eq("song_id", id)
    .order("version_number", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SaveVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await saveNewVersion({
    songId: id,
    plainText: parsed.data.plainText,
    tiptapJson: parsed.data.tiptapJson,
    createdBy: user.id,
    changeSummary: parsed.data.changeSummary ?? "Guardado manual",
  });

  return NextResponse.json(result);
}
