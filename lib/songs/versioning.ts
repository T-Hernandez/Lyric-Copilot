import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function saveNewVersion(params: {
  songId: string;
  plainText: string;
  tiptapJson?: object;
  createdBy: string;
  changeSummary: string;
}) {
  const sb = await getSupabaseServer();
  const contentHash = crypto.createHash("sha256").update(params.plainText).digest("hex");

  const { data: latest } = await sb
    .from("song_versions")
    .select("version_number, content_hash")
    .eq("song_id", params.songId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.content_hash === contentHash) {
    return { created: false, reason: "duplicate_content" };
  }

  const { data: version, error } = await sb
    .from("song_versions")
    .insert({
      song_id: params.songId,
      version_number: (latest?.version_number ?? 0) + 1,
      plain_text: params.plainText,
      tiptap_json: params.tiptapJson ?? { type: "doc", content: [] },
      content_hash: contentHash,
      change_summary: params.changeSummary,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  await sb
    .from("songs")
    .update({
      current_version_id: version.id,
      updated_at: new Date().toISOString(),
      status: "ready",
    })
    .eq("id", params.songId);

  return { created: true, versionId: version.id };
}
