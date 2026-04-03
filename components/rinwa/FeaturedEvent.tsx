"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * Editorial featured block.
 * A subtle parallax lift keeps the event feeling immersive without becoming distracting.
 */
export function FeaturedEvent() {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.02]);

  return (
    <section ref={sectionRef} className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10"
        >
          <motion.div style={{ y: shouldReduceMotion ? 0 : imageY, scale: shouldReduceMotion ? 1 : imageScale }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1800&q=80"
              alt="Featured event background"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>

          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,17,20,0.94)_10%,rgba(4,17,20,0.52)_55%,rgba(4,17,20,0.84)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,207,0.12),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.18),transparent_26%)]" />

          <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Featured event</p>
              <h2 className="mt-4 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[0.92] tracking-[-0.05em] text-white">
                Wine &amp; Dine Wednesdays
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/74">
                Your after-work ritual to unwind, connect &amp; engage with like minds through shared conversations, games &amp; meaningful moments.
              </p>

              <div className="mt-8 grid gap-4 text-white/82 sm:grid-cols-3">
                {[
                  ["Location", "The Terrace, Lekki Phase 1"],
                  ["Date", "April 8th"],
                  ["Time", "6PM – 9PM"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-md">
                    <p className="text-xs uppercase tracking-[0.28em] text-teal-100/68">{label}</p>
                    <p className="mt-2 text-base text-white/90">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-start lg:justify-end">
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-sm rounded-4xl border border-white/12 bg-[#041114]/50 p-5 backdrop-blur-2xl"
              >
                <p className="text-sm uppercase tracking-[0.28em] text-teal-100/70">Next ritual</p>
                <p className="mt-4 font-serif text-3xl leading-tight text-white">
                  An evening that feels composed, warm, and effortlessly considered.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button className="rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200">
                    RSVP
                  </button>
                  <button className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-white/80 transition duration-300 hover:border-teal-300/40 hover:bg-white/10">
                    Relive the Moment
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
