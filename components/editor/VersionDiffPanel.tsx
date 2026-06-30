"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

type DiffLine = { text: string; type: "unchanged" | "added" | "removed" };

function diffLines(textA: string, textB: string): DiffLine[] {
  const a = textA.split("\n");
  const b = textB.split("\n");
  const m = a.length, n = b.length;

  // LCS dynamic programming
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ text: a[i - 1], type: "unchanged" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: b[j - 1], type: "added" });
      j--;
    } else {
      result.unshift({ text: a[i - 1], type: "removed" });
      i--;
    }
  }
  return result;
}

type Props = {
  songId: string;
  older: { text: string; label: string };
  newer: { text: string; label: string };
  onClose: () => void;
};

export function VersionDiffPanel({ songId, older, newer, onClose }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  const diff = diffLines(older.text, newer.text);
  const hasChanges = diff.some((l) => l.type !== "unchanged");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function analyze() {
    setIsAnalyzing(true);
    setAnalysis("");
    setAnalysisDone(false);

    try {
      const res = await fetch(`/api/songs/${songId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionA: older.text,
          versionB: newer.text,
          labels: { a: older.label, b: newer.label },
        }),
      });

      if (!res.ok || !res.body) throw new Error("Error al analizar");

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
          const event = JSON.parse(raw) as { text?: string; done?: boolean; error?: string };
          if (event.text) setAnalysis((prev) => (prev ?? "") + event.text);
          if (event.done) { setAnalysisDone(true); setIsAnalyzing(false); return; }
          if (event.error) throw new Error(event.error);
        }
      }
    } catch {
      setAnalysis("No se pudo analizar el cambio.");
      setIsAnalyzing(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed right-72 top-0 bottom-0 z-50 w-[480px] bg-background border-l shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div>
            <span className="text-sm font-semibold">Comparando</span>
            <span className="text-xs text-muted-foreground ml-2">
              {older.label} → {newer.label}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-base leading-none">
            ✕
          </button>
        </div>

        {/* Diff view */}
        <div className="flex-1 overflow-y-auto">
          {!hasChanges ? (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">
              Sin cambios entre estas versiones.
            </p>
          ) : (
            <div className="px-4 py-4 font-mono text-xs leading-relaxed space-y-px">
              {diff.map((line, i) => {
                if (line.type === "unchanged" && !line.text.trim()) return null;
                return (
                  <div
                    key={i}
                    className={[
                      "px-2 py-0.5 rounded",
                      line.type === "added" && "bg-green-500/10 text-green-700 dark:text-green-400",
                      line.type === "removed" && "bg-red-500/10 text-red-700 dark:text-red-400 line-through opacity-60",
                      line.type === "unchanged" && "text-muted-foreground",
                    ].filter(Boolean).join(" ")}
                  >
                    {line.type === "added" && <span className="select-none mr-1 opacity-50">+</span>}
                    {line.type === "removed" && <span className="select-none mr-1 opacity-50">−</span>}
                    {line.text || " "}
                  </div>
                );
              })}
            </div>
          )}

          {/* AI analysis */}
          {analysis !== null && (
            <div className="px-4 py-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">Análisis del cambio</p>
              <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none prose-p:my-1.5">
                <ReactMarkdown>{analysis}</ReactMarkdown>
                {isAnalyzing && (
                  <span className="inline-block w-0.5 h-3.5 bg-foreground/60 ml-px align-middle animate-pulse" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasChanges && !analysisDone && (
          <div className="px-4 py-3 border-t shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={analyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analizando..." : "Analizar cambio con IA"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
