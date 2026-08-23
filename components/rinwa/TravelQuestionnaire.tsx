"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowRight, ChevronLeft, ChevronRight, Check,
  MessageCircle, Instagram, Facebook, Twitter, Music2, Link as LinkIcon,
} from "lucide-react";

// ─── Design tokens ──────────────────────────────────────────────────────────────
// Same theme as the rest of the site (dark ground, serif display type, thin
// borders, uppercase tracked labels) with a warmer, lighter accent — gold
// instead of teal — to give this flow its own identity. No gradients.

const GOLD = "#e8c07a";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  contactMethod: string; contactValue: string;
  visitorType: string;
  timeframe: string;
  familyAware: string;
  reason: string; reasonOther: string;
  challenges: string[]; challengesOther: string;
  wantsHelp: string;
  excitedFor: string[]; excitedForOther: string;
  heardOfDWL: string;
}

const BLANK: FormData = {
  name: "",
  contactMethod: "", contactValue: "",
  visitorType: "",
  timeframe: "",
  familyAware: "",
  reason: "", reasonOther: "",
  challenges: [], challengesOther: "",
  wantsHelp: "",
  excitedFor: [], excitedForOther: "",
  heardOfDWL: "",
};

const REASONS = ["Reconnect with family", "Explore the city", "Business opportunities", "Wedding celebrations", "Relocating decisions", "Other"];
const CHALLENGES = [
  "Getting from the airport without hassle", "Traffic / getting around", "Eating well consistently",
  "Finding good accommodation", "Knowing who to trust for help", "Building solid connections",
  "Just not knowing where to start", "Other",
];
const EXCITEMENTS = [
  "Curated nightlife", "Private / exclusive social clubs", "Cultural experiences",
  "Weddings & social events", "Business / networking", "Wellness / rest", "Local food & dining", "Other",
];

const SECTIONS = [
  { tag: "01 — Let's Start",        title: "What should we call you?",                                            desc: "" },
  { tag: "02 — Stay In Touch",      title: "How can we reach you?",                                               desc: "Pick whichever works best for you." },
  { tag: "03 — Your Journey",       title: "Is this your first time visiting, or are you a returner?",           desc: "" },
  { tag: "04 — Timing",             title: "Roughly what timeframe are you thinking?",                            desc: "An estimate is fine, nothing's locked in." },
  { tag: "05 — The Surprise",       title: "Does your family or friends here know you're coming?",                desc: "Or is this a surprise for them?" },
  { tag: "06 — The Why",            title: "Why are you coming?",                                                 desc: "" },
  { tag: "07 — The Friction",       title: "What might make your trip harder than it needs to be?",              desc: "Pick as many as apply." },
  { tag: "08 — A Little Help",      title: "Would you want help with things like airport pickup or getting around?", desc: "" },
  { tag: "09 — The Fun Part",       title: "What are you excited to experience?",                                 desc: "Pick as many as apply." },
  { tag: "10 — Last Thing",         title: "Have you heard of Diaspora Week Lagos?",                              desc: "" },
];

const TOTAL = SECTIONS.length;

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Questions() {
  const reduced = useReducedMotion();
  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData]           = useState<FormData>(BLANK);

  function set(field: keyof FormData, value: string) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function toggle(field: keyof FormData, value: string) {
    setData(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  function validate(s: number): string | null {
    switch (s) {
      case 1: return data.name.trim() ? null : "Let us know what to call you.";
      case 2: return data.contactMethod && data.contactValue.trim() ? null : "Please choose how to reach you and share the detail.";
      case 3: return data.visitorType ? null : "Please pick one.";
      case 4: return data.timeframe ? null : "Please pick a rough timeframe.";
      case 5: return data.familyAware ? null : "Please pick one.";
      case 6: return data.reason && (data.reason !== "Other" || data.reasonOther.trim()) ? null : "Please tell us why you're coming.";
      case 7: return data.challenges.length && (!data.challenges.includes("Other") || data.challengesOther.trim()) ? null : "Pick at least one, or tell us more.";
      case 8: return data.wantsHelp ? null : "Please pick one.";
      case 9: return data.excitedFor.length && (!data.excitedFor.includes("Other") || data.excitedForOther.trim()) ? null : "Pick at least one, or tell us more.";
      case 10: return data.heardOfDWL ? null : "Please pick one.";
      default: return null;
    }
  }

  function next() {
    const error = validate(step);
    if (error) {
      toast.error(error);
      return;
    }
    setStep(s => s + 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function back() {
    setStep(s => s - 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function submit() {
    const error = validate(step);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/homecoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      setStep(TOTAL + 1);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const variants = {
    enter:  { opacity: 0, y: reduced ? 0 : 30 },
    center: { opacity: 1, y: 0 },
    exit:   { opacity: 0, y: reduced ? 0 : -18 },
  };
  const transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any };

  return (
    <div className="relative">
      <Toaster position="top-center" toastOptions={{ style: { background: "#07171a", color: "#f5f0e8", border: `1px solid ${GOLD}33` } }} />

      {/* Fixed background image */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/questionnaire-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-[#041114]/83" />
      </div>

      {/* Progress bar */}
      {step >= 1 && step <= TOTAL && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/8">
          <motion.div
            className="h-full"
            style={{ background: GOLD }}
            initial={false}
            animate={{ width: `${((step - 1) / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <WelcomeScreen onBegin={() => setStep(1)} />
            </motion.div>
          )}

          {step >= 1 && step <= TOTAL && (
            <motion.div key={`s${step}`} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <Shell
                tag={SECTIONS[step - 1].tag}
                title={SECTIONS[step - 1].title}
                desc={SECTIONS[step - 1].desc}
                step={step}
                total={TOTAL}
                onBack={back}
                onNext={step < TOTAL ? next : submit}
                submitting={submitting}
                isLast={step === TOTAL}
              >
                {step === 1 && <S1 data={data} set={set} />}
                {step === 2 && <S2 data={data} set={set} />}
                {step === 3 && <S3 data={data} set={set} />}
                {step === 4 && <S4 data={data} set={set} />}
                {step === 5 && <S5 data={data} set={set} />}
                {step === 6 && <S6 data={data} set={set} />}
                {step === 7 && <S7 data={data} set={set} toggle={toggle} />}
                {step === 8 && <S8 data={data} set={set} />}
                {step === 9 && <S9 data={data} set={set} toggle={toggle} />}
                {step === 10 && <S10 data={data} set={set} />}
              </Shell>
            </motion.div>
          )}

          {step === TOTAL + 1 && (
            <motion.div key="done" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <SuccessScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Screens ───────────────────────────────────────────────────────────────────

function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <Image src="/images/logo.png" alt="RÌNWÁ" width={56} height={56} className="mx-auto mb-5 opacity-90" />
        <p className="text-[0.6rem] uppercase tracking-[0.5em] mb-12" style={{ color: `${GOLD}a6` }}>
          Diaspora Week Lagos · December 2026
        </p>

        <h1
          className="font-serif text-[clamp(3rem,8.5vw,6rem)] leading-[0.9] tracking-tight text-white mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Home is calling!
        </h1>
        <h2
          className="font-serif text-[clamp(1.6rem,4.5vw,2.75rem)] leading-[1.05] tracking-tight mb-10"
          style={{ fontFamily: "var(--font-serif)", color: GOLD }}
        >
          Lagos is getting ready for you.
        </h2>

        <div className="max-w-lg space-y-4 text-[0.95rem] sm:text-base text-white/55 leading-relaxed mb-14">
          <p>
            Whether you're visiting or still deciding, let's figure out what would make
            the end of 2026 feel easier for you.
          </p>
        </div>

        <button
          onClick={onBegin}
          className="group inline-flex items-center gap-3 rounded-full border px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] transition-all"
          style={{ borderColor: `${GOLD}59`, background: `${GOLD}1a`, color: GOLD }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}99`; e.currentTarget.style.background = `${GOLD}2e`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${GOLD}59`; e.currentTarget.style.background = `${GOLD}1a`; }}
        >
          Let's Begin
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}

function ShareRow() {
  const shareUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "https://rinwahospitality.com");
  const shareText = "Home is calling — I just checked in with RÌNWÁ for the holidays in Lagos. You should too:";

  async function copyLink(label: string) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Link copied, paste it into your ${label} story`);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  const iconBtn =
    "flex items-center justify-center w-11 h-11 rounded-full border border-white/12 bg-white/5 text-white/60 transition-all hover:text-[var(--gold)]";

  return (
    <div className="flex flex-col items-center gap-4" style={{ ["--gold" as any]: GOLD }}>
      <div className="flex items-center justify-center gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}72`; e.currentTarget.style.background = `${GOLD}14`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
        >
          <MessageCircle size={18} />
        </a>
        <button
          type="button" onClick={() => copyLink("Instagram")}
          aria-label="Copy link for Instagram"
          className={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}72`; e.currentTarget.style.background = `${GOLD}14`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
        >
          <Instagram size={18} />
        </button>
        <button
          type="button" onClick={() => copyLink("TikTok")}
          aria-label="Copy link for TikTok"
          className={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}72`; e.currentTarget.style.background = `${GOLD}14`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
        >
          <Music2 size={18} />
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}72`; e.currentTarget.style.background = `${GOLD}14`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
        >
          <Facebook size={18} />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Share on X"
          className={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}72`; e.currentTarget.style.background = `${GOLD}14`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
        >
          <Twitter size={18} />
        </a>
      </div>
      <button
        type="button"
        onClick={() => copyLink("story")}
        className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition"
      >
        <LinkIcon size={12} />
        Or just copy the link
      </button>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-8" style={{ border: `1px solid ${GOLD}66`, background: `${GOLD}1a` }}>
          <Check size={26} style={{ color: GOLD }} strokeWidth={2.5} />
        </div>

        <Image src="/images/logo.png" alt="RÌNWÁ" width={46} height={46} className="mx-auto mb-4 opacity-85" />
        <p className="text-[0.6rem] tracking-[0.45em] mb-12" style={{ color: `${GOLD}99` }}>
          You&apos;re&nbsp;Checked&nbsp;In
        </p>

        <h2
          className="font-serif text-[clamp(2.2rem,6.5vw,4rem)] leading-[1.05] tracking-tight text-white mb-6 max-w-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Thank you for your time!<br />We&apos;d get to you soon.
        </h2>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-md mb-3">
          Before that, we bet you&apos;d have at least one person coming home this holiday.
        </p>
        <p className="text-sm text-white/40 leading-relaxed max-w-md mb-10">
          Help spread the word by sharing this link with them directly, or on your stories.
        </p>

        <ShareRow />

        <div className="flex flex-col items-center gap-4 mt-16">
          <p className="text-[0.58rem] uppercase tracking-[0.4em]" style={{ color: `${GOLD}80` }}>The RÌNWÁ Team</p>
          <div className="flex items-center gap-4">
            <div className="h-px w-14" style={{ background: `${GOLD}40` }} />
            <Image src="/images/logo.png" alt="" width={20} height={20} className="opacity-30" />
            <div className="h-px w-14" style={{ background: `${GOLD}40` }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Section Shell ──────────────────────────────────────────────────────────────

function Shell({
  tag, title, desc, step, total, onBack, onNext, submitting, isLast, children,
}: {
  tag: string; title: string; desc: string;
  step: number; total: number;
  onBack: () => void; onNext: () => void;
  submitting: boolean; isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-20 sm:py-24">
      <div className="w-full max-w-2xl">
        {/* Header meta */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[0.6rem] uppercase tracking-[0.38em]" style={{ color: `${GOLD}b3` }}>{tag}</p>
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

        {/* Card */}
        <div className="rounded-[2rem] border border-white/10 bg-[#041114]/72 backdrop-blur-xl p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
          {children}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={submitting}
            className="group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition disabled:opacity-55 disabled:cursor-not-allowed"
            style={{ background: GOLD, color: "#041114" }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "#f0ce9a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD; }}
          >
            {submitting ? "Checking In…" : isLast ? "Check In" : "Continue"}
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

// ─── Input Primitives ──────────────────────────────────────────────────────────

const inputCls =
  "w-full min-h-[52px] rounded-2xl border border-white/10 bg-[#07171a]/90 px-4 py-3.5 text-white text-sm placeholder:text-white/22 outline-none transition focus:shadow-[0_0_0_4px_rgba(232,192,122,0.09)]";

function Label({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <span className="block text-[0.68rem] uppercase tracking-[0.26em] text-white/42 mb-3">
      {children}{req && <span className="ml-1" style={{ color: `${GOLD}99` }}>*</span>}
    </span>
  );
}

function Field({
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
        onFocus={e => { e.currentTarget.style.borderColor = `${GOLD}80`; }}
        onBlur={e => { e.currentTarget.style.borderColor = ""; }}
      />
    </label>
  );
}

function Area({
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
        onFocus={e => { e.currentTarget.style.borderColor = `${GOLD}80`; }}
        onBlur={e => { e.currentTarget.style.borderColor = ""; }}
      />
    </label>
  );
}

function SegButtons({
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
              className="flex-1 py-3.5 px-4 rounded-2xl border text-sm font-medium transition-all"
              style={active
                ? { borderColor: GOLD, background: `${GOLD}1f`, color: GOLD }
                : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }
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

function Chips({
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
              className="rounded-full border px-4 py-2 text-sm transition-all"
              style={isActive
                ? { borderColor: GOLD, background: `${GOLD}1f`, color: GOLD }
                : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }
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

function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
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

// ─── Sections (one question per step) ──────────────────────────────────────────

function S1({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <Field
      label="Your Name" name="name" value={data.name}
      onChange={e => set("name", e.target.value)}
      placeholder="What should we call you?" req autoFocus
    />
  );
}

function S2({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const methodMeta: Record<string, { label: string; type: string; placeholder: string }> = {
    WhatsApp: { label: "WhatsApp Number", type: "tel", placeholder: "+234 xxx xxx xxxx" },
    Email:    { label: "Email Address",   type: "email", placeholder: "your@email.com" },
    Phone:    { label: "Phone Number",    type: "tel", placeholder: "+234 xxx xxx xxxx" },
  };
  const meta = methodMeta[data.contactMethod];
  return (
    <div className="space-y-1">
      <SegButtons options={["WhatsApp", "Email", "Phone"]} value={data.contactMethod} onPick={v => { set("contactMethod", v); set("contactValue", ""); }} />
      <Reveal show={!!data.contactMethod}>
        {meta && (
          <Field
            label={meta.label} name="contactValue" type={meta.type}
            value={data.contactValue} onChange={e => set("contactValue", e.target.value)}
            placeholder={meta.placeholder} req
          />
        )}
      </Reveal>
    </div>
  );
}

function S3({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <SegButtons options={["First timer", "Returnee"]} value={data.visitorType} onPick={v => set("visitorType", v)} />
  );
}

function S4({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <Chips
      options={["September", "October", "November", "December", "Still deciding"]}
      values={data.timeframe}
      onToggle={v => set("timeframe", data.timeframe === v ? "" : v)}
    />
  );
}

function S5({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <SegButtons
      options={["They know", "It's a surprise", "Some know, not all"]}
      value={data.familyAware}
      onPick={v => set("familyAware", v)}
    />
  );
}

function S6({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <Chips options={REASONS} values={data.reason} onToggle={v => set("reason", data.reason === v ? "" : v)} />
      <Reveal show={data.reason === "Other"}>
        <Area label="Tell us more" name="reasonOther" value={data.reasonOther} onChange={e => set("reasonOther", e.target.value)} rows={2} placeholder="What's bringing you home?" />
      </Reveal>
    </div>
  );
}

function S7({
  data, set, toggle,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <Chips options={CHALLENGES} values={data.challenges} onToggle={v => toggle("challenges", v)} multi />
      <Reveal show={data.challenges.includes("Other")}>
        <Area label="Tell us more" name="challengesOther" value={data.challengesOther} onChange={e => set("challengesOther", e.target.value)} rows={2} placeholder="What else might get in the way?" />
      </Reveal>
    </div>
  );
}

function S8({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <SegButtons options={["Yes", "No", "Maybe"]} value={data.wantsHelp} onPick={v => set("wantsHelp", v)} />
  );
}

function S9({
  data, set, toggle,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <Chips options={EXCITEMENTS} values={data.excitedFor} onToggle={v => toggle("excitedFor", v)} multi />
      <Reveal show={data.excitedFor.includes("Other")}>
        <Area label="Tell us more" name="excitedForOther" value={data.excitedForOther} onChange={e => set("excitedForOther", e.target.value)} rows={2} placeholder="What else are you looking forward to?" />
      </Reveal>
    </div>
  );
}

function S10({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <SegButtons options={["Yes", "No"]} value={data.heardOfDWL} onPick={v => set("heardOfDWL", v)} />
  );
}
