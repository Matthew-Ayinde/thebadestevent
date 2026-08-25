"use client";

// ─── Experience Hub ─────────────────────────────────────────────────────────────
// The front door: two full-bleed panels, split down the middle, each leading
// into its own intake flow. No photography on hand, so each side gets a
// quiet, code-drawn backdrop in its own accent instead — teal for the
// nightlife/guest-experience side, gold for the homecoming/travel side —
// echoing the two flows they lead to. Flat surfaces throughout: solid fills,
// hairline borders, no glow, no gradient on anything a person touches.

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Wine, Sparkles, Disc3, Compass, Globe2, Plane } from "lucide-react";

const TEAL = "#7dd3cf";
const GOLD = "#e8c07a";
const INK = "#04100f";

// The JourneyBackdrop plane travels in a single straight line (lower-left to
// upper-right, a "climbing away" departure) rather than bouncing back and
// forth — a back-and-forth path would need the nose to snap 180° at each
// turnaround to keep pointing where it's actually going, which reads as
// flying sideways. One fixed heading, computed from the same two points the
// motion animates between, keeps the nose honestly pointed the whole time.
// Lucide's Plane icon faces right (0°, +x) at rest, so this is a plain
// atan2 of the travel vector — no fudged rotation value to keep in sync.
const PLANE_FROM = { x: -64, y: 42 };
const PLANE_TO = { x: 64, y: -42 };
const PLANE_ANGLE = Math.atan2(PLANE_TO.y - PLANE_FROM.y, PLANE_TO.x - PLANE_FROM.x) * (180 / Math.PI);

export default function ExperienceHub() {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex flex-col min-h-screen md:h-screen bg-[#030f12]">
      {/* Shared brand lockup, sitting over both panels */}
      <div className="relative z-30 flex flex-col items-center shrink-0 pt-12 pb-9 sm:pt-14 sm:pb-11 px-6 text-center">
        <Image src="/images/logo.png" alt="RÌNWÁ" width={68} height={68} className="opacity-90 mb-3" />
        <p className="mt-2 text-[0.6rem] uppercase tracking-[0.42em] text-white/35">Choose Your Moment</p>
      </div>

      {/* Two panels — flex-1 fills exactly what's left under the lockup on
          md+, so the page fits the viewport with no trailing scroll gap.
          No min-h-0 override here on purpose: if a panel's content ever
          needs more room than that leftover space (longer copy, a bigger
          font, a tiny viewport), it keeps its natural height and the page
          scrolls normally instead of the text getting squeezed or clipped. */}
      <div className="relative grid md:grid-cols-2 flex-1">
        <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-white/10 z-20" />

        <Panel
          href="/experience"
          accent={TEAL}
          reduced={reduced}
          Backdrop={NightBackdrop}
          eyebrow="Guest Experience"
          title={["Your Guest", "Experience"]}
          body="Tell us how tonight felt, not just how it ran. Rate the moments that matter in under two minutes, honestly :)"
          cta="Rate Tonight"
        />

        <Panel
          href="/homecoming"
          accent={GOLD}
          reduced={reduced}
          Backdrop={JourneyBackdrop}
          eyebrow="Homecoming"
          title={["Your Homecoming", "Experience"]}
          body="Coming home this holiday or still making plans? Loop in the diaspora. If Nigeria is on the group chat's mind this ember season, this is where your plans come together. Share this with your people."
          cta="Plan Your Homecoming"
        />
      </div>
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────────

function Panel({
  href, accent, reduced, Backdrop, eyebrow, title, body, cta,
}: {
  href: string; accent: string; reduced: boolean | null;
  Backdrop: React.ComponentType<{ reduced: boolean | null }>;
  eyebrow: string; title: [string, string]; body: string; cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center justify-center text-center px-8 py-20 sm:py-28 md:py-0 md:h-full overflow-hidden border-b border-white/10 md:border-b-0"
    >
      <div className="absolute inset-0">
        <Backdrop reduced={reduced} />
      </div>
      {/* Scrim for text legibility over the backdrop art */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030f12] via-[#030f12]/45 to-transparent" />

      {/* @container: the title is sized off THIS box's own width (via cqw),
          not the viewport's — a plain vw-based size doesn't know a panel is
          only half the screen once the two-column grid kicks in, so on
          medium windows it can size the headline for the full viewport and
          wrap onto a third line, which is what was pushing the page into
          overflow. Sizing off the actual box fixes that at every width. */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center @container">
        <p className="text-[0.6rem] uppercase tracking-[0.4em] mb-5" style={{ color: `${accent}b3` }}>
          {eyebrow}
        </p>
        <h2
          className="font-serif uppercase text-[clamp(1.7rem,10cqw,3rem)] leading-[1.06] tracking-tight text-white mb-5"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title[0]}<br />{title[1]}
        </h2>
        <p className="text-sm sm:text-[0.95rem] text-white/58 leading-relaxed mb-9">{body}</p>

        <span
          className="inline-flex items-center gap-2 rounded-md border px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 transition-colors"
          style={{ borderColor: `${accent}55`, background: INK }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}55`; }}
        >
           {cta}
        </span>
      </div>
    </Link>
  );
}

// ─── Backdrops ──────────────────────────────────────────────────────────────────
// Lighter cousins of the full-page backdrops used inside each flow — same
// dot-grid + low-opacity iconography language, scaled down since two run on
// screen at once here.

function DotGrid({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(${color}88 1px, transparent 1.5px)`,
        backgroundSize: "26px 26px",
        opacity: 0.14,
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
      }}
    />
  );
}

function NightBackdrop({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 70% at 50% -8%, #0d2a2f 0%, #051519 45%, #030d0f 100%)" }}
      />
      <DotGrid color={TEAL} />
      <motion.div
        className="absolute rounded-full border"
        style={{ borderColor: `${TEAL}33`, width: 420, height: 420, left: "50%", top: "45%", marginLeft: -210, marginTop: -210 }}
        animate={reduced ? undefined : { scale: [1, 1.07, 1], opacity: [0.45, 0.8, 0.45] }}
        transition={reduced ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="hidden sm:block absolute top-[14%] left-[10%] -rotate-6" style={{ color: TEAL, opacity: 0.1 }}>
        <Wine size={60} strokeWidth={0.7} />
      </div>
      <div className="hidden sm:block absolute bottom-[14%] right-[12%] rotate-[10deg]" style={{ color: "#f5f0e8", opacity: 0.08 }}>
        <Disc3 size={72} strokeWidth={0.6} />
      </div>
      <div className="hidden lg:block absolute top-[60%] left-[16%]" style={{ color: TEAL, opacity: 0.09 }}>
        <Sparkles size={44} strokeWidth={0.7} />
      </div>
    </>
  );
}

function JourneyBackdrop({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 70% at 50% -8%, #241a08 0%, #17110a 45%, #0e0a06 100%)" }}
      />
      <DotGrid color={GOLD} />
      <motion.div
        className="absolute"
        style={{ color: GOLD, opacity: 0.09, left: "12%", top: "16%" }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <Compass size={130} strokeWidth={0.6} />
      </motion.div>
      <div className="hidden sm:block absolute bottom-[16%] left-[14%]" style={{ color: "#f5f0e8", opacity: 0.07 }}>
        <Globe2 size={96} strokeWidth={0.6} />
      </div>
      <motion.div
        className="hidden lg:block absolute"
        style={{ color: GOLD, opacity: 0.16, right: "18%", top: "58%" }}
        animate={reduced ? undefined : {
          x: [PLANE_FROM.x, PLANE_FROM.x, PLANE_TO.x, PLANE_TO.x],
          y: [PLANE_FROM.y, PLANE_FROM.y, PLANE_TO.y, PLANE_TO.y],
          // Fade in, hold through the straight run, fade out before the
          // loop resets — masks the jump back to the start so it never
          // visibly "teleports".
          opacity: [0, 0.16, 0.16, 0],
        }}
        transition={reduced ? undefined : {
          duration: 10, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.85, 1],
        }}
      >
        <Plane size={34} style={{ transform: `rotate(${PLANE_ANGLE}deg)` }} />
      </motion.div>
    </>
  );
}
