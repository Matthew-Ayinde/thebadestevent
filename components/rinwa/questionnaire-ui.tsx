"use client";

// ─── Shared Questionnaire Primitives ───────────────────────────────────────────
// One flat, hairline-bordered design system shared by every step-by-step
// intake flow on the site (Homecoming, Guest Experience, …). Deliberately
// plain: solid backgrounds, 1px borders, no glassmorphism blur, no glow
// rings, no gradients on any interactive surface. Each flow sets its own
// accent by putting `--accent: <color>` in the inline style of its root
// element — every primitive below just reads `var(--accent)`, so the same
// components work for a teal flow and a gold flow without a prop passed
// down through every layer.

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import React from "react";

export const inputCls =
  "w-full min-h-[52px] rounded-md border border-white/14 bg-white/[0.04] px-4 py-3.5 text-white text-sm placeholder:text-white/25 outline-none transition-colors duration-150";

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "var(--accent)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "";
}

export function Label({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <span className="block text-[0.68rem] uppercase tracking-[0.26em] text-white/42 mb-3">
      {children}
      {req && <span className="ml-1" style={{ color: "var(--accent)" }}>*</span>}
    </span>
  );
}

export function Field({
  label, name, type = "text", placeholder, value, onChange, req, autoFocus,
}: {
  label: string; name: string; type?: string;
  placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  req?: boolean; autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <Label req={req}>{label}</Label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder || label}
        autoFocus={autoFocus}
        className={inputCls}
        onFocus={focusOn}
        onBlur={focusOff}
      />
    </label>
  );
}

export function Area({
  label, name, placeholder, value, onChange, rows = 3,
}: {
  label: string; name: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea
        name={name} value={value} onChange={onChange} rows={rows}
        placeholder={placeholder || label}
        className={`${inputCls} min-h-0 resize-none`}
        onFocus={focusOn}
        onBlur={focusOff}
      />
    </label>
  );
}

export function SegButtons({
  label, options, value, onPick,
}: {
  label?: string; options: string[]; value: string; onPick: (v: string) => void;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex flex-col sm:flex-row gap-3">
        {options.map(opt => {
          const active = value === opt;
          return (
            <button
              key={opt} type="button"
              onClick={() => onPick(active ? "" : opt)}
              className="flex-1 py-3.5 px-4 rounded-md border text-sm font-medium transition-colors"
              style={active
                ? { borderColor: "var(--accent)", background: "var(--accent)", color: "var(--accent-ink, #041114)" }
                : { borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)" }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Chips({
  label, options, values, onToggle, multi,
}: {
  label?: string; options: string[];
  values: string | string[];
  onToggle: (v: string) => void;
  multi?: boolean;
}) {
  const active = (o: string) => Array.isArray(values) ? values.includes(o) : values === o;
  return (
    <div>
      {(label || multi) && (
        <div className="flex items-center justify-between mb-3">
          {label && <Label>{label}</Label>}
          {multi && <span className="text-[0.58rem] uppercase tracking-[0.22em] text-white/28">Select all that apply</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const isActive = active(o);
          return (
            <button
              key={o} type="button" onClick={() => onToggle(o)}
              className="rounded-full border px-4 py-2 text-sm transition-colors"
              style={isActive
                ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }
                : { borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)" }
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A 1–5 rating scale — flat numbered squares with small endpoint captions,
// used for "how much" style questions instead of a slider or a starburst.
export function ScoreScale({
  value, onPick, lowLabel, highLabel,
}: {
  value: string; onPick: (v: string) => void;
  lowLabel?: string; highLabel?: string;
}) {
  return (
    <div>
      <div className="flex gap-2 sm:gap-3">
        {["1", "2", "3", "4", "5"].map(n => {
          const active = value === n;
          return (
            <button
              key={n} type="button"
              onClick={() => onPick(active ? "" : n)}
              className="flex-1 aspect-square max-h-16 rounded-md border text-base font-semibold transition-colors"
              style={active
                ? { borderColor: "var(--accent)", background: "var(--accent)", color: "var(--accent-ink, #041114)" }
                : { borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)" }
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-2.5 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.16em] text-white/30">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

// A single numbered question inside a multi-question page — an accent-colored
// index, a prompt line standing in for what used to be a whole page's Shell
// title, an optional helper line, then the input. Blocks stack with a
// hairline divider between them (pass `last` to omit it on the final block),
// keeping the same flat, undecorated language as the rest of the system.
export function QuestionBlock({
  index, prompt, desc, last, children,
}: {
  index: number; prompt: string; desc?: string; last?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={last ? "" : "mb-7 pb-7 border-b border-white/10"}>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="shrink-0 text-[0.72rem] font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <p className="text-[0.98rem] sm:text-[1.05rem] font-medium text-white leading-snug">{prompt}</p>
          {desc && <p className="mt-1.5 text-[0.82rem] text-white/45 leading-relaxed">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pt-5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Section Shell ──────────────────────────────────────────────────────────────
// The wizard chrome around a single question: eyebrow tag + step count,
// serif title, a flat card holding the input, and back/continue controls.
// Reads `--accent` from whatever ancestor set it — no color prop needed.

export function Shell({
  tag, title, desc, step, total, onBack, onNext, submitting, isLast, nextLabel, children,
}: {
  tag: string; title: string; desc?: string;
  step: number; total: number;
  onBack: () => void; onNext: () => void;
  submitting: boolean; isLast: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-20 sm:py-24">
      <div className="w-full max-w-2xl">
        {/* Header meta */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[0.6rem] uppercase tracking-[0.38em]" style={{ color: "var(--accent)" }}>{tag}</p>
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/30">Step {step} of {total}</p>
        </div>

        {/* Section title */}
        <div className="mb-8">
          <h2
            className="font-serif text-[clamp(1.8rem,5vw,2.9rem)] leading-[1.1] tracking-tight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {title}
          </h2>
          {desc && <p className="mt-3 text-[0.9rem] text-white/50 leading-relaxed">{desc}</p>}
        </div>

        {/* Card — flat, opaque, hairline border. No blur, no glow. */}
        <div className="rounded-lg border border-white/12 bg-[#030f12] p-6 sm:p-8">
          <div className="h-[2px] w-10 mb-7" style={{ background: "var(--accent)" }} />
          {children}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-md border border-white/14 bg-white/[0.03] px-5 py-3 text-sm text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={submitting}
            className="group flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold text-[#041114] transition-[filter] hover:[filter:brightness(1.1)] disabled:opacity-55 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)" }}
          >
            {submitting ? "Sending…" : (nextLabel ?? (isLast ? "Submit" : "Continue"))}
            {!submitting && (
              isLast
                ? <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                : <ChevronRight size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
