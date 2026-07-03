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

type ReviewHistoryItem = {
  id: string;
  lens: ReviewLens;
  content: string;
  created_at: string;
};

const LENSES: ReviewLens[] = [
  "emotional",
  "storytelling",
  "hook",
  "lyrics",
  "commercial",
  "full",
];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "hace un momento";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days > 1 ? "s" : ""}`;
}

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

  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    fetch(`/api/songs/${songId}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [songId]);

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
            const event = JSON.parse(raw) as {
              text?: string;
              done?: boolean;
              error?: string;
            };

            if (event.error) throw new Error(event.error);
            if (event.text) {
              accumulated += event.text;
              setStreamedText((prev) => prev + event.text);
            }
            if (event.done) {
              setIsDone(true);
              setIsStreaming(false);
              // Add to local history without re-fetching
              setHistory((prev) => [
                { id: crypto.randomUUID(), lens, content: accumulated, created_at: new Date().toISOString() },
                ...prev,
              ]);
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

  const goBack = useCallback(() => {
    setSelectedLens(null);
    setStreamedText("");
    setIsDone(false);
    setError(null);
    setExpandedId(null);
  }, []);

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
                onClick={goBack}
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

              {/* History */}
              {historyLoaded && history.length > 0 && (
                <div className="pt-4 mt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-3">Análisis anteriores</p>
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-medium">{LENS_LABELS[item.lens]}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                              {relativeTime(item.created_at)}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {expandedId === item.id ? "▲" : "▼"}
                          </span>
                        </button>
                        {expandedId === item.id && (
                          <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
                            <div className="text-xs leading-relaxed text-foreground/80 prose prose-sm max-w-none prose-p:my-1.5 prose-strong:font-semibold prose-p:leading-relaxed">
                              <ReactMarkdown>{item.content}</ReactMarkdown>
                            </div>
                            {onStartRewrite && (
                              <button
                                type="button"
                                onClick={() => {
                                  onStartRewrite(LENS_REWRITE[item.lens].instruction);
                                  onClose();
                                }}
                                className="mt-2 text-xs text-primary hover:underline"
                              >
                                {LENS_REWRITE[item.lens].label}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              onClick={goBack}
            >
              Ver otras perspectivas
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
