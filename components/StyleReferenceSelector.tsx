"use client";

import { useEffect, useState } from "react";

export type StyleReference = {
  id: string;
  artist_name: string;
  genres: string[];
  moods: string[];
  languages: string[];
};

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelections?: number;
};

export function StyleReferenceSelector({ selectedIds, onChange, maxSelections = 3 }: Props) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/style-references")
      .then((r) => r.json())
      .then((data) => setReferences(Array.isArray(data) ? data : []))
      .catch(() => setReferences([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < maxSelections) {
      onChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando artistas...</div>;
  }

  if (!references.length) return null;

  const atLimit = selectedIds.length >= maxSelections;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {references.map((ref) => {
          const isSelected = selectedIds.includes(ref.id);
          const isDisabled = !isSelected && atLimit;
          return (
            <button
              key={ref.id}
              type="button"
              onClick={() => toggle(ref.id)}
              disabled={isDisabled}
              className={[
                "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : isDisabled
                    ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
              ].join(" ")}
            >
              <span className="text-sm font-medium">{ref.artist_name}</span>
              {ref.genres.length > 0 && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {ref.genres.slice(0, 2).join(" · ")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo {maxSelections} referencias seleccionadas.
        </p>
      )}
    </div>
  );
}
