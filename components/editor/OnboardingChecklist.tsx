"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  const nextStep = STEPS.find((s) => !completed.has(s.key));

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-xl border bg-background shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">
          {allDone ? "🎉 ¡Ya conoces el flujo!" : "Conoce el flujo"}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground text-sm leading-none px-1"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {STEPS.map((step) => {
          const done = completed.has(step.key);
          const isNext = !allDone && step === nextStep;
          return (
            <div key={step.key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm shrink-0 transition-colors ${
                    done ? "text-primary" : "text-muted-foreground/30"
                  }`}
                >
                  {done ? "✓" : "○"}
                </span>
                <span
                  className={`text-sm transition-colors ${
                    done
                      ? "text-muted-foreground line-through"
                      : isNext
                      ? "font-medium"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {isNext && (
                <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                  {step.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!allDone && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Omitir recorrido
          </button>
        </div>
      )}
    </div>
  );
}
