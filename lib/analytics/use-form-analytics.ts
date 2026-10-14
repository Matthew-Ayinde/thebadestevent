'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readConsent } from '@/lib/consent';
import type { FormAction, FormId } from './forms';

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function send(payload: Record<string, unknown>) {
  // Only attach the visitor id when cookies were accepted; otherwise the server
  // counts the event anonymously, exactly like page views.
  const visitorId =
    readConsent() === 'all' ? document.cookie.match(/(?:^|; )rw_vid=([^;]+)/)?.[1] : undefined;
  const body = JSON.stringify({ type: 'form', ...payload, visitorId });
  try {
    if (navigator.sendBeacon?.('/api/analytics/collect', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch('/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Records a questionnaire journey from its step state:
 * step 0 is the welcome screen, 1…total are the questions, total+1 is "submitted".
 * Each step is reported once per attempt, so going back and forth doesn't inflate counts.
 */
export function useFormAnalytics(form: FormId, step: number, total: number) {
  const attempt = useRef<{ id: string; reached: Set<number> } | null>(null);

  const track = useCallback(
    (action: FormAction, stepNumber: number, message?: string) => {
      if (!attempt.current) attempt.current = { id: uid(), reached: new Set() };
      send({ form, attemptId: attempt.current.id, action, step: stepNumber, message: message?.slice(0, 160) });
    },
    [form]
  );

  useEffect(() => {
    if (step < 1) return;
    if (!attempt.current) attempt.current = { id: uid(), reached: new Set() };
    if (attempt.current.reached.has(step)) return;
    attempt.current.reached.add(step);
    if (step === total + 1) track('submit', step);
    else track(step === 1 ? 'start' : 'step', step);
  }, [step, total, track]);

  return {
    /** Call when validation blocks the visitor from moving on. */
    trackError: (stepNumber: number, message: string) => track('error', stepNumber, message),
    /** Call when the server rejects or the network drops the submission. */
    trackSubmitError: (message: string) => track('submit_error', total, message),
  };
}
