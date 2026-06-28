import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SongsPage() {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: songs } = await sb
    .from("songs")
    .select("id, title, genre, mood, language, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Mis canciones</h1>
        <Link href="/songs/new" className={buttonVariants()}>
          + Nueva canción
        </Link>
      </div>

      {!songs?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">Todavía no tienes canciones.</p>
          <p className="text-sm mb-6">Crea una para empezar a escribir.</p>
          <Link href="/songs/new" className={buttonVariants({ variant: "outline" })}>
            Crear mi primera canción
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map((song) => (
            <Link key={song.id} href={`/songs/${song.id}`} className="block group">
              <Card className="transition-colors group-hover:bg-accent/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {song.title || "Sin título"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {song.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {song.genre}
                        </Badge>
                      )}
                      {song.mood && (
                        <Badge variant="outline" className="text-xs">
                          {song.mood}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(song.updated_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
