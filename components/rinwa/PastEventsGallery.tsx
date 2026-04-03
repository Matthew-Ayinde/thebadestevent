"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { pastEvents, type PastEvent } from "./data";

/**
 * High-end asymmetric archive.
 * Clicking an item opens a focused lightbox so the gallery feels like an exhibition.
 */
export function PastEventsGallery() {
  const shouldReduceMotion = useReducedMotion();
  const [activeEvent, setActiveEvent] = useState<PastEvent | null>(null);

  useEffect(() => {
    if (!activeEvent) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveEvent(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeEvent]);

  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Past events</p>
          <h2 className="mt-4 font-serif text-[clamp(3rem,7vw,5.2rem)] leading-[0.92] tracking-[-0.05em] text-white">
            A gallery of moments, not just memories.
          </h2>
        </div>

        <div className="mt-10 grid auto-rows-[220px] gap-4 sm:auto-rows-[240px] md:grid-cols-2 xl:grid-cols-4">
          {pastEvents.map((event, index) => (
            <motion.button
              key={event.title}
              type="button"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.7, delay: index * 0.04, ease: "easeOut" }}
              onClick={() => setActiveEvent(event)}
              className={`group relative overflow-hidden rounded-[1.8rem] border border-white/10 text-left shadow-[0_16px_60px_rgba(0,0,0,0.18)] ${event.span ?? ""}`}
            >
              {event.mediaType === "video" ? (
                <video
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster={event.poster}
                >
                  <source src={event.src} type="video/mp4" />
                </video>
              ) : (
                <Image
                  src={event.src}
                  alt={event.alt}
                  fill
                  sizes="(max-width: 1280px) 100vw, 25vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.05]"
                />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,17,20,0.02)_0%,rgba(4,17,20,0.18)_45%,rgba(4,17,20,0.86)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[0.66rem] uppercase tracking-[0.32em] text-teal-100/75">{event.category}</p>
                <h3 className="mt-3 font-serif text-2xl text-white">{event.title}</h3>
                <p className="mt-1 text-sm text-white/70">{event.year}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeEvent ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={activeEvent.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/72 px-4 py-6 backdrop-blur-md"
            onClick={() => setActiveEvent(null)}
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-5xl overflow-hidden rounded-4xl border border-white/12 bg-[#07171a] shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
            >
              <button
                type="button"
                aria-label="Close lightbox"
                onClick={() => setActiveEvent(null)}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/12 bg-black/30 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Close
              </button>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                <div className="relative min-h-88 lg:min-h-136">
                  {activeEvent.mediaType === "video" ? (
                    <video
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      poster={activeEvent.poster}
                    >
                      <source src={activeEvent.src} type="video/mp4" />
                    </video>
                  ) : (
                    <Image src={activeEvent.src} alt={activeEvent.alt} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover object-center" />
                  )}
                </div>
                <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-teal-100/70">{activeEvent.category}</p>
                    <h3 className="mt-4 font-serif text-4xl leading-tight text-white">{activeEvent.title}</h3>
                    <p className="mt-3 text-sm uppercase tracking-[0.26em] text-white/45">{activeEvent.year}</p>
                    <p className="mt-6 max-w-md text-base leading-8 text-white/70">
                      A quiet archive moment selected to feel like an exhibit wall — spacious, tactile, and emotionally grounded.
                    </p>
                  </div>

                  <div className="grid gap-3 text-sm text-white/72 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-teal-100/70">Format</p>
                      <p className="mt-2 text-white">{activeEvent.mediaType === "video" ? "Motion clip" : "Image frame"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-teal-100/70">Status</p>
                      <p className="mt-2 text-white">Archive / Featured</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
