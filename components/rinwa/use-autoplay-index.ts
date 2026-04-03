"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a carousel index moving at a steady, cinematic pace.
 * The hook is intentionally small so multiple components can reuse the same autoplay behavior.
 */
export function useAutoplayIndex(length: number, intervalMs: number, paused = false) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, length, paused]);

  const next = () => setIndex((current) => (current + 1) % length);
  const prev = () => setIndex((current) => (current - 1 + length) % length);

  return { index, setIndex, next, prev };
}
