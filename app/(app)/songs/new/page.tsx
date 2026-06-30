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
import { ChipSelector } from "@/components/ChipSelector";
import { StyleReferenceSelector } from "@/components/StyleReferenceSelector";

const GENRES = [
  // Global
  "Pop", "Hip-Hop", "R&B", "Rock", "Electrónica", "Indie", "Country", "K-Pop",
  // Urbano latino
  "Reggaeton", "Trap Latino", "Corridos Tumbados", "Pop Latino",
  "Bachata", "Cumbia", "Salsa", "Dembow",
  // Otros
  "Trap", "Rock Alternativo", "Rock en Español", "Balada",
  "Folk", "Jazz", "Flamenco Pop", "Metal",
];

const MOODS = [
  "Alegre", "Festivo", "Romántico", "Sensual", "Energético", "Épico",
  "Melancólico", "Triste", "Nostálgico", "Oscuro", "Furioso",
  "Introspectivo", "Soñador", "Desafiante", "Tranquilo", "Vulnerable",
];

export default function NewSongPage() {
  const router = useRouter();
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [language, setLanguage] = useState("es");
  const [styleReferenceIds, setStyleReferenceIds] = useState<string[]>([]);
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
      styleReferenceIds: styleReferenceIds.length ? styleReferenceIds : undefined,
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nueva canción</h1>
        <p className="text-sm text-muted-foreground mt-1">Cuanto más contexto, mejor la letra generada.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>
              Género{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            {genre && (
              <button
                type="button"
                onClick={() => setGenre("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>
          <ChipSelector options={GENRES} value={genre} onChange={setGenre} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>
              Mood{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            {mood && (
              <button
                type="button"
                onClick={() => setMood("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>
          <ChipSelector options={MOODS} value={mood} onChange={setMood} />
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

        <div className="space-y-1.5">
          <Label>
            Referencias de estilo{" "}
            <span className="text-muted-foreground font-normal">(opcional, máx. 3)</span>
          </Label>
          <StyleReferenceSelector
            selectedIds={styleReferenceIds}
            onChange={setStyleReferenceIds}
            genre={genre || undefined}
            mood={mood || undefined}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando..." : "Crear canción"}
        </Button>
      </form>
    </main>
  );
}
