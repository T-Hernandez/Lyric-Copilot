import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/LogoutButton";

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis canciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Escribe, reescribe, revisa.</p>
        </div>
        <div className="flex items-center gap-4">
          <LogoutButton />
          <Link href="/songs/new" className={buttonVariants({ size: "sm" })}>
            Nueva canción
          </Link>
        </div>
      </div>

      {!songs?.length ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-5 text-muted-foreground/20 select-none font-light">♪</p>
          <p className="font-medium mb-1">Ninguna canción todavía</p>
          <p className="text-sm text-muted-foreground mb-6">
            Empieza con algo pequeño: un título, una emoción, una idea.
          </p>
          <Link href="/songs/new" className={buttonVariants({ variant: "outline" })}>
            Empezar a escribir
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map((song) => (
            <Link key={song.id} href={`/songs/${song.id}`} className="block group">
              <Card className="transition-all group-hover:border-primary/30 group-hover:bg-accent/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-0.5 self-stretch rounded-full bg-border group-hover:bg-primary/50 transition-colors shrink-0" />
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
                  <svg
                    className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
