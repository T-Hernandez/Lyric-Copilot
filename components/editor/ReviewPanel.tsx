"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  type ReviewLens,
  LENS_LABELS,
  LENS_DESCRIPTIONS,
  LENS_REWRITE,
} from "@/lib/llm/prompts/review/shared";

const LENSES: ReviewLens[] = [
  "emotional",
  "storytelling",
  "hook",
  "lyrics",
  "commercial",
  "full",
];

type Props = {
  songId: string;
  lyrics: string;
  metadata?: {
    genre?: string | null;
    emotionalIntent?: string | null;
  };
  onClose: () => void;
  onStartRewrite?: (instruction: string) => void;
};

export function ReviewPanel({ songId, lyrics, metadata = {}, onClose, onStartRewrite }: Props) {
  const [selectedLens, setSelectedLens] = useState<ReviewLens | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const startReview = useCallback(
    async (lens: ReviewLens) => {
      setSelectedLens(lens);
      setStreamedText("");
      setIsStreaming(true);
      setIsDone(false);
      setError(null);

      try {
        const res = await fetch(`/api/songs/${songId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lens,
            lyrics,
            metadata: {
              genre: metadata.genre ?? undefined,
              emotionalIntent: metadata.emotionalIntent ?? undefined,
            },
          }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Error de red" }));
          throw new Error(err.error ?? "Error al generar el feedback");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
            const event = JSON.parse(raw) as {
              text?: string;
              done?: boolean;
              error?: string;
            };

            if (event.error) throw new Error(event.error);
            if (event.text) setStreamedText((prev) => prev + event.text);
            if (event.done) {
              setIsDone(true);
              setIsStreaming(false);
              return;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setIsStreaming(false);
      }
    },
    [songId, lyrics, metadata]
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-background border-l shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            {selectedLens && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLens(null);
                  setStreamedText("");
                  setIsDone(false);
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
                disabled={isStreaming}
              >
                ←
              </button>
            )}
            <span className="text-sm font-semibold">
              {selectedLens ? LENS_LABELS[selectedLens] : "Revisar"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedLens ? (
            /* Lens chooser */
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-4">
                ¿Qué necesita esta letra?
              </p>
              {LENSES.map((lens) => (
                <button
                  key={lens}
                  type="button"
                  onClick={() => startReview(lens)}
                  className="w-full text-left px-3 py-3 rounded-lg border hover:border-primary/50 hover:bg-muted/40 transition-colors"
                >
                  <p className="text-sm font-medium">{LENS_LABELS[lens]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {LENS_DESCRIPTIONS[lens]}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            /* Streaming response */
            <div className="px-4 py-4">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none prose-p:my-2 prose-strong:font-semibold prose-p:leading-relaxed">
                  <ReactMarkdown>{streamedText}</ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-3.5 bg-foreground/60 ml-px align-middle animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isDone && selectedLens && (
          <div className="px-4 py-3 border-t shrink-0 space-y-2">
            {onStartRewrite && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  onStartRewrite(LENS_REWRITE[selectedLens].instruction);
                  onClose();
                }}
              >
                {LENS_REWRITE[selectedLens].label}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedLens(null);
                setStreamedText("");
                setIsDone(false);
              }}
            >
              Ver otras perspectivas
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
