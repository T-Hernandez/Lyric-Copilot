"use client";

import { useEffect, useState } from "react";
import type { OnboardingStep } from "@/hooks/useOnboarding";

type Step = {
  key: OnboardingStep;
  label: string;
  hint: string;
};

const STEPS: Step[] = [
  {
    key: "write",
    label: "Escribir algo",
    hint: "Escribe una idea o genera un borrador con IA.",
  },
  {
    key: "review",
    label: "Pedir feedback",
    hint: 'Usa "Pedir feedback" en la barra de herramientas.',
  },
  {
    key: "rewrite",
    label: "Reescribir una parte",
    hint: "Selecciona texto en el editor para reescribirlo.",
  },
  {
    key: "compare",
    label: "Comparar versiones",
    hint: "Abre el Historial y compara dos versiones.",
  },
];

type Props = {
  completed: Set<OnboardingStep>;
  allDone: boolean;
  onDismiss: () => void;
};

export function OnboardingChecklist({ completed, allDone, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  const doneCount = STEPS.filter((s) => completed.has(s.key)).length;
  const nextStep = STEPS.find((s) => !completed.has(s.key));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/90 backdrop-blur-sm shadow-sm text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center shrink-0 opacity-60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ opacity: doneCount / STEPS.length }} />
        </span>
        <span>Conoce el flujo</span>
        <span className="opacity-40">{doneCount}/{STEPS.length}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-56 rounded-xl border bg-background/95 backdrop-blur-sm shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-medium text-foreground/80">
          {allDone ? "¡Ya conoces el flujo!" : "Conoce el flujo"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-muted-foreground hover:text-foreground text-xs px-1 leading-none transition-colors"
            aria-label="Colapsar"
          >
            −
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground text-xs px-1 leading-none transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {STEPS.map((step) => {
          const done = completed.has(step.key);
          const isNext = !allDone && step === nextStep;
          return (
            <div key={step.key} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs shrink-0 transition-colors ${
                    done ? "text-primary" : "text-muted-foreground/25"
                  }`}
                >
                  {done ? "✓" : "○"}
                </span>
                <span
                  className={`text-xs transition-colors leading-snug ${
                    done
                      ? "text-muted-foreground/40 line-through"
                      : isNext
                      ? "text-foreground/80 font-medium"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {isNext && (
                <p className="text-xs text-muted-foreground/60 pl-4 leading-relaxed">
                  {step.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!allDone && (
        <div className="px-3 pb-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Omitir
          </button>
        </div>
      )}
    </div>
  );
}
