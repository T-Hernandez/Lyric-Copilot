"use client";

import { useState, useCallback, useEffect } from "react";

export type OnboardingStep = "write" | "review" | "rewrite" | "compare";

const STORAGE_KEY = "lc_onboarding_v1";
const ALL_STEPS: OnboardingStep[] = ["write", "review", "rewrite", "compare"];

type StoredState = {
  completed: OnboardingStep[];
  dismissed: boolean;
};

function load(): StoredState {
  if (typeof window === "undefined") return { completed: [], dismissed: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : { completed: [], dismissed: false };
  } catch {
    return { completed: [], dismissed: false };
  }
}

function persist(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useOnboarding() {
  const [completed, setCompleted] = useState<Set<OnboardingStep>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const state = load();
    setCompleted(new Set(state.completed));
    setDismissed(state.dismissed);
  }, []);

  const complete = useCallback((step: OnboardingStep) => {
    setCompleted((prev) => {
      if (prev.has(step)) return prev;
      const next = new Set(prev);
      next.add(step);
      const stored = load();
      persist({ ...stored, completed: [...next] });
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    const stored = load();
    persist({ ...stored, dismissed: true });
  }, []);

  const allDone = ALL_STEPS.every((s) => completed.has(s));

  return { completed, dismissed, allDone, complete, dismiss };
}
