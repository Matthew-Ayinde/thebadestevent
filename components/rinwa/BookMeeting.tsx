"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ExternalLink, Mail, PenLine } from "lucide-react";
import { useTheme } from "./ThemeToggle";

// ─── Cal.com config ────────────────────────────────────────────────────────────

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK?.replace(/^\/+|\/+$/g, "");
const CAL_ORIGIN = (process.env.NEXT_PUBLIC_CAL_ORIGIN || "https://app.cal.com").replace(/\/+$/, "");
const CAL_PUBLIC = CAL_ORIGIN === "https://app.cal.com" ? "https://cal.com" : CAL_ORIGIN;
const CAL_NS = "rinwa";
const CAL_LOAD_ERROR = "rinwa:cal-load-error";
const EMBED_TIMEOUT_MS = 15000;

// Mirrors the site tokens in app/globals.css so the embed matches the active theme.
const CAL_THEME = {
  dark: {
    "cal-brand": "#7dd3cf",
    "cal-brand-emphasis": "#a5e3df",
    "cal-brand-text": "#041114",
    "cal-bg": "#07171a",
    "cal-bg-muted": "#081b1e",
    "cal-bg-subtle": "#0a1f22",
    "cal-bg-emphasis": "#0d2a2e",
    "cal-border": "#183235",
    "cal-border-subtle": "#11272a",
    "cal-border-emphasis": "#2f6a68",
    "cal-text": "#e8f0ef",
    "cal-text-emphasis": "#f5f0e8",
    "cal-text-subtle": "#a3b8b5",
    "cal-text-muted": "#7f9895",
  },
  light: {
    "cal-brand": "#0f766e",
    "cal-brand-emphasis": "#115e59",
    "cal-brand-text": "#ffffff",
    "cal-bg": "#ffffff",
    "cal-bg-muted": "#faf8f4",
    "cal-bg-subtle": "#f3efe8",
    "cal-bg-emphasis": "#e8e2d8",
    "cal-border": "#e2dcd2",
    "cal-border-subtle": "#ece7df",
    "cal-border-emphasis": "#9cc5c0",
    "cal-text": "#1c2f32",
    "cal-text-emphasis": "#0c1f22",
    "cal-text-subtle": "#4f6366",
    "cal-text-muted": "#5b6d70",
  },
};

type CalApi = (...args: unknown[]) => void;
type CalGlobal = CalApi & { loaded?: boolean; ns: Record<string, CalApi>; q: unknown[][] };

// Typed port of Cal.com's official embed bootstrap: queues calls until embed.js loads.
function ensureCal(): CalGlobal {
  const w = window as unknown as { Cal?: CalGlobal };
  if (w.Cal) return w.Cal;

  const cal = function (...args: unknown[]) {
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const script = document.createElement("script");
      script.src = `${CAL_ORIGIN}/embed/embed.js`;
      script.async = true;
      script.onerror = () => window.dispatchEvent(new Event(CAL_LOAD_ERROR));
      document.head.appendChild(script);
      cal.loaded = true;
    }
    if (args[0] === "init") {
      const namespace = args[1];
      if (typeof namespace === "string") {
        const api = function (...a: unknown[]) { (api as unknown as { q: unknown[][] }).q.push(a); } as CalApi & { q: unknown[][] };
        api.q = [];
        cal.ns[namespace] = cal.ns[namespace] || api;
        (cal.ns[namespace] as CalApi & { q: unknown[][] }).q.push(args);
        cal.q.push(["initNamespace", namespace]);
      } else {
        cal.q.push(args);
      }
      return;
    }
    cal.q.push(args);
  } as CalGlobal;

  w.Cal = cal;
  return cal;
}

function calUrl(details: Details) {
  const params = new URLSearchParams({ name: details.fullName, email: details.email, notes: details.reason });
  return `${CAL_PUBLIC}/${CAL_LINK}?${params}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Stage = "intake" | "calendar" | "done";

interface Details { fullName: string; email: string; topic: string; note: string; reason: string }
interface Booking { uid?: string; startTime?: string; endTime?: string }

const TOPICS = ["Planning an event", "Brand partnership", "Hospitality consulting", "Press & media", "Something else"];

const STEPS = CAL_LINK
  ? [
      { num: "01", label: "Introduce yourself" },
      { num: "02", label: "Choose a time" },
      { num: "03", label: "Confirmed" },
    ]
  : [
      { num: "01", label: "Introduce yourself" },
      { num: "02", label: "Request sent" },
    ];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function BookMeeting({ onExit }: { onExit: () => void }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("intake");
  const [details, setDetails] = useState<Details | null>(null);
  const [request, setRequest] = useState<{ id: string; token: string } | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  }, [stage, reduced]);

  function handleIntake(d: Details, req: { id: string; token: string }) {
    setDetails(d);
    setRequest(req);
    setStage(CAL_LINK ? "calendar" : "done");
  }

  function handleBooked(b: Booking) {
    setBooking(b);
    setStage("done");
    if (request) {
      fetch(`/api/meeting-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: request.token, ...b, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        keepalive: true,
      }).catch(() => { /* booking already confirmed by Cal.com; record update is best-effort */ });
    }
  }

  const variants = {
    enter:  { opacity: 0, y: reduced ? 0 : 30 },
    center: { opacity: 1, y: 0 },
    exit:   { opacity: 0, y: reduced ? 0 : -18 },
  };
  const transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };
  const stepIndex = stage === "intake" ? 0 : stage === "calendar" ? 1 : STEPS.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-20 pb-10 sm:pt-24 sm:pb-14">
      {/* Top bar */}
      <div className={`w-full ${stage === "calendar" ? "max-w-5xl" : "max-w-2xl"} flex items-center justify-between gap-4 mb-10 sm:mb-14 transition-[max-width] duration-500`}>
        <button
          type="button"
          onClick={stage === "calendar" ? () => setStage("intake") : onExit}
          className="group flex items-center gap-2 rounded-full border border-line bg-tint px-4 py-2.5 text-xs text-fg-muted transition hover:border-line-strong hover:bg-tint-strong hover:text-fg"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          {stage === "calendar" ? "Edit details" : "Back"}
        </button>
        <Stepper current={stepIndex} />
      </div>

      <AnimatePresence mode="wait">
        {stage === "intake" && (
          <motion.div key="intake" className="w-full max-w-2xl" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
            <Intake initial={details} existing={request} onDone={handleIntake} />
          </motion.div>
        )}
        {stage === "calendar" && details && (
          <motion.div key="calendar" className="w-full max-w-5xl" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
            <CalendarStage details={details} onEdit={() => setStage("intake")} onBooked={handleBooked} />
          </motion.div>
        )}
        {stage === "done" && details && (
          <motion.div key="done" className="w-full max-w-2xl" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
            <Confirmed details={details} booking={booking} onExit={onExit} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.num} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[0.66rem] tracking-[0.1em] transition-all duration-500 ${
                done
                  ? "border-accent bg-accent text-on-accent"
                  : active
                    ? "border-accent bg-accent/14 text-accent"
                    : "border-line text-fg-faint"
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : s.num}
            </span>
            <span className={`hidden md:inline text-[0.66rem] uppercase tracking-[0.26em] ${active ? "text-fg" : "text-fg-faint"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-4 sm:w-8 transition-colors duration-500 ${done ? "bg-accent/60" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Stage 1: Intake ───────────────────────────────────────────────────────────

const inputCls =
  "w-full min-h-[52px] rounded-2xl border bg-field px-4 py-3.5 text-fg text-sm placeholder:text-fg-faint outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_4px_var(--ring)]";

function Intake({
  initial, existing, onDone,
}: {
  initial: Details | null;
  existing: { id: string; token: string } | null;
  onDone: (d: Details, req: { id: string; token: string }) => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  const reason = topic ? `${topic} — ${note.trim()}` : note.trim();
  const errors = {
    fullName: fullName.trim().length < 2 ? "Please share your full name." : "",
    email: !EMAIL_RE.test(email.trim()) ? "Please enter a valid email address." : "",
    note: note.trim().length < 10 ? "A sentence or two helps Rinwa prepare for your conversation." : "",
  };
  const show = (k: keyof typeof errors) => touched[k] && errors[k];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, note: true });
    if (errors.fullName || errors.email || errors.note) return;

    const d: Details = { fullName: fullName.trim(), email: email.trim(), topic, note: note.trim(), reason };

    // Returning from the calendar with unchanged details — no need to create a duplicate request.
    if (existing && initial && initial.fullName === d.fullName && initial.email === d.email && initial.reason === d.reason) {
      onDone(d, existing);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/meeting-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: d.fullName, email: d.email, reason: d.reason, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      onDone(d, { id: json.id, token: json.token });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="text-[0.66rem] uppercase tracking-[0.38em] text-accent mb-5">A Private Conversation</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.02] tracking-tight text-fg outline-none"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Let&apos;s talk it through.
      </h2>
      <p className="mt-4 mb-9 max-w-lg text-[0.92rem] text-fg-muted leading-relaxed">
        Share a little about yourself and what&apos;s on your mind. Next, you&apos;ll see Rinwa&apos;s calendar
        and choose a time that suits you.
      </p>

      <section className="rounded-[2rem] border border-line bg-card backdrop-blur-xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Full name" name="name" autoComplete="name" value={fullName}
            onChange={setFullName} onBlur={() => setTouched(t => ({ ...t, fullName: true }))}
            error={show("fullName")} placeholder="Your full name"
          />
          <TextField
            label="Email" name="email" type="email" autoComplete="email" value={email}
            onChange={setEmail} onBlur={() => setTouched(t => ({ ...t, email: true }))}
            error={show("email")} placeholder="you@example.com"
          />
        </div>

        <div className="border-t border-line-soft" />

        <div>
          <FieldLabel id="topic-label">What would you like to discuss?</FieldLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="topic-label">
            {TOPICS.map(t => (
              <button
                key={t} type="button" role="radio" aria-checked={topic === t}
                onClick={() => setTopic(topic === t ? "" : t)}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${
                  topic === t
                    ? "border-accent bg-accent/14 text-accent"
                    : "border-line bg-tint text-fg-muted hover:border-line-strong hover:bg-tint-strong hover:text-fg"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <FieldLabel req>Reason for the meeting</FieldLabel>
          <textarea
            name="reason" rows={4} value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, note: true }))}
            placeholder="What would you like Rinwa to know before you meet?"
            aria-invalid={!!show("note")}
            maxLength={1200}
            className={`${inputCls} min-h-0 resize-none ${show("note") ? "border-danger/50" : "border-line"}`}
          />
          <FieldError msg={show("note")} />
        </label>

        {/* Honeypot */}
        <input
          type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
      </section>

      <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-faint leading-relaxed sm:max-w-xs">
          Your details are only used to prepare for your conversation.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="group flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-55 disabled:cursor-not-allowed"
        >
          {submitting ? "One moment…" : CAL_LINK ? "See available times" : "Request a meeting"}
          {!submitting && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
        </button>
      </div>
    </form>
  );
}

function FieldLabel({ children, req, id }: { children: React.ReactNode; req?: boolean; id?: string }) {
  return (
    <span id={id} className="block text-[0.72rem] uppercase tracking-[0.26em] text-fg-subtle mb-3">
      {children}{req && <span className="ml-1 text-accent">*</span>}
    </span>
  );
}

function FieldError({ msg }: { msg: string | false | undefined }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden pt-2 text-xs text-danger" role="alert"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function TextField({
  label, name, type = "text", value, onChange, onBlur, error, placeholder, autoComplete,
}: {
  label: string; name: string; type?: string; value: string;
  onChange: (v: string) => void; onBlur: () => void;
  error: string | false | undefined; placeholder?: string; autoComplete?: string;
}) {
  return (
    <label className="block">
      <FieldLabel req>{label}</FieldLabel>
      <input
        type={type} name={name} value={value} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} aria-invalid={!!error}
        className={`${inputCls} ${error ? "border-danger/50" : "border-line"}`}
      />
      <FieldError msg={error} />
    </label>
  );
}

// ─── Stage 2: Calendar ─────────────────────────────────────────────────────────

function CalendarStage({
  details, onEdit, onBooked,
}: {
  details: Details;
  onEdit: () => void;
  onBooked: (b: Booking) => void;
}) {
  const embedRef = useRef<HTMLDivElement>(null);
  const bookedRef = useRef(false);
  const onBookedRef = useRef(onBooked);
  onBookedRef.current = onBooked;
  const [embed, setEmbed] = useState<"loading" | "ready" | "failed">("loading");
  const theme = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  const firstName = details.fullName.split(" ")[0];

  useEffect(() => {
    const el = embedRef.current;
    if (!el || !CAL_LINK) return;

    const cal = ensureCal();
    if (!cal.ns?.[CAL_NS]) cal("init", CAL_NS, { origin: CAL_ORIGIN });
    const api = cal.ns[CAL_NS];

    const onReady = () => setEmbed("ready");
    const onFailed = () => setEmbed("failed");
    const onSuccess = (e: { detail?: { data?: Record<string, any> } }) => {
      if (bookedRef.current) return;
      bookedRef.current = true;
      const data = e?.detail?.data ?? {};
      const b = data.booking ?? data;
      onBookedRef.current({
        uid: typeof b.uid === "string" ? b.uid : undefined,
        startTime: typeof b.startTime === "string" ? b.startTime : typeof data.date === "string" ? data.date : undefined,
        endTime: typeof b.endTime === "string" ? b.endTime : undefined,
      });
    };

    const listeners = [
      { action: "linkReady", callback: onReady },
      { action: "linkFailed", callback: onFailed },
      { action: "bookingSuccessfulV2", callback: onSuccess },
      { action: "bookingSuccessful", callback: onSuccess },
    ];

    api("inline", {
      elementOrSelector: el,
      calLink: CAL_LINK,
      config: {
        layout: "month_view",
        theme: themeRef.current,
        name: details.fullName,
        email: details.email,
        notes: details.reason,
      },
    });
    api("ui", {
      theme: themeRef.current,
      layout: "month_view",
      hideEventTypeDetails: false,
      cssVarsPerTheme: CAL_THEME,
    });
    listeners.forEach(l => api("on", l));
    window.addEventListener(CAL_LOAD_ERROR, onFailed);
    const timeout = window.setTimeout(() => setEmbed(s => (s === "loading" ? "failed" : s)), EMBED_TIMEOUT_MS);

    return () => {
      listeners.forEach(l => api("off", l));
      window.removeEventListener(CAL_LOAD_ERROR, onFailed);
      window.clearTimeout(timeout);
      el.innerHTML = "";
    };
  }, [details]);

  // Re-theme the live embed in place — no reload, so a half-picked slot survives the toggle.
  useEffect(() => {
    if (CAL_LINK) ensureCal().ns?.[CAL_NS]?.("ui", { theme });
  }, [theme]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header + summary */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-end lg:gap-10">
        <div>
          <p className="text-[0.66rem] uppercase tracking-[0.38em] text-accent mb-4">Choose a Moment</p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[1.02] tracking-tight text-fg outline-none"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Whenever suits you, {firstName}.
          </h2>
          <p className="mt-4 max-w-xl text-[0.9rem] text-fg-muted leading-relaxed">
            Pick a day, then a time. Slots are shown in your local timezone, and an invite will land in your inbox.
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-line bg-card backdrop-blur-xl p-5 shadow-card">
          <div className="flex items-start gap-3">
            <Image src="/images/logo.png" alt="" width={30} height={30} className="theme-logo mt-0.5 opacity-85" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.66rem] uppercase tracking-[0.28em] text-fg-subtle">Meeting with Rinwa</p>
              <p className="mt-1 truncate text-sm text-fg">
                {details.fullName} <span className="text-fg-subtle">· {details.email}</span>
              </p>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-fg-muted line-clamp-2">{details.reason}</p>
            </div>
            <button
              type="button" onClick={onEdit} aria-label="Edit details"
              className="shrink-0 rounded-full border border-line p-2 text-accent transition hover:border-accent/40 hover:text-accent"
            >
              <PenLine size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <section
        aria-label="Rinwa's calendar"
        className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-line bg-card backdrop-blur-xl shadow-card"
      >
        <div
          ref={embedRef}
          className={`w-full p-2 sm:p-4 transition-opacity duration-700 ${embed === "ready" ? "opacity-100" : "opacity-0"}`}
          // Matching the iframe's color-scheme keeps it transparent instead of painting an opaque canvas.
          style={{ minHeight: 620, colorScheme: theme }}
        />

        <AnimatePresence>
          {embed === "loading" && (
            <motion.div key="skeleton" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0">
              <CalendarSkeleton />
            </motion.div>
          )}
          {embed === "failed" && (
            <motion.div
              key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                <CalendarDays size={22} className="text-accent" />
              </div>
              <p className="font-serif text-2xl text-fg mb-3" style={{ fontFamily: "var(--font-serif)" }}>
                The calendar is taking a moment.
              </p>
              <p className="max-w-sm text-sm text-fg-muted leading-relaxed mb-8">
                Open it in a new tab to choose your time. Your details are already filled in.
              </p>
              <a
                href={calUrl(details)} target="_blank" rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
              >
                Open Rinwa&apos;s calendar
                <ExternalLink size={14} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col p-6 sm:p-10" aria-hidden="true">
      <div className="mb-8 flex items-center justify-between">
        <div className="h-5 w-40 rounded-full bg-tint-strong animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-tint-strong animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-tint-strong animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className={`h-10 sm:h-14 rounded-xl animate-pulse ${i % 7 > 0 && i % 7 < 6 && i > 8 && i < 30 ? "bg-accent/[0.07]" : "bg-tint-soft"}`}
            style={{ animationDelay: `${(i % 7) * 80}ms` }}
          />
        ))}
      </div>
      <p className="mt-auto pt-8 text-center text-[0.66rem] uppercase tracking-[0.38em] text-accent">
        Opening Rinwa&apos;s calendar
      </p>
    </div>
  );
}

// ─── Stage 3: Confirmed ────────────────────────────────────────────────────────

function formatSlot(startTime?: string, endTime?: string) {
  if (!startTime) return null;
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return null;
  const end = endTime ? new Date(endTime) : null;
  const day = start.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = (d: Date, tz = false) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", ...(tz ? { timeZoneName: "short" } : {}) });
  return { day, time: end && !Number.isNaN(end.getTime()) ? `${time(start)} – ${time(end, true)}` : time(start, true) };
}

function Confirmed({ details, booking, onExit }: { details: Details; booking: Booking | null; onExit: () => void }) {
  const slot = formatSlot(booking?.startTime, booking?.endTime);
  const firstName = details.fullName.split(" ")[0];
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/10"
      >
        <Check size={26} className="text-accent" strokeWidth={2.5} />
      </motion.div>

      <p className="text-[0.66rem] tracking-[0.45em] text-accent mb-6">
        You&apos;ve&nbsp;Rinwa&apos;d
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[clamp(2.4rem,7vw,4.2rem)] leading-[0.98] tracking-tight text-fg mb-6 outline-none"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {booking ? <>It&apos;s in the diary, {firstName}.</> : <>Your request is with us, {firstName}.</>}
      </h2>

      {slot && (
        <div className="mb-8 w-full max-w-md rounded-[1.6rem] border border-accent/25 bg-card backdrop-blur-xl px-6 py-5 shadow-card">
          <p className="text-[0.66rem] uppercase tracking-[0.3em] text-accent mb-2">Your meeting with Rinwa</p>
          <p className="font-serif text-2xl text-fg leading-tight" style={{ fontFamily: "var(--font-serif)" }}>{slot.day}</p>
          <p className="mt-1 text-sm text-fg-muted">{slot.time}</p>
        </div>
      )}

      <p className="max-w-md text-base text-fg-muted leading-relaxed mb-3">
        {booking
          ? <>A calendar invite with the meeting details is on its way to <span className="text-fg break-all">{details.email}</span>.</>
          : <>Rinwa will be in touch at <span className="text-fg break-all">{details.email}</span> within <span className="text-fg">48 hours</span> to find a time that works.</>}
      </p>
      {booking ? (
        <p className="mb-12 inline-flex items-center gap-2 text-sm text-fg-faint italic">
          <Mail size={13} />
          Need to reschedule? Use the link in your confirmation email.
        </p>
      ) : <div className="mb-9" />}

      <button
        type="button" onClick={onExit}
        className="group inline-flex items-center gap-3 rounded-full border border-accent/35 bg-accent/10 px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition-all hover:border-accent/60 hover:bg-accent/18"
      >
        Back to start
      </button>

      <div className="mt-14 flex flex-col items-center gap-4">
        <p className="text-[0.66rem] uppercase tracking-[0.55em] text-accent">Enter Into Your Ease</p>
        <div className="flex items-center gap-4">
          <div className="h-px w-14 bg-accent/25" />
          <Image src="/images/logo.png" alt="" width={20} height={20} className="theme-logo opacity-30" />
          <div className="h-px w-14 bg-accent/25" />
        </div>
      </div>
    </div>
  );
}
