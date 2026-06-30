"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase = "trigger" | "panel";

type Props = {
  selectionRect: DOMRect;
  selectedText: string;
  songId: string;
  defaultInstruction?: string;
  onAccept: (suggestion: string) => void;
  onClose: () => void;
};

export function AiRewriteToolbar({ selectionRect, selectedText, songId, defaultInstruction, onAccept, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>(defaultInstruction ? "panel" : "trigger");
  const [instruction, setInstruction] = useState(defaultInstruction ?? "");
  const [streaming, setStreaming] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus instruction input when panel opens
  useEffect(() => {
    if (phase === "panel") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Position: above the selection, horizontally centered
  const vp = typeof window !== "undefined"
    ? { w: window.innerWidth, h: window.innerHeight }
    : { w: 800, h: 600 };

  const PANEL_W = 288;
  const rawLeft = selectionRect.left + selectionRect.width / 2 - PANEL_W / 2;
  const left = Math.max(8, Math.min(vp.w - PANEL_W - 8, rawLeft));
  // Show above selection; if too close to top, show below
  const showBelow = selectionRect.top < 160;
  const top = showBelow
    ? selectionRect.bottom + 8
    : selectionRect.top - 8;

  async function generate() {
    setStreaming(true);
    setSuggestion("");
    setError(null);

    try {
      const res = await fetch(`/api/songs/${songId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText, instruction: instruction || undefined }),
      });
      if (!res.ok || !res.body) throw new Error("Error al generar");

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
          const event = JSON.parse(raw) as { text?: string; done?: boolean; error?: string };
          if (event.error) throw new Error(event.error);
          if (event.text) {
            accumulated += event.text;
            setSuggestion(accumulated);
          }
          if (event.done) {
            setStreaming(false);
            return;
          }
        }
      }
      setStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStreaming(false);
    }
  }

  const isDone = suggestion !== null && !streaming;

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{ top, left, width: PANEL_W }}
      // Prevent mousedown from stealing editor focus during "trigger" phase
      onMouseDown={(e) => phase === "trigger" && e.preventDefault()}
    >
      {phase === "trigger" ? (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 shadow-md hover:bg-primary/90 transition-colors"
          style={{ transform: showBelow ? "none" : "translateY(-100%)" }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPhase("panel")}
        >
          ✦ Reescribir
        </button>
      ) : (
        <div
          className="rounded-lg border bg-popover shadow-lg overflow-hidden"
          style={{ transform: showBelow ? "none" : "translateY(-100%)" }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Reescribir con IA</span>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-sm leading-none"
            >
              ✕
            </button>
          </div>

          {/* Original preview */}
          <div className="px-3 py-2 bg-muted/40 border-b">
            <p className="text-xs text-muted-foreground mb-1">Original:</p>
            <p className="text-xs line-clamp-3 whitespace-pre-wrap">{selectedText}</p>
          </div>

          {/* Instruction input (only before generating) */}
          {suggestion === null && (
            <div className="px-3 py-2 border-b">
              <Input
                ref={inputRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Instrucción opcional... (ej: más oscuro, con rima)"
                className="text-xs h-7 border-0 shadow-none px-0 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    generate();
                  }
                }}
              />
            </div>
          )}

          {/* Streaming suggestion */}
          {suggestion !== null && (
            <div className="px-3 py-2 border-b max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1">Sugerencia:</p>
              <p className="text-xs whitespace-pre-wrap">
                {suggestion}
                {streaming && (
                  <span className="inline-block w-0.5 h-3 bg-foreground/60 ml-px align-middle animate-pulse" />
                )}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 border-b text-xs text-destructive">{error}</div>
          )}

          {/* Actions */}
          <div className="px-3 py-2 flex gap-2">
            {isDone ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onAccept(suggestion!)}
                >
                  ✓ Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs flex-1"
                  onClick={() => { setSuggestion(null); setInstruction(""); }}
                >
                  Reintentar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={onClose}
                >
                  ✕
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={generate}
                  disabled={streaming}
                >
                  {streaming ? "Generando..." : "✦ Generar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
