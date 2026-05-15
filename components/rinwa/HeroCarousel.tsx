"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import { heroSlides as fallbackSlides } from "./data";
import { useAutoplayIndex } from "./use-autoplay-index";

/**
 * Full-screen cinematic hero.
 * Crossfades between images and video while keeping controls minimal and keyboard-friendly.
 */
export function HeroCarousel() {
  const shouldReduceMotion = useReducedMotion();
  const [slides, setSlides] = useState(fallbackSlides);
  const [paused, setPaused] = useState(false);
  const { index, setIndex, next, prev } = useAutoplayIndex(slides.length, 7200, paused);
  const activeSlide = slides[index];

  useEffect(() => {
    fetch("/api/hero-slides")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mappedSlides = data.map((slide: any) => ({
            type: slide.videoUrl ? "video" : "image",
            src: slide.videoUrl || slide.imageUrl,
            poster: slide.imageUrl,
            alt: slide.title,
            eyebrow: "RÌNWÁ Experience",
            headline: slide.title,
          }));
          setSlides(mappedSlides);
        }
      })
      .catch(() => setSlides(fallbackSlides));
  }, []);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="RÌNWÁ hero carousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") prev();
        if (event.key === "ArrowRight") next();
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative isolate min-h-screen overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1.25, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 -z-20"
        >
          {activeSlide.type === "video" ? (
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={activeSlide.poster}
            >
              <source src={activeSlide.src} type="video/mp4" />
            </video>
          ) : (
            <Image
              src={activeSlide.src}
              alt={activeSlide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover object-center"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,16,18,0.2)_0%,rgba(5,16,18,0.48)_48%,rgba(5,16,18,0.96)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(125,211,207,0.18),transparent_24%),radial-gradient(circle_at_70%_30%,rgba(15,118,110,0.18),transparent_26%)]" />

      <div className="mx-auto flex h-full min-h-screen w-full max-w-7xl flex-col justify-between gap-14 px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <p className="text-sm tracking-[0.28em] text-white/80">RÌNWÁ RHE</p>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition duration-300 hover:border-teal-300/40 hover:text-white"
              onClick={() => window.document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" })}
            >
              Explore
            </button>
            <button
              type="button"
              className="rounded-full bg-teal-300 px-4 py-2 text-sm font-medium text-slate-950 transition duration-300 hover:bg-teal-200"
              onClick={() => window.document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            >
              Partner With Us
            </button>
          </div>
        </header>

        <div className="grid items-end gap-10 pb-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8 lg:pb-12">
          <div className="max-w-4xl">
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
              className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-100/75"
            >
              {activeSlide.eyebrow}
            </motion.p>

            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.95, ease: "easeOut" }}
              className="mt-5 font-serif text-[clamp(3.6rem,12vw,8.8rem)] leading-[0.9] tracking-[-0.06em] text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
            >
              RÌNWÁ
              <span className="block text-[0.42em] font-sans font-normal tracking-[0.12em] text-teal-100/90 sm:text-[0.38em]">
                Hospitality & Experiences
              </span>
            </motion.h1>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.85, ease: "easeInOut" }}
              className="mt-8 max-w-2xl text-[clamp(1.4rem,3.4vw,2.6rem)] font-light leading-[1.2] tracking-[-0.04em] text-white/92"
            >
              {activeSlide.headline}
            </motion.p>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.85, ease: "easeInOut" }}
              className="mt-4 max-w-xl text-lg leading-8 text-white/68"
            >
              A space for connection, culture, and curated moments.
            </motion.p>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.85, ease: "easeInOut" }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <button
                onClick={() => window.document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-full bg-teal-300 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200 hover:shadow-[0_0_30px_rgba(125,211,207,0.18)]"
              >
                Explore Experiences
              </button>
              <button
                onClick={() => window.document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 backdrop-blur-sm transition duration-300 hover:border-teal-300/40 hover:bg-white/10 hover:text-white"
              >
                Partner With Us
              </button>
            </motion.div>
          </div>

          <motion.aside
            initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.9, ease: "easeOut" }}
            className="ml-auto max-w-md rounded-4xl border border-white/10 bg-[#041114]/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-teal-100/70">Scene notes</p>
            <p className="mt-4 font-serif text-3xl leading-tight text-white">
              Culture-first experiences shaped with warmth and precision.
            </p>
            <div className="mt-8 space-y-4 border-t border-white/10 pt-6 text-sm text-white/70">
              <p>Hospitality-led brands</p>
              <p>Creative founders</p>
              <p>Travel & tourism ecosystems</p>
            </div>
          </motion.aside>
        </div>

        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2" aria-label="Carousel controls">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={prev}
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-teal-300/40 hover:bg-white/10 hover:text-white"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={next}
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-teal-300/40 hover:bg-white/10 hover:text-white"
            >
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            {heroSlides.map((slide, slideIndex) => (
              <button
                key={slide.poster}
                type="button"
                aria-label={`Go to slide ${slideIndex + 1}`}
                aria-current={index === slideIndex}
                onClick={() => setIndex(slideIndex)}
                className={`h-2.5 rounded-full transition-all duration-300 ${index === slideIndex ? "w-10 bg-teal-300" : "w-2.5 bg-white/35 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
