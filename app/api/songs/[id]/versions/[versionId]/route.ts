import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

type Params = Promise<{ id: string; versionId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id, versionId } = await params;
  const sb = await getSupabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("song_versions")
    .select("id, version_number, tiptap_json, plain_text, change_summary, created_at")
    .eq("id", versionId)
    .eq("song_id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
