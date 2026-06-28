"use client";

import { useEffect, useMemo, useState } from "react";

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
  genre?: string;
  mood?: string;
};

type Group = {
  label: string;
  refs: StyleReference[];
};

function matchGenre(ref: StyleReference, genre?: string) {
  if (!genre) return false;
  return ref.genres.some((g) => g.toLowerCase() === genre.toLowerCase());
}

function matchMood(ref: StyleReference, mood?: string) {
  if (!mood) return false;
  return ref.moods.some((m) => m.toLowerCase() === mood.toLowerCase());
}

function buildGroups(refs: StyleReference[], genre?: string, mood?: string): Group[] {
  const filtering = genre || mood;
  if (!filtering) return [{ label: "", refs }];

  const both: StyleReference[] = [];
  const genreOnly: StyleReference[] = [];
  const moodOnly: StyleReference[] = [];
  const neither: StyleReference[] = [];

  for (const ref of refs) {
    const g = matchGenre(ref, genre);
    const m = matchMood(ref, mood);
    if (g && m) both.push(ref);
    else if (g) genreOnly.push(ref);
    else if (m) moodOnly.push(ref);
    else neither.push(ref);
  }

  const groups: Group[] = [];

  if (both.length) groups.push({ label: "Para tu estilo", refs: both });
  if (genreOnly.length) groups.push({ label: "Mismo género", refs: genreOnly });
  if (moodOnly.length) groups.push({ label: "Mismo mood", refs: moodOnly });
  if (neither.length) groups.push({ label: "Para mezclar", refs: neither });

  return groups;
}

export function StyleReferenceSelector({
  selectedIds,
  onChange,
  maxSelections = 3,
  genre,
  mood,
}: Props) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/style-references")
      .then((r) => r.json())
      .then((data) => setReferences(Array.isArray(data) ? data : []))
      .catch(() => setReferences([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(
    () => buildGroups(references, genre, mood),
    [references, genre, mood]
  );

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
  const hasLabels = groups.some((g) => g.label);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label || "all"} className="space-y-2">
          {hasLabels && group.label && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {group.label}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {group.refs.map((ref) => {
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
        </div>
      ))}
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo {maxSelections} referencias seleccionadas.
        </p>
      )}
    </div>
  );
}
