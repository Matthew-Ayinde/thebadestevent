"use client";

// ─── Experience Hub ─────────────────────────────────────────────────────────────
// The front door: three full-bleed panels side by side (stacked below lg),
// each leading into its own flow. No photography on hand, so each gets a
// quiet, code-drawn backdrop in its own accent instead — teal for the
// nightlife/guest-experience side, gold for the homecoming/travel side,
// paper cream for the Came Home stories (the colour of the passport page
// they get stamped on). Flat surfaces throughout: solid fills, hairline
// borders, no glow, no gradient on anything a person touches.

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Wine, Sparkles, Disc3, Compass, Globe2, Plane, Quote } from "lucide-react";
import { RinwaStamp } from "./RinwaStamp";

const TEAL = "#7dd3cf";
const GOLD = "#e8c07a";
const PAPER = "#eadcc4";
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
    <div className="relative flex flex-col min-h-screen lg:h-screen bg-[#030f12]">
      {/* Shared brand lockup, sitting over both panels */}
      <div className="relative z-30 flex flex-col items-center shrink-0 pt-12 pb-9 sm:pt-14 sm:pb-11 px-6 text-center">
        <Image src="/images/logo.png" alt="RÌNWÁ" width={68} height={68} className="opacity-90 mb-3" />
        <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.42em] text-white/70">Return. Belonging. Access</p>
        <p className="mt-3 text-sm text-white/60">Your bridge between coming home and building at home.</p>
      </div>

      <div className="relative grid lg:grid-cols-3 flex-1">
        <Panel
          href="/ourguests"
          accent={TEAL}
          reduced={reduced}
          Backdrop={NightBackdrop}
          eyebrow="Guest Experience"
          title={["My Guest", "Experience"]}
          body="Tell us how tonight felt, not just how it ran. Rate the moments that matter in under two minutes, honestly ;)"
          cta="Rate Tonight"
        />

        <Panel
          href="/ourdiaspora"
          accent={GOLD}
          reduced={reduced}
          Backdrop={JourneyBackdrop}
          eyebrow="Homecoming"
          title={["My Homecoming", "Experience"]}
          body="Coming home for detty December? Loop in the diaspora. If Nigeria is on the group chat's mind this ember season, this is where your plans come together. Share this with your people."
          cta="Plan Your Homecoming"
        />

        <Panel
          href="/feedback"
          accent={PAPER}
          reduced={reduced}
          Backdrop={StoryBackdrop}
          eyebrow="Came Home Stories"
          title={["My Return", "Story"]}
          body="Already made the move back? Tell us how coming home really felt: the good, the hard, and what you wish you'd known. Then read the stories of others who did it too."
          cta="Share Your Story"
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
      className="group relative flex flex-col items-center justify-center text-center px-8 py-20 sm:py-28 lg:py-0 lg:h-full overflow-hidden border-b border-white/10 lg:border-b-0 lg:[&:not(:first-child)]:border-l"
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

function StoryBackdrop({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 70% at 50% -8%, #22201b 0%, #131411 45%, #0b0c0b 100%)" }}
      />
      <DotGrid color={PAPER} />
      {/* The Came Home seal, slowly turning — the same stamp the story form ends on */}
      <motion.div
        className="absolute"
        style={{ opacity: 0.08, right: "-70px", top: "8%" }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <RinwaStamp size={240} color={PAPER} />
      </motion.div>
      {/* Two tilted instant prints, like the photos on the stories wall */}
      <motion.div
        className="hidden sm:block absolute left-[10%] bottom-[14%] -rotate-[8deg] rounded-[3px] border p-2 pb-7"
        style={{ borderColor: `${PAPER}24` }}
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-20 w-16 rounded-[2px]" style={{ background: `${PAPER}0d` }} />
      </motion.div>
      <div
        className="hidden lg:block absolute left-[22%] bottom-[10%] rotate-[6deg] rounded-[3px] border p-1.5 pb-5"
        style={{ borderColor: `${PAPER}1a` }}
      >
        <div className="h-12 w-10 rounded-[2px]" style={{ background: `${PAPER}0a` }} />
      </div>
      <div className="hidden sm:block absolute top-[16%] left-[12%] -rotate-6" style={{ color: PAPER, opacity: 0.1 }}>
        <Quote size={48} strokeWidth={0.7} />
      </div>
    </>
  );
}
