"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GENRES = [
  "Pop", "Rock", "Folk", "Reggaeton", "Cumbia",
  "Balada", "Hip-Hop", "Electrónica", "Jazz", "Otro",
];
const MOODS = [
  "Alegre", "Triste", "Nostálgico", "Energético",
  "Romántico", "Melancólico", "Introspectivo", "Otro",
];

export default function NewSongPage() {
  const router = useRouter();
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      title: (form.get("title") as string) || "Sin título",
      theme: (form.get("theme") as string) || undefined,
      genre: genre || undefined,
      mood: mood || undefined,
      language,
    };

    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al crear la canción");
      }
      const song = await res.json();
      router.push(`/songs/${song.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/songs")}>
          ← Volver
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Nueva canción</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            name="title"
            placeholder="Sin título"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="theme">
            ¿De qué trata?{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="theme"
            name="theme"
            placeholder="Una carta de amor en una ciudad lluviosa..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              Género{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Select value={genre} onValueChange={(val) => setGenre(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir..." />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Mood{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Select value={mood} onValueChange={(val) => setMood(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir..." />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Idioma</Label>
          <Select value={language} onValueChange={(val) => setLanguage(val ?? "es")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">Inglés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando..." : "Crear canción"}
        </Button>
      </form>
    </main>
  );
}
