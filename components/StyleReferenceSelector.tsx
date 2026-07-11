"use client";

import { useEffect, useMemo, useState } from "react";
import { type WritingStrength, STRENGTH_LABELS } from "@/lib/catalog/writing-strengths";

export type StyleReference = {
  id: string;
  artist_name: string;
  genres: string[];
  moods: string[];
  languages: string[];
  artist_type: "universal_master" | "scene_reference" | null;
  core_lesson: string | null;
  writing_strengths: WritingStrength[] | null;
  shines_when: string[] | null;
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
  if (neither.length) groups.push({ label: "Más géneros", refs: neither });

  return groups;
}

function computeEscuela(selectedRefs: StyleReference[]) {
  const withStrengths = selectedRefs.filter((r) => r.writing_strengths?.length);
  if (withStrengths.length < 2) return null;

  const counts = new Map<WritingStrength, number>();
  for (const ref of withStrengths) {
    for (const s of ref.writing_strengths!) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const high = sorted.filter(([, c]) => c >= 2).map(([s]) => s);
  const complementary = sorted.filter(([, c]) => c < 2).map(([s]) => s);

  return high.length || complementary.length ? { high, complementary } : null;
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
  const [previewId, setPreviewId] = useState<string | null>(null);

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

  function togglePreview(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPreviewId((prev) => (prev === id ? null : id));
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando artistas...</div>;
  }

  if (!references.length) return null;

  const atLimit = selectedIds.length >= maxSelections;
  const hasLabels = groups.some((g) => g.label);

  const selectedRefs = references.filter((r) => selectedIds.includes(r.id));
  const escuela = selectedIds.length >= 2 ? computeEscuela(selectedRefs) : null;

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
              const hasProfile = !!ref.writing_strengths?.length;
              const showPreview = previewId === ref.id;

              return (
                <div
                  key={ref.id}
                  className={[
                    "rounded-lg border transition-colors text-left",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isDisabled
                        ? "border-border bg-muted/30 text-muted-foreground opacity-50"
                        : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="flex items-start">
                    <button
                      type="button"
                      onClick={() => toggle(ref.id)}
                      disabled={isDisabled}
                      className={[
                        "flex flex-col items-start gap-0.5 px-3 py-2 flex-1 text-left",
                        !isDisabled ? "cursor-pointer" : "cursor-not-allowed",
                      ].join(" ")}
                    >
                      <span className="text-sm font-medium">{ref.artist_name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 italic">
                        {ref.core_lesson ?? ref.genres.slice(0, 2).join(" · ")}
                      </span>
                    </button>

                    {hasProfile && (
                      <button
                        type="button"
                        onClick={(e) => togglePreview(ref.id, e)}
                        className={[
                          "px-2 py-2 text-xs shrink-0 transition-colors",
                          showPreview
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                        aria-label="Ver técnicas de escritura"
                      >
                        ⓘ
                      </button>
                    )}
                  </div>

                  {showPreview && hasProfile && (
                    <div className="px-3 pb-2.5 border-t border-border/40 mt-0.5">
                      <ul className="text-xs text-muted-foreground space-y-0.5 pt-1.5">
                        {ref.writing_strengths!.slice(0, 3).map((s) => (
                          <li key={s} className="flex items-start gap-1">
                            <span className="opacity-40 select-none">•</span>
                            <span>{STRENGTH_LABELS[s] ?? s}</span>
                          </li>
                        ))}
                      </ul>
                      {ref.shines_when?.[0] && (
                        <p className="text-xs text-muted-foreground/70 mt-1.5 leading-snug">
                          <span className="select-none text-primary/60">✓ </span>
                          {ref.shines_when[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {escuela && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Escuela de escritura resultante
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lo que la IA aprenderá de estas referencias, no copiará.
            </p>
          </div>
          {escuela.high.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {escuela.high.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium"
                >
                  {STRENGTH_LABELS[s]}
                </span>
              ))}
            </div>
          )}
          {escuela.complementary.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {escuela.complementary.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {STRENGTH_LABELS[s]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {atLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo {maxSelections} inspiraciones seleccionadas.
        </p>
      )}
    </div>
  );
}
