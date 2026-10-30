"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import type { PublicStory } from "@/models/HomecomingStory";
import StoriesCarousel from "./StoriesCarousel";
import StoryForm from "./StoryForm";
import { RinwaStamp } from "./RinwaStamp";

const ACCENT = "#7dd3cf";

// ─── /feedback — Came Home ─────────────────────────────────────────────────────
// A wall of stories from people who've moved back home, then a form to add
// your own. The RÌNWÁ leaf floats behind everything as a watermark and the
// Came Home seal turns slowly beside the hero; the same seal is what gets
// stamped onto a storyteller's entry when they submit.

export default function CameHome({ stories }: { stories: PublicStory[] }) {
  const reduced = useReducedMotion();
  const formRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-18%"]);

  function toForm() {
    formRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* Ground — one gradient spanning the whole page, covering the body's
          background, which repeats every screen height and leaves seams */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 120% 1400px at 50% 0%, #0d2a2f 0%, #061619 55%, #030d0f 100%) #030d0f" }}
      />

      {/* Watermark — the leaf mark, huge and faint, drifting with the scroll */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 w-[min(120vw,980px)] -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ y: watermarkY }}
      >
        <motion.div
          animate={reduced ? undefined : { rotate: [0, 2, 0, -2, 0], scale: [1, 1.02, 1] }}
          transition={reduced ? undefined : { duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="opacity-[0.035]"
        >
          <Image src="/images/logo-home.png" alt="" width={440} height={406} className="h-auto w-full" priority />
        </motion.div>
      </motion.div>

      <div className="relative z-10">
        {/* Hero */}
        <header className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <Link href="/" className="inline-flex items-center gap-3 opacity-90 transition-opacity hover:opacity-100">
            <Image src="/images/logo-home.png" alt="RÌNWÁ" width={34} height={31} />
            <span className="font-serif text-lg tracking-wide text-white/90" style={{ fontFamily: "var(--font-serif)" }}>RÌNWÁ</span>
          </Link>

          <div className="relative mt-16 sm:mt-24">
            {/* The floating seal */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-16 hidden sm:block lg:-right-4 lg:-top-10"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 0.22, scale: 1, y: reduced ? 0 : [0, -12, 0] }}
              transition={{ opacity: { duration: 1.2 }, scale: { duration: 1.2 }, y: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
            >
              <motion.div
                animate={reduced ? undefined : { rotate: 360 }}
                transition={reduced ? undefined : { duration: 120, repeat: Infinity, ease: "linear" }}
              >
                <RinwaStamp size={300} color={ACCENT} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-3xl"
            >
              <p className="mb-6 text-[0.62rem] uppercase tracking-[0.5em]" style={{ color: `${ACCENT}b3` }}>
                Ìlé wá · Came Home
              </p>
              <h1
                className="font-serif text-[clamp(2.9rem,8vw,5.75rem)] leading-[0.92] tracking-tight text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                We left. <span style={{ color: ACCENT }}>We came home.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
                Real stories from people who made the move back: what brought them home, what surprised
                them, and what they wish they&apos;d known. Read theirs, then tell us yours.
              </p>
              <button
                type="button" onClick={toForm}
                className="group mt-10 inline-flex items-center gap-3 rounded-full border px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.26em] transition-colors"
                style={{ borderColor: `${ACCENT}59`, background: `${ACCENT}14`, color: ACCENT }}
              >
                Share your story
                <ArrowDown size={14} className="transition-transform group-hover:translate-y-0.5" />
              </button>
            </motion.div>
          </div>
        </header>

        {/* Stories wall */}
        <section aria-labelledby="stories-heading" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-[0.6rem] uppercase tracking-[0.38em] text-white/35">The wall</p>
              <h2 id="stories-heading" className="font-serif text-[clamp(1.8rem,4vw,2.6rem)] leading-tight text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Stories from home
              </h2>
            </div>
          </div>
          <StoriesCarousel stories={stories} onShare={toForm} />
        </section>

        {/* Divider */}
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6" aria-hidden>
          <div className="h-px flex-1 bg-white/10" />
          <RinwaStamp size={34} color={`${ACCENT}`} className="opacity-40" />
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Share your story */}
        <section aria-label="Share your story" className="mx-auto max-w-2xl px-4 pb-28 pt-20 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-4 text-[0.6rem] uppercase tracking-[0.45em]" style={{ color: `${ACCENT}b3` }}>Your turn</p>
            <h2 className="font-serif text-[clamp(2.1rem,5.5vw,3.4rem)] leading-[1.02] tracking-tight text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Tell us how you came home.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/50">
              It takes about five minutes. Share as much or as little as you like.
            </p>
          </div>
          <StoryForm ref={formRef} />
        </section>
      </div>
    </div>
  );
}
