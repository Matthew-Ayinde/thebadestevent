"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { ArrowRight, Check, Wine, Sparkles, Disc3 } from "lucide-react";
import { Area, SegButtons, Reveal, Shell, ScoreScale, Field } from "./questionnaire-ui";

// ─── Design tokens ──────────────────────────────────────────────────────────────
// Same flat, hairline-bordered system as the rest of the site, using the
// house teal as this flow's accent — this is the "how did tonight feel"
// check, so it stays close to the core brand rather than borrowing the
// Homecoming flow's gold.

const TEAL = "#7dd3cf";
const CREAM_TINT = "#f5f0e8";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  welcomed: string;
  anticipatedMoment: string; anticipatedMomentDetail: string;
  caredForScore: string;
  overlookedMoment: string;
  wouldReturn: string;
  email: string;
}

const BLANK: FormData = {
  welcomed: "",
  anticipatedMoment: "", anticipatedMomentDetail: "",
  caredForScore: "",
  overlookedMoment: "",
  wouldReturn: "",
  email: "",
};

const SECTIONS = [
  { tag: "01 — First Impressions", title: "Did you feel welcomed the moment you walked in?", desc: "" },
  { tag: "02 — The Little Things",  title: "Was there a moment tonight someone anticipated something you needed, before you asked?", desc: "" },
  { tag: "03 — Beyond The Run Of Show", title: "How cared for did you feel tonight; beyond just “the event ran smoothly”?", desc: "1 is barely, 5 is completely." },
  { tag: "04 — The Honest Part",     title: "Was there any moment you felt overlooked, or unsure what to do?", desc: "Totally fine if the answer is no. This just helps us fix real gaps." },
  { tag: "05 — Last Thing",          title: "Would you come back specifically because of how you were treated, not just the lineup or venue?", desc: "" },
];

const TOTAL = SECTIONS.length;

// ─── Backdrop ───────────────────────────────────────────────────────────────────
// A quiet, code-drawn "after the room has emptied out" motif: a dot-field
// standing in for scattered string lights, two slow pulsing rings (the
// feeling of a toast, a beat lingering) and a few faint glassware/record
// icons. Same restraint as the rest of the site — thin lines, low opacity,
// no gradients beyond the single ambient ground wash.

function ExperienceBackdrop({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 70% at 50% -8%, #0d2a2f 0%, #051519 45%, #030d0f 100%)" }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${TEAL}88 1px, transparent 1.5px)`,
          backgroundSize: "26px 26px",
          opacity: 0.14,
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 40%, black 0%, transparent 72%)",
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 40%, black 0%, transparent 72%)",
        }}
      />

      {/* Slow pulsing rings — the room, breathing */}
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            borderColor: `${TEAL}33`,
            width: 520 + i * 260, height: 520 + i * 260,
            left: "50%", top: "42%", marginLeft: -(260 + i * 130), marginTop: -(260 + i * 130),
          }}
          animate={reduced ? undefined : { scale: [1, 1.06, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={reduced ? undefined : { duration: 7 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
        />
      ))}

      <div className="hidden sm:block absolute top-[16%] left-[9%] -rotate-6" style={{ color: TEAL, opacity: 0.08 }}>
        <Wine size={78} strokeWidth={0.7} />
      </div>
      <div className="hidden sm:block absolute bottom-[12%] right-[11%] rotate-[10deg]" style={{ color: CREAM_TINT, opacity: 0.07 }}>
        <Disc3 size={92} strokeWidth={0.6} />
      </div>
      <div className="hidden lg:block absolute top-[58%] left-[6%]" style={{ color: TEAL, opacity: 0.07 }}>
        <Sparkles size={56} strokeWidth={0.7} />
      </div>

      <div className="absolute inset-0 bg-[#030d0f]/38" />
    </>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function GuestExperienceQuestionnaire() {
  const reduced = useReducedMotion();
  const [step, setStep]             = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData]             = useState<FormData>(BLANK);

  function set(field: keyof FormData, value: string) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function validate(s: number): string | null {
    switch (s) {
      case 1: return data.welcomed ? null : "Please pick one.";
      case 2: return data.anticipatedMoment && (data.anticipatedMoment !== "Yes, tell us what" || data.anticipatedMomentDetail.trim())
        ? null : "Please pick one, or tell us what happened.";
      case 3: return data.caredForScore ? null : "Please pick a number from 1 to 5.";
      case 4: return null; // honest, optional counter-question
      case 5: return data.wouldReturn ? null : "Please pick one.";
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
      const res = await fetch("/api/experience", {
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
    <div className="relative" style={{ ["--accent" as any]: TEAL, ["--accent-ink" as any]: "#041114" }}>
      <Toaster position="top-center" toastOptions={{ style: { background: "#07171a", color: "#f5f0e8", border: `1px solid ${TEAL}33` } }} />

      <div className="fixed inset-0 z-0 overflow-hidden">
        <ExperienceBackdrop reduced={reduced} />
      </div>

      {step >= 1 && step <= TOTAL && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/8">
          <motion.div
            className="h-full"
            style={{ background: TEAL }}
            initial={false}
            animate={{ width: `${((step - 1) / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      )}

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
                nextLabel={submitting ? undefined : step === TOTAL ? "Share Feedback" : "Continue"}
              >
                {step === 1 && <S1 data={data} set={set} />}
                {step === 2 && <S2 data={data} set={set} />}
                {step === 3 && <S3 data={data} set={set} />}
                {step === 4 && <S4 data={data} set={set} />}
                {step === 5 && <S5 data={data} set={set} />}
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
        <p className="text-[0.6rem] uppercase tracking-[0.5em] mb-12" style={{ color: `${TEAL}a6` }}>
          Your Guest Experience
        </p>

        <h1
          className="font-serif text-[clamp(2.6rem,7.5vw,5rem)] leading-[0.95] tracking-tight text-white mb-10 max-w-3xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Tell us how tonight felt.
        </h1>

        <div className="max-w-lg space-y-4 text-[0.95rem] sm:text-base text-white/55 leading-relaxed mb-14">
          <p>Not just how it ran, how it felt.</p>
          <p>Five quick questions. Under two minutes. Completely honest, please.</p>
        </div>

        <button
          onClick={onBegin}
          className="group inline-flex items-center gap-3 rounded-md border px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] transition-colors"
          style={{ borderColor: `${TEAL}59`, background: `${TEAL}1a`, color: TEAL }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${TEAL}99`; e.currentTarget.style.background = `${TEAL}2e`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${TEAL}59`; e.currentTarget.style.background = `${TEAL}1a`; }}
        >
          Rate Tonight
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-8" style={{ border: `1px solid ${TEAL}66`, background: `${TEAL}1a` }}>
          <Check size={26} style={{ color: TEAL }} strokeWidth={2.5} />
        </div>

        <Image src="/images/logo.png" alt="RÌNWÁ" width={46} height={46} className="mx-auto mb-4 opacity-85" />
        <p className="text-[0.6rem] tracking-[0.45em] mb-12" style={{ color: `${TEAL}99` }}>
          Thank&nbsp;You
        </p>

        <h2
          className="font-serif text-[clamp(2.2rem,6.5vw,4rem)] leading-[1.05] tracking-tight text-white mb-6 max-w-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          That&apos;s exactly what we needed to hear.
        </h2>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-md mb-3">
          Every answer here goes straight to the people who plan the next one.
        </p>
        <p className="text-sm text-white/40 leading-relaxed max-w-md mb-10">
          See you at the next RÌNWÁ evening.
        </p>

        <div className="flex flex-col items-center gap-4 mt-6">
          <p className="text-[0.58rem] uppercase tracking-[0.4em]" style={{ color: `${TEAL}80` }}>The RÌNWÁ Team</p>
          <div className="flex items-center gap-4">
            <div className="h-px w-14" style={{ background: `${TEAL}40` }} />
            <Image src="/images/logo.png" alt="" width={20} height={20} className="opacity-30" />
            <div className="h-px w-14" style={{ background: `${TEAL}40` }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sections (one question per step) ──────────────────────────────────────────

function S1({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <SegButtons options={["Yes", "Somewhat", "No"]} value={data.welcomed} onPick={v => set("welcomed", v)} />
  );
}

function S2({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <SegButtons
        options={["Yes, tell us what", "No"]}
        value={data.anticipatedMoment}
        onPick={v => { set("anticipatedMoment", v); if (v !== "Yes, tell us what") set("anticipatedMomentDetail", ""); }}
      />
      <Reveal show={data.anticipatedMoment === "Yes, tell us what"}>
        <Area
          label="What happened?" name="anticipatedMomentDetail"
          value={data.anticipatedMomentDetail} onChange={e => set("anticipatedMomentDetail", e.target.value)}
          rows={3} placeholder="Tell us about the moment…"
        />
      </Reveal>
    </div>
  );
}

function S3({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <ScoreScale
      value={data.caredForScore}
      onPick={v => set("caredForScore", v)}
      lowLabel="Just okay"
      highLabel="Deeply cared for"
    />
  );
}

function S4({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <Area
      label="In your own words" name="overlookedMoment"
      value={data.overlookedMoment} onChange={e => set("overlookedMoment", e.target.value)}
      rows={4} placeholder="If nothing comes to mind, that's a good sign, leave this blank."
    />
  );
}

function S5({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <SegButtons options={["Yes", "Maybe", "No"]} value={data.wouldReturn} onPick={v => set("wouldReturn", v)} />
      <div className="mt-6 pt-6 border-t border-white/10">
        <Field
          label="Want a copy of your answers? Leave your email (optional)"
          name="email" type="email"
          value={data.email} onChange={e => set("email", e.target.value)}
          placeholder="your@email.com"
        />
      </div>
    </div>
  );
}
