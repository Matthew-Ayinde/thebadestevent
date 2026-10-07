"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

// ─── Store ─────────────────────────────────────────────────────────────────────
// The <html data-theme> attribute is the single source of truth (set before paint by themeInitScript).

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }
  root.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* private mode — theme still applies for this visit */ }
}

// ─── Toggle ────────────────────────────────────────────────────────────────────
// Styled like the site's selection chips so it reads as part of the interface, not a floating widget.
// Placement is up to the page header via `className`.

const OPTIONS = [
  { value: "light", label: "Light mode", Icon: Sun },
  { value: "dark", label: "Dark mode", Icon: Moon },
] as const;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const pillId = useId();

  // Until the visitor picks a theme, keep following their device setting.
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if (!storedTheme()) applyTheme(mq.matches ? "light" : "dark"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Radio-group keyboard pattern: arrow keys move between options.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
      className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-tint p-1 backdrop-blur-xl ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            data-value={value}
            aria-checked={active}
            aria-label={label}
            title={label}
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(value)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "text-accent" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full border border-accent/60 bg-accent/14"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon size={14} strokeWidth={2.2} className="relative" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
