"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Quote } from "lucide-react";
import type { PublicStory } from "@/models/HomecomingStory";
import { useAutoplayIndex } from "./use-autoplay-index";
import { RinwaStamp } from "./RinwaStamp";

const ACCENT = "#7dd3cf";
const PAPER = "#f4efe7";
const INK = "#0f6e6a";
const AUTOPLAY_MS = 7000;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "R";
}

// ─── Stories carousel ──────────────────────────────────────────────────────────
// One story per slide: the storyteller's photo as a tilted print on the left,
// their words on the right. Auto-advances, pauses while hovered, focused or
// expanded, swipes on touch, and goes still under prefers-reduced-motion.

export default function StoriesCarousel({ stories, onShare }: { stories: PublicStory[]; onShare: () => void }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [direction, setDirection] = useState(1);
  const paused = hovered || expanded || !!reduced;
  const { index, setIndex, next, prev } = useAutoplayIndex(stories.length, AUTOPLAY_MS, paused);

  if (stories.length === 0) return <EmptyWall onShare={onShare} />;

  const story = stories[index];

  function go(to: "next" | "prev" | number) {
    setExpanded(false);
    if (to === "next") { setDirection(1); next(); }
    else if (to === "prev") { setDirection(-1); prev(); }
    else { setDirection(to > index ? 1 : -1); setIndex(to); }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) go("next");
    else if (info.offset.x > 60 || info.velocity.x > 400) go("prev");
  }

  const slide = {
    enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -60 }),
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Homecoming stories"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(false); }}
      onKeyDown={e => {
        if (e.key === "ArrowRight") go("next");
        if (e.key === "ArrowLeft") go("prev");
      }}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#030f12]" aria-live={paused ? "polite" : "off"}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.article
            key={story.id}
            custom={direction}
            variants={slide}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            drag={stories.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${stories.length}: ${story.displayName}`}
            className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 md:gap-12 p-6 sm:p-10 cursor-grab active:cursor-grabbing"
          >
            <StoryPrint story={story} />
            <StoryWords story={story} expanded={expanded} onToggle={() => setExpanded(v => !v)} />
          </motion.article>
        </AnimatePresence>
      </div>

      {stories.length > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {stories.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show story ${i + 1}`}
                aria-current={i === index}
                className="relative h-[3px] overflow-hidden rounded-full bg-white/12 transition-[width] duration-300"
                style={{ width: i === index ? 44 : 18 }}
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0"
                    style={{ background: ACCENT }}
                    initial={{ width: paused ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: paused ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[0.62rem] uppercase tracking-[0.3em] text-white/35 tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}
            </span>
            <button
              type="button" onClick={() => go("prev")} aria-label="Previous story"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button" onClick={() => go("next")} aria-label="Next story"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// A tilted instant-print of the storyteller's photo, with a small seal pressed
// into its corner. Without a photo, the print shows their initials instead.
function StoryPrint({ story }: { story: PublicStory }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
      <div className="relative -rotate-2 rounded-sm p-3 pb-12 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]" style={{ background: PAPER }}>
        <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "#e6ddcf" }}>
          {story.photoUrl ? (
            <Image
              src={story.photoUrl}
              alt={`${story.displayName}'s homecoming photo`}
              fill
              sizes="(min-width: 768px) 320px, 300px"
              className="object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-7xl" style={{ fontFamily: "var(--font-serif)", color: `${INK}99` }}>
                {initials(story.displayName)}
              </span>
            </div>
          )}
        </div>
        <p className="absolute bottom-3.5 left-4 right-16 truncate font-serif text-lg" style={{ fontFamily: "var(--font-serif)", color: "#2b3a3a" }}>
          {story.movedFrom} → Home, {story.yearReturned}
        </p>
      </div>
      <RinwaStamp
        size={92} color={INK} worn
        className="absolute -right-3 -bottom-4 rotate-[14deg] opacity-80 mix-blend-multiply pointer-events-none"
      />
    </div>
  );
}

function StoryWords({ story, expanded, onToggle }: { story: PublicStory; expanded: boolean; onToggle: () => void }) {
  const long = story.story.length > 360;
  return (
    <div className="flex min-w-0 flex-col justify-center">
      <p className="mb-5 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.34em]" style={{ color: ACCENT }}>
        <MapPin size={12} />
        From {story.movedFrom} · Home since {story.yearReturned}
      </p>

      {story.landingThoughts && (
        <blockquote className="mb-6">
          <Quote size={22} className="mb-2 opacity-40" style={{ color: ACCENT }} />
          <p
            className="font-serif text-[clamp(1.45rem,3.2vw,2.1rem)] leading-[1.15] tracking-tight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {story.landingThoughts}
          </p>
          <p className="mt-2 text-[0.68rem] uppercase tracking-[0.26em] text-white/35">On the moment they landed</p>
        </blockquote>
      )}

      <p
        className={`whitespace-pre-line leading-relaxed text-white/65 ${story.landingThoughts ? "text-[0.95rem]" : "font-serif text-xl text-white/85"} ${expanded ? "" : "line-clamp-6"}`}
        style={story.landingThoughts ? undefined : { fontFamily: "var(--font-serif)" }}
      >
        {story.story}
      </p>
      {long && (
        <button
          type="button" onClick={onToggle}
          className="mt-3 self-start text-xs font-medium uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
          style={{ color: ACCENT }}
        >
          {expanded ? "Show less" : "Read the full story"}
        </button>
      )}

      <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-semibold"
          style={{ background: ACCENT, color: "#041114" }}
        >
          {initials(story.displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90">{story.displayName}</p>
          {story.handle && <p className="truncate text-xs text-white/40">{story.handle}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyWall({ onShare }: { onShare: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-[#030f12] px-6 py-16 text-center sm:px-12">
      <RinwaStamp size={150} color={ACCENT} worn className="mx-auto mb-8 -rotate-12 opacity-50" />
      <h3 className="font-serif text-[clamp(1.6rem,4vw,2.4rem)] leading-tight text-white" style={{ fontFamily: "var(--font-serif)" }}>
        The first story on this wall could be yours.
      </h3>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50">
        We&apos;re gathering stories from people who made the move back home. Share yours below.
      </p>
      <button
        type="button" onClick={onShare}
        className="group mt-8 inline-flex items-center gap-3 rounded-full border px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.26em] transition-colors"
        style={{ borderColor: `${ACCENT}59`, background: `${ACCENT}14`, color: ACCENT }}
      >
        Share your story
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}
