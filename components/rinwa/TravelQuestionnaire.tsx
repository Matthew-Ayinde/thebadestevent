"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowRight, Check,
  MessageCircle, Instagram, Facebook, Twitter, Music2, Link as LinkIcon,
  Compass, Globe2, Luggage, MapPin, Ticket, Navigation,
} from "lucide-react";
import { Field, Area, SegButtons, Chips, Reveal, Shell, QuestionBlock } from "./questionnaire-ui";

// ─── Design tokens ──────────────────────────────────────────────────────────────
// Same theme as the rest of the site (dark ground, serif display type, thin
// borders, uppercase tracked labels) with a warmer, lighter accent — gold
// instead of teal — to give this flow its own identity. No gradients.

const GOLD = "#e8c07a";
const CREAM = "#f5f0e8";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  contactMethod: string; contactValue: string;
  residence: string; residenceOther: string;
  visitorType: string;
  timeframe: string;
  familyAware: string;
  reason: string; reasonOther: string;
  challenges: string[]; challengesOther: string;
  wantsHelp: string;
  excitedFor: string[]; excitedForOther: string;
}

const BLANK: FormData = {
  name: "",
  contactMethod: "", contactValue: "",
  residence: "", residenceOther: "",
  visitorType: "",
  timeframe: "",
  familyAware: "",
  reason: "", reasonOther: "",
  challenges: [], challengesOther: "",
  wantsHelp: "",
  excitedFor: [], excitedForOther: "",
};

const RESIDENCES = ["Canada", "UK", "USA", "Other"];
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

// Three themed pages, each holding several numbered QuestionBlocks (see
// ./questionnaire-ui) — a group of related questions per screen instead of
// one screen per question, so the whole flow is three pages, not eleven.
const PAGES = [
  { tag: "01 — About You",          title: "Let's start with the basics",         desc: "A few details so we know who we're planning for." },
  { tag: "02 — Your Trip",          title: "Now, tell us about the trip",          desc: "Rough details are perfectly fine, nothing's locked in." },
  { tag: "03 — Making It Easier",   title: "Help us make it easier for you",       desc: "The more honest you are, the more useful this is." },
];

const TOTAL = PAGES.length;

// ─── Travel Backdrop ────────────────────────────────────────────────────────────
// A bold, code-drawn travel motif standing in for the missing photo: a faint
// world-map dot field, animated flight-route arcs between "cities", a slow
// turning compass and drifting globe, scattered travel iconography, and a few
// large planes drifting across the whole viewport — one departing, one
// arriving home, one distant overhead. Everything sits well under the
// foreground card's own opacity, and drops to a static, non-looping frame
// under prefers-reduced-motion.

const FLIGHT_ROUTES = [
  "M -60 620 C 300 420, 700 500, 1000 280 S 1500 120, 1700 60",
  "M 1660 780 C 1300 700, 950 760, 650 560 S 150 260, -60 180",
  "M 200 40 C 500 190, 850 150, 1150 340 S 1500 630, 1680 700",
];

const FLIGHT_NODES: [number, number][] = [
  [-60, 620], [1000, 280], [1700, 60],
  [1660, 780], [-60, 180],
  [200, 40], [1680, 700],
];

// A proper solid airplane silhouette (the classic aviation glyph, nose to the
// right at rotate 0) — unlike lucide's thin open-line plane icons, this reads
// cleanly as "an airplane" at any size and any rotation.
function AirplaneIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size * (512 / 576)} viewBox="0 0 576 512" fill="currentColor">
      <path d="M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64l-116.6 0L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1l-56.2 0c-10.6 0-18.3-10.2-15.4-20.4l49-171.6L112 320 68.8 377.6c-3 4-7.8 6.4-12.8 6.4l-42 0c-7.8 0-14-6.3-14-14c0-1.3 .2-2.6 .5-3.9L32 256 .5 145.9c-.3-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14l42 0c5 0 9.8 2.4 12.8 6.4L112 192l102.9 0-49-171.6C162.9 10.2 170.6 0 181.2 0l56.2 0c11.5 0 22.1 6.1 27.8 16.1L365.7 192l116.6 0z" />
    </svg>
  );
}

function FlyingPlane({
  reduced, from, to, rotate, size, color, opacity, duration, delay,
}: {
  reduced: boolean | null;
  from: { left: string; top: string };
  to: { left: string; top: string };
  rotate: number; size: number; color: string; opacity: number; duration: number; delay: number;
}) {
  if (reduced) {
    return (
      <div
        className="absolute"
        style={{ left: from.left, top: from.top, color, opacity: opacity * 0.8, transform: `rotate(${rotate}deg)` }}
      >
        <AirplaneIcon size={size} />
      </div>
    );
  }
  // from → to is linear in both left% and top%, so the pixel-space path is a
  // straight line — the nose angle is held fixed at that line's true heading
  // for the whole flight, so the plane always visibly flies where it points.
  return (
    <motion.div
      className="absolute"
      style={{ color, opacity }}
      initial={{ left: from.left, top: from.top }}
      animate={{ left: [from.left, to.left], top: [from.top, to.top] }}
      transition={{ duration, repeat: Infinity, ease: "linear", delay }}
    >
      <div style={{ transform: `rotate(${rotate}deg)` }}>
        <AirplaneIcon size={size} />
      </div>
    </motion.div>
  );
}

function TravelBackdrop({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      {/* Ground */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 70% at 50% -8%, #0d2a2f 0%, #051519 45%, #030d0f 100%)" }}
      />

      {/* World dot-map texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${GOLD}88 1px, transparent 1.5px)`,
          backgroundSize: "28px 28px",
          opacity: 0.16,
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 38%, black 0%, transparent 72%)",
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 38%, black 0%, transparent 72%)",
        }}
      />

      {/* Flight routes + waypoints */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none">
        {FLIGHT_ROUTES.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke={GOLD}
            strokeWidth={1.25}
            strokeDasharray="2 14"
            strokeLinecap="round"
            opacity={0.22}
            animate={reduced ? undefined : { strokeDashoffset: [0, -320] }}
            transition={reduced ? undefined : { duration: 26 + i * 6, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {FLIGHT_NODES.map(([x, y], i) => (
          <motion.circle
            key={i} cx={x} cy={y} r={3.5} fill={GOLD}
            initial={{ opacity: 0.35 }}
            animate={reduced ? undefined : { opacity: [0.25, 0.7, 0.25], scale: [1, 1.6, 1] }}
            transition={reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          />
        ))}
      </svg>

      {/* Slow-turning compass */}
      <motion.div
        className="absolute -top-24 -right-24 sm:-top-16 sm:-right-16"
        style={{ color: GOLD, opacity: 0.07 }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <Compass size={420} strokeWidth={0.6} />
      </motion.div>

      {/* Drifting globe */}
      <motion.div
        className="absolute -bottom-20 -left-16 sm:-bottom-24 sm:-left-20"
        style={{ color: CREAM, opacity: 0.06 }}
        animate={reduced ? undefined : { y: [0, -14, 0] }}
        transition={reduced ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <Globe2 size={340} strokeWidth={0.6} />
      </motion.div>

      {/* Scattered travel iconography */}
      <div className="hidden sm:block absolute top-[14%] left-[8%] -rotate-12" style={{ color: GOLD, opacity: 0.08 }}>
        <Ticket size={90} strokeWidth={0.7} />
      </div>
      <div className="hidden sm:block absolute bottom-[10%] right-[10%] rotate-[8deg]" style={{ color: CREAM, opacity: 0.07 }}>
        <Luggage size={90} strokeWidth={0.7} />
      </div>
      <div className="hidden lg:block absolute top-[55%] left-[4%]" style={{ color: GOLD, opacity: 0.06 }}>
        <MapPin size={64} strokeWidth={0.7} />
      </div>
      <div className="hidden lg:block absolute top-[20%] right-[24%] rotate-15" style={{ color: CREAM, opacity: 0.06 }}>
        <Navigation size={56} strokeWidth={0.7} />
      </div>

      {/* Planes — departing, arriving home, and one passing overhead.
          The icon's nose points left at rotate 0, so each angle below is
          the actual bearing of travel — the icon's nose points right at
          rotate 0, so this is just atan2(dy, dx) of each flight line. */}
      <FlyingPlane
        reduced={reduced}
        from={{ left: "-8%", top: "78%" }} to={{ left: "108%", top: "6%" }}
        rotate={-32} size={54} color={GOLD} opacity={0.4} duration={34} delay={0}
      />
      <FlyingPlane
        reduced={reduced}
        from={{ left: "106%", top: "14%" }} to={{ left: "-6%", top: "62%" }}
        rotate={157} size={46} color={CREAM} opacity={0.28} duration={29} delay={6}
      />
      <FlyingPlane
        reduced={reduced}
        from={{ left: "-6%", top: "24%" }} to={{ left: "106%", top: "16%" }}
        rotate={-4} size={26} color={CREAM} opacity={0.18} duration={44} delay={12}
      />

      {/* Contrast wash — keeps text legible over the art without hiding it */}
      <div className="absolute inset-0 bg-[#030d0f]/38" />
    </>
  );
}

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
      case 1:
        if (!data.name.trim()) return "Let us know what to call you.";
        if (!data.contactMethod || !data.contactValue.trim()) return "Please choose how to reach you and share the detail.";
        if (!data.residence || (data.residence === "Other" && !data.residenceOther.trim())) return "Please let us know where you live.";
        return null;
      case 2:
        if (!data.visitorType) return "Please let us know if you're a first timer or returnee.";
        if (!data.timeframe) return "Please pick a rough timeframe.";
        if (!data.familyAware) return "Please let us know if family or friends know you're coming.";
        if (!data.reason || (data.reason === "Other" && !data.reasonOther.trim())) return "Please tell us why you're coming.";
        return null;
      case 3:
        if (!data.challenges.length || (data.challenges.includes("Other") && !data.challengesOther.trim())) return "Pick at least one thing you need handled, or tell us more.";
        if (!data.wantsHelp) return "Please let us know if you'd want help getting around.";
        if (!data.excitedFor.length || (data.excitedFor.includes("Other") && !data.excitedForOther.trim())) return "Pick at least one thing you're excited for, or tell us more.";
        return null;
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
    <div className="relative" style={{ ["--accent" as any]: GOLD, ["--accent-ink" as any]: "#041114" }}>
      <Toaster position="top-center" toastOptions={{ style: { background: "#07171a", color: "#f5f0e8", border: `1px solid ${GOLD}33` } }} />

      {/* Fixed travel-themed background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <TravelBackdrop reduced={reduced} />
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
                tag={PAGES[step - 1].tag}
                title={PAGES[step - 1].title}
                desc={PAGES[step - 1].desc}
                step={step}
                total={TOTAL}
                onBack={back}
                onNext={step < TOTAL ? next : submit}
                submitting={submitting}
                isLast={step === TOTAL}
              >
                {step === 1 && <Page1 data={data} set={set} />}
                {step === 2 && <Page2 data={data} set={set} />}
                {step === 3 && <Page3 data={data} set={set} toggle={toggle} />}
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
          Ember to Remember 2026
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
  const shareUrl = "https://homecoming.rinwahospitality.com/ourdiaspora";
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
          Before that, we bet you&apos;d know at least one person from the diaspora coming back home this holiday.
        </p>
        <p className="text-sm text-white/40 leading-relaxed max-w-md mb-10">
          Help spread the word by sharing this link with them directly or on your stories.
        </p>

        <ShareRow />

        <Link
          href="/"
          className="group mt-12 inline-flex items-center gap-3 rounded-md border px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] transition-colors"
          style={{ borderColor: `${GOLD}59`, background: `${GOLD}1a`, color: GOLD }}
        >
          Back to Home
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>

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

// ─── Pages (several numbered questions per step) ───────────────────────────────
// Shell, Field, Area, SegButtons, Chips, Reveal, and QuestionBlock are shared
// with every other intake flow — see ./questionnaire-ui. Each page below is a
// short, thematically-grouped run of QuestionBlocks inside the one Shell card,
// so eleven questions read as three pages instead of eleven. This flow's
// accent (gold) is set once, above, as a CSS variable on the root element.

function Page1({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const methodMeta: Record<string, { label: string; type: string; placeholder: string }> = {
    WhatsApp: { label: "WhatsApp Number", type: "tel", placeholder: "+234 xxx xxx xxxx" },
    Email:    { label: "Email Address",   type: "email", placeholder: "your@email.com" },
    Phone:    { label: "Phone Number",    type: "tel", placeholder: "+234 xxx xxx xxxx" },
  };
  const meta = methodMeta[data.contactMethod];

  return (
    <div>
      <QuestionBlock index={1} prompt="What should we call you?">
        <Field
          label="Your Name" name="name" value={data.name}
          onChange={e => set("name", e.target.value)}
          placeholder="Your name" req autoFocus
        />
      </QuestionBlock>

      <QuestionBlock index={2} prompt="How can we reach you?">
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
      </QuestionBlock>

      <QuestionBlock index={3} prompt="Where do you live?" last>
        <div>
          <Chips options={RESIDENCES} values={data.residence} onToggle={v => set("residence", data.residence === v ? "" : v)} />
          <Reveal show={data.residence === "Other"}>
            <Area label="Tell us more" name="residenceOther" value={data.residenceOther} onChange={e => set("residenceOther", e.target.value)} rows={2} placeholder="Where do you live?" />
          </Reveal>
        </div>
      </QuestionBlock>
    </div>
  );
}

function Page2({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <QuestionBlock index={1} prompt="Is this your first time visiting, or are you a returner?">
        <SegButtons options={["First timer", "Returnee"]} value={data.visitorType} onPick={v => set("visitorType", v)} />
      </QuestionBlock>

      <QuestionBlock index={2} prompt="Roughly what timeframe are you thinking?">
        <Chips
          options={["September", "October", "November", "December", "Still deciding"]}
          values={data.timeframe}
          onToggle={v => set("timeframe", data.timeframe === v ? "" : v)}
        />
      </QuestionBlock>

      <QuestionBlock index={3} prompt="Do your family or friends here know you're coming?">
        <SegButtons
          options={["They know", "It's a surprise", "Some know, not all"]}
          value={data.familyAware}
          onPick={v => set("familyAware", v)}
        />
      </QuestionBlock>

      <QuestionBlock index={4} prompt="Why are you coming?" last>
        <div>
          <Chips options={REASONS} values={data.reason} onToggle={v => set("reason", data.reason === v ? "" : v)} />
          <Reveal show={data.reason === "Other"}>
            <Area label="Tell us more" name="reasonOther" value={data.reasonOther} onChange={e => set("reasonOther", e.target.value)} rows={2} placeholder="What's bringing you home?" />
          </Reveal>
        </div>
      </QuestionBlock>
    </div>
  );
}

function Page3({
  data, set, toggle,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <QuestionBlock index={1} prompt="What's on your 'I need this handled' list?">
        <div>
          <Chips options={CHALLENGES} values={data.challenges} onToggle={v => toggle("challenges", v)} multi />
          <Reveal show={data.challenges.includes("Other")}>
            <Area label="Tell us more" name="challengesOther" value={data.challengesOther} onChange={e => set("challengesOther", e.target.value)} rows={2} placeholder="What else do you need handled?" />
          </Reveal>
        </div>
      </QuestionBlock>

      <QuestionBlock index={2} prompt="Would you want help with things like airport pickup or getting around?">
        <SegButtons options={["Yes", "No", "Maybe"]} value={data.wantsHelp} onPick={v => set("wantsHelp", v)} />
      </QuestionBlock>

      <QuestionBlock index={3} prompt="What are you excited to experience?" last>
        <div>
          <Chips options={EXCITEMENTS} values={data.excitedFor} onToggle={v => toggle("excitedFor", v)} multi />
          <Reveal show={data.excitedFor.includes("Other")}>
            <Area label="Tell us more" name="excitedForOther" value={data.excitedForOther} onChange={e => set("excitedForOther", e.target.value)} rows={2} placeholder="What else are you looking forward to?" />
          </Reveal>
        </div>
      </QuestionBlock>
    </div>
  );
}
