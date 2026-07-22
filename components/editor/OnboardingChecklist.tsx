"use client";

import { useEffect } from "react";
import type { OnboardingStep } from "@/hooks/useOnboarding";

const STEPS: { key: OnboardingStep; label: string; hint: string }[] = [
  { key: "write",   label: "Escribir",        hint: "Escribe una idea o genera un borrador con IA." },
  { key: "review",  label: "Pedir feedback",  hint: "Pulsa \"Pedir feedback\" en la barra de herramientas." },
  { key: "rewrite", label: "Reescribir",      hint: "Selecciona texto en el editor para reescribirlo." },
  { key: "compare", label: "Comparar",        hint: "Abre el Historial y compara dos versiones." },
];

type Props = {
  completed: Set<OnboardingStep>;
  allDone: boolean;
  onDismiss: () => void;
};

export function OnboardingChecklist({ completed, allDone, onDismiss }: Props) {
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  const nextIdx = STEPS.findIndex((s) => !completed.has(s.key));

  return (
    <div className="border-b bg-muted/20">
      <div className="max-w-2xl mx-auto px-6 py-2.5">
        <div className="flex items-center gap-3">
          {/* Stepper */}
          <div className="flex items-center flex-1 min-w-0">
            {STEPS.map((step, idx) => {
              const done = completed.has(step.key);
              const isCurrent = !allDone && idx === nextIdx;

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={[
                        "w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold transition-colors",
                        done
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "ring-2 ring-primary text-primary bg-background"
                          : "border border-border/40 text-muted-foreground/30 bg-background",
                      ].join(" ")}
                    >
                      {done ? "✓" : idx + 1}
                    </div>
                    <span
                      className={[
                        "text-xs whitespace-nowrap transition-colors",
                        done
                          ? "text-muted-foreground/35 line-through"
                          : isCurrent
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/35",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <div
                      className={[
                        "h-px w-5 mx-2.5 shrink-0 transition-colors",
                        idx < nextIdx || allDone ? "bg-primary/25" : "bg-border/40",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {allDone ? (
            <span className="text-xs text-primary font-medium shrink-0">¡Listo!</span>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[10px] text-muted-foreground/35 hover:text-muted-foreground transition-colors shrink-0"
            >
              Omitir
            </button>
          )}
        </div>

        {!allDone && nextIdx >= 0 && (
          <p className="text-[10px] text-muted-foreground/60 mt-1.5 leading-none">
            → {STEPS[nextIdx].hint}
          </p>
        )}
      </div>
    </div>
  );
}
