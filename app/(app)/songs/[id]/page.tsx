import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SongEditor } from "@/components/editor/SongEditor";

type Params = Promise<{ id: string }>;

export default async function SongEditorPage({ params }: { params: Params }) {
  const { id } = await params;
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: song } = await sb
    .from("songs")
    .select("*, current_version:song_versions!current_version_id(*)")
    .eq("id", id)
    .single();

  if (!song) redirect("/songs");

  return <SongEditor song={song} />;
}
