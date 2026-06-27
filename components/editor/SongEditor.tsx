"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { SongSection, SECTION_LABELS, type SectionType } from "./extensions/SongSection";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CurrentVersion = {
  id: string;
  tiptap_json: unknown;
  plain_text: string;
  version_number: number;
};

type Song = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  language: string;
  status: string;
  current_version: CurrentVersion | null;
};

// Maps [section tag] from LLM output → TipTap SongSection type
const TAG_MAP: Record<string, SectionType> = {
  "intro": "intro",
  "verso": "verse",
  "verso 1": "verse",
  "verso 2": "verse",
  "verso 3": "verse",
  "verso 4": "verse",
  "pre-coro": "prechorus",
  "pre coro": "prechorus",
  "precoro": "prechorus",
  "coro": "chorus",
  "estribillo": "chorus",
  "puente": "bridge",
  "bridge": "bridge",
  "outro": "outro",
};

function textToTiptapJson(text: string) {
  const lines = text.split("\n");
  const content: object[] = [];
  let hasContent = false;

  for (const line of lines) {
    const tagMatch = line.match(/^\[([^\]]+)\]/);
    if (tagMatch) {
      const key = tagMatch[1].toLowerCase().trim();
      const sectionType = TAG_MAP[key];
      if (sectionType) {
        content.push({ type: "songSection", attrs: { sectionType } });
        hasContent = true;
        continue;
      }
    }
    const trimmed = line.trim();
    if (trimmed || hasContent) {
      content.push({
        type: "paragraph",
        content: trimmed ? [{ type: "text", text: trimmed }] : [],
      });
      if (trimmed) hasContent = true;
    }
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export function SongEditor({ song }: { song: Song }) {
  const router = useRouter();
  const [title, setTitle] = useState(song.title);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Escribí tu letra acá..." }),
      SongSection,
    ],
    content: (song.current_version?.tiptap_json as object) ?? undefined,
    onUpdate: () => setHasChanges(true),
  });

  const save = useCallback(async () => {
    if (!editor || saveStatus === "saving") return;
    setSaveStatus("saving");

    try {
      if (title !== song.title) {
        const res = await fetch(`/api/songs/${song.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("Error al guardar el título");
      }

      const tiptapJson = editor.getJSON();
      const plainText = editor.getText({ blockSeparator: "\n" });

      await fetch(`/api/songs/${song.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiptapJson, plainText, changeSummary: "Guardado manual" }),
      });

      setSaveStatus("saved");
      setHasChanges(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [editor, saveStatus, song.id, song.title, title]);

  const generate = useCallback(async () => {
    if (!editor || generating) return;
    const hasExistingContent = editor.getText().trim().length > 0;
    if (
      hasExistingContent &&
      !window.confirm("¿Reemplazar el contenido actual con una letra generada por IA?")
    ) {
      return;
    }

    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch(`/api/songs/${song.id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al generar");
      }
      const { text } = await res.json();
      const tiptapJson = textToTiptapJson(text);
      editor.commands.setContent(tiptapJson);
      setHasChanges(false); // ya se guardó en el servidor
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Error desconocido");
      setTimeout(() => setGenError(null), 5000);
    } finally {
      setGenerating(false);
    }
  }, [editor, generating, song.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [save]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/songs")}>
          ← Canciones
        </Button>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasChanges(true);
          }}
          className="text-base font-semibold border-0 shadow-none focus-visible:ring-0 px-0 h-auto flex-1"
          placeholder="Sin título"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground min-w-[80px] text-right">
            {saveStatus === "saving" && "Guardando..."}
            {saveStatus === "saved" && "Guardado ✓"}
            {saveStatus === "error" && "Error al guardar"}
            {saveStatus === "idle" && hasChanges && "Sin guardar"}
          </span>
          <Button onClick={save} disabled={saveStatus === "saving"} size="sm">
            Guardar
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Insertar:</span>
        {(Object.entries(SECTION_LABELS) as [SectionType, string][]).map(([type, label]) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2 py-0"
            onClick={() => editor?.chain().focus().insertSongSection(type).run()}
          >
            {label}
          </Button>
        ))}
        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={generate}
            disabled={generating}
          >
            {generating ? "Generando..." : "✦ Generar con IA"}
          </Button>
        </div>
      </div>

      {/* Error de generación */}
      {genError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b">
          {genError}
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <EditorContent editor={editor} className="song-editor min-h-96" />
      </div>
    </div>
  );
}
