"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { SongSection, SECTION_LABELS, type SectionType } from "./extensions/SongSection";
import { AiRewriteToolbar } from "./AiRewriteToolbar";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { VersionDiffPanel } from "./VersionDiffPanel";
import { ReviewPanel } from "./ReviewPanel";
import { textToTiptapJson } from "@/lib/songs/textToTiptapJson";
import { useState, useCallback, useEffect, useRef } from "react";
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


type RewriteAnchor = {
  rect: DOMRect;
  from: number;
  to: number;
  selectedText: string;
};

export function SongEditor({ song }: { song: Song }) {
  const router = useRouter();
  const [title, setTitle] = useState(song.title);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);
  // null = editor visible; string = full-song streaming generation in progress
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Version history panel
  const [showHistory, setShowHistory] = useState(false);
  // Review panel
  const [showReview, setShowReview] = useState(false);
  const [showReviewNudge, setShowReviewNudge] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState<string | null>(null);
  // Diff panel
  const [compareTarget, setCompareTarget] = useState<{ text: string; label: string } | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(
    song.current_version?.id ?? null
  );

  // Inline rewrite toolbar
  const [rewriteAnchor, setRewriteAnchor] = useState<RewriteAnchor | null>(null);
  // Keep a ref so onAccept closure always has the latest anchor even after re-renders
  const rewriteAnchorRef = useRef<RewriteAnchor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Primera línea." }),
      SongSection,
    ],
    content: (song.current_version?.tiptap_json as object) ?? undefined,
    onUpdate: () => {
      setHasChanges(true);
      setShowReviewNudge(false);
    },
    onSelectionUpdate: ({ editor }) => {
      if (streamingText !== null) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        setRewriteAnchor(null);
        rewriteAnchorRef.current = null;
        return;
      }
      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      if (!text) {
        setRewriteAnchor(null);
        rewriteAnchorRef.current = null;
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const anchor: RewriteAnchor = { rect, from, to, selectedText: text };
      rewriteAnchorRef.current = anchor;
      setRewriteAnchor(anchor);
    },
  });

  const handleRewriteAccept = useCallback(
    (suggestion: string) => {
      const anchor = rewriteAnchorRef.current;
      if (!editor || !anchor) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: anchor.from, to: anchor.to })
        .insertContent(suggestion)
        .run();
      setRewriteAnchor(null);
      rewriteAnchorRef.current = null;
      setRewriteInstruction(null);
      setHasChanges(true);
    },
    [editor]
  );

  const handleRewriteClose = useCallback(() => {
    setRewriteAnchor(null);
    rewriteAnchorRef.current = null;
    setRewriteInstruction(null);
  }, []);

  const handleStartRewriteFromReview = useCallback((instruction: string) => {
    if (!editor) return;
    editor.commands.selectAll();
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n").trim();
    if (!selectedText) return;
    const editorEl = document.querySelector(".ProseMirror");
    const editorRect = editorEl?.getBoundingClientRect();
    const rect = new DOMRect(
      window.innerWidth / 2 - 100,
      editorRect ? editorRect.top + 60 : 200,
      200,
      20
    );
    const anchor: RewriteAnchor = { rect, from, to, selectedText };
    rewriteAnchorRef.current = anchor;
    setRewriteAnchor(anchor);
    setRewriteInstruction(instruction);
  }, [editor]);

  const handleRestore = useCallback(
    (tiptapJson: object) => {
      if (!editor) return;
      editor.commands.setContent(tiptapJson);
      setHasChanges(true);
      setShowHistory(false);
    },
    [editor]
  );

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

      const versionRes = await fetch(`/api/songs/${song.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiptapJson, plainText, changeSummary: "Guardado manual" }),
      });
      const versionData = await versionRes.json();
      if (versionData.created && versionData.versionId) {
        setCurrentVersionId(versionData.versionId);
      }

      setSaveStatus("saved");
      setHasChanges(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [editor, saveStatus, song.id, song.title, title]);

  const generate = useCallback(async () => {
    if (streamingText !== null) return;

    const hasExistingContent = editor?.getText().trim().length ?? 0 > 0;
    if (
      hasExistingContent &&
      !window.confirm("¿Reemplazar el contenido actual con una letra generada por IA?")
    ) {
      return;
    }

    setStreamingText("");
    setGenError(null);
    setRewriteAnchor(null);
    rewriteAnchorRef.current = null;

    try {
      const res = await fetch(`/api/songs/${song.id}/generate`, { method: "POST" });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Error de red" }));
        throw new Error(err.error ?? "Error al generar");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          const event = JSON.parse(raw) as { text?: string; done?: boolean; error?: string; versionId?: string };

          if (event.error) throw new Error(event.error);

          if (event.text) {
            accumulated += event.text;
            setStreamingText(accumulated);
          }

          if (event.done) {
            const tiptapJson = textToTiptapJson(accumulated);
            editor?.commands.setContent(tiptapJson);
            setStreamingText(null);
            setHasChanges(false);
            setShowReviewNudge(true);
            if (event.versionId) setCurrentVersionId(event.versionId);
            return;
          }
        }
      }
    } catch (err) {
      setStreamingText(null);
      setGenError(err instanceof Error ? err.message : "Error desconocido");
      setTimeout(() => setGenError(null), 6000);
    }
  }, [editor, song.id, streamingText]);

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

  const isGenerating = streamingText !== null;

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
          className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0 h-auto flex-1 tracking-tight"
          placeholder="Sin título"
          disabled={isGenerating}
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground min-w-[80px] text-right">
            {saveStatus === "saving" && "Guardando..."}
            {saveStatus === "saved" && "Guardado"}
            {saveStatus === "error" && "No se pudo guardar"}
            {saveStatus === "idle" && hasChanges && "Cambios sin guardar"}
          </span>
          <Button onClick={save} disabled={saveStatus === "saving" || isGenerating} size="sm">
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
            disabled={isGenerating}
            onClick={() => editor?.chain().focus().insertSongSection(type).run()}
          >
            {label}
          </Button>
        ))}
        <div className="ml-auto h-4 w-px bg-border self-center" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            disabled={isGenerating}
          >
            Historial
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowReview((v) => !v);
              setShowReviewNudge(false);
            }}
            disabled={isGenerating}
          >
            Pedir feedback
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={generate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generando..." : "✦ Generar con IA"}
          </Button>
        </div>
      </div>

      {/* Error de generación */}
      {genError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b">
          {genError}
        </div>
      )}

      {/* Contenido: streaming preview o editor */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {isGenerating ? (
          <div className="text-base leading-[1.8] whitespace-pre-wrap text-foreground min-h-96">
            {streamingText}
            <span className="inline-block w-0.5 h-4 bg-foreground/60 ml-px align-middle animate-pulse" />
          </div>
        ) : (
          <EditorContent editor={editor} className="song-editor min-h-96" />
        )}
      </div>

      {/* Post-generation nudge */}
      {showReviewNudge && !isGenerating && (
        <div className="max-w-2xl mx-auto w-full px-6 pb-4">
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Borrador listo.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los buenos compositores rara vez quedan conformes con la primera versión. Pide feedback antes de reescribir.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setShowReview(true);
                  setShowReviewNudge(false);
                }}
              >
                Pedir feedback
              </Button>
              <button
                type="button"
                onClick={() => setShowReviewNudge(false)}
                className="text-muted-foreground hover:text-foreground text-sm leading-none px-1"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review panel */}
      {showReview && (
        <ReviewPanel
          songId={song.id}
          lyrics={editor?.getText({ blockSeparator: "\n" }) ?? ""}
          metadata={{ genre: song.genre, emotionalIntent: song.mood }}
          onClose={() => setShowReview(false)}
          onStartRewrite={handleStartRewriteFromReview}
        />
      )}

      {/* Version history drawer */}
      {showHistory && (
        <VersionHistoryPanel
          songId={song.id}
          currentVersionId={currentVersionId}
          currentLyrics={editor?.getText({ blockSeparator: "\n" }) ?? ""}
          onRestore={handleRestore}
          onCompare={(text, label) => setCompareTarget({ text, label })}
          onClose={() => setShowHistory(false)}
        />
      )}

      {compareTarget && (
        <VersionDiffPanel
          songId={song.id}
          older={compareTarget}
          newer={{ text: editor?.getText({ blockSeparator: "\n" }) ?? "", label: "Versión actual" }}
          onClose={() => setCompareTarget(null)}
        />
      )}

      {/* Floating rewrite toolbar — appears when text is selected */}
      {rewriteAnchor && !isGenerating && (
        <AiRewriteToolbar
          selectionRect={rewriteAnchor.rect}
          selectedText={rewriteAnchor.selectedText}
          songId={song.id}
          defaultInstruction={rewriteInstruction ?? undefined}
          onAccept={handleRewriteAccept}
          onClose={handleRewriteClose}
        />
      )}
    </div>
  );
}
