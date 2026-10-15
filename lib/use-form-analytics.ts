'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { FormAction, FormId } from './analytics-forms';

// The server ties these events to the visitor (or counts them anonymously
// without cookie consent), so nothing identifying is sent from here.

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify({ t: 'form', ...payload });
  if (navigator.sendBeacon?.('/api/analytics/collect', body)) return;
  fetch('/api/analytics/collect', { method: 'POST', body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
}

function useTracker(form: FormId) {
  const attempt = useRef<{ id: string; reached: Set<number> } | null>(null);

  const track = useCallback(
    (action: FormAction, step: number, message?: string) => {
      if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;
      if (!attempt.current) attempt.current = { id: uid(), reached: new Set() };
      send({ form, attemptId: attempt.current.id, action, step, message: message?.slice(0, 160) });
    },
    [form]
  );

  /** Records reaching `step` once per attempt, so going back and forth doesn't inflate counts. */
  const reach = useCallback(
    (step: number, total: number) => {
      if (!attempt.current) attempt.current = { id: uid(), reached: new Set() };
      if (attempt.current.reached.has(step)) return;
      attempt.current.reached.add(step);
      track(step === total + 1 ? 'submit' : step === 1 ? 'start' : 'step', step);
    },
    [track]
  );

  /** Starts a fresh attempt, e.g. when a modal form is reopened after a submission. */
  const reset = useCallback(() => {
    attempt.current = null;
  }, []);

  return { track, reach, reset };
}

/**
 * Multi-step forms: pass the current step (0 = intro, 1…total = steps, total+1 = submitted).
 */
export function useFormAnalytics(form: FormId, step: number, total: number) {
  const { track, reach } = useTracker(form);

  useEffect(() => {
    if (step >= 1) reach(step, total);
  }, [step, total, reach]);

  return {
    /** Call when validation blocks the visitor from moving on. */
    trackError: (stepNumber: number, message: string) => track('error', stepNumber, message),
    /** Call when the server rejects or the network drops the submission. */
    trackSubmitError: (message: string) => track('submit_error', total, message),
  };
}

/**
 * Single-page forms: "started" is the first interaction, "submitted" a successful submission.
 */
export function useSimpleFormAnalytics(form: FormId) {
  const { track, reach, reset } = useTracker(form);
  return {
    /** Wire to the form's onFocus (focus events bubble in React) or call when a modal opens. */
    markStarted: () => reach(1, 1),
    markSubmitted: () => reach(2, 1),
    trackError: (message: string) => track('error', 1, message),
    trackSubmitError: (message: string) => track('submit_error', 1, message),
    reset,
  };
}
