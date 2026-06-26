import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SongsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Mis canciones</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Próximamente — Fase 1 en desarrollo.
      </p>
    </main>
  );
}
