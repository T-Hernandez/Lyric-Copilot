"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type VersionMeta = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
};

type Props = {
  songId: string;
  currentVersionId: string | null;
  onRestore: (tiptapJson: object) => void;
  onClose: () => void;
};

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

export function VersionHistoryPanel({ songId, currentVersionId, onRestore, onClose }: Props) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/songs/${songId}/versions`)
      .then((r) => r.json())
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar el historial"))
      .finally(() => setLoading(false));
  }, [songId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/songs/${songId}/versions/${versionId}`);
      if (!res.ok) throw new Error("Error al cargar la versión");
      const data = await res.json();
      onRestore(data.tiptap_json as object);
    } catch {
      setError("No se pudo restaurar la versión");
      setRestoringId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-background border-l shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="text-sm font-semibold">Historial</span>
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
          {loading && (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">
              Cargando...
            </p>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive px-4 py-6 text-center">{error}</p>
          )}

          {!loading && !error && versions.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">
              Sin versiones guardadas todavía.
            </p>
          )}

          {!loading && versions.map((v) => {
            const isCurrent = v.id === currentVersionId;
            const isRestoring = restoringId === v.id;

            return (
              <div
                key={v.id}
                className={[
                  "px-4 py-3 border-b last:border-b-0",
                  isCurrent ? "bg-muted/40" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">v{v.version_number}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      Actual
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {v.change_summary ?? "Sin descripción"}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-2">
                  {relativeTime(v.created_at)}
                </p>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    disabled={restoringId !== null}
                    onClick={() => handleRestore(v.id)}
                  >
                    {isRestoring ? "Restaurando..." : "Restaurar"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-4 py-3 border-t shrink-0">
          <p className="text-xs text-muted-foreground">
            Restaurar carga el contenido en el editor. Guarda para confirmar.
          </p>
        </div>
      </div>
    </>
  );
}
