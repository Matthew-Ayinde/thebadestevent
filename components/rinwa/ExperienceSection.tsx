"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { cityOptions, weekdayEvents } from "./data";

/**
 * Interactive discovery section.
 * The interface can switch between location-led and day-led discovery without losing the editorial pacing.
 */
export function ExperienceSection() {
  const shouldReduceMotion = useReducedMotion();
  const [mode, setMode] = useState<"city" | "weekday">("city");
  const [selectedCity, setSelectedCity] = useState(cityOptions[0].city);

  const selectedCityData = useMemo(
    () => cityOptions.find((item) => item.city === selectedCity) ?? cityOptions[0],
    [selectedCity],
  );

  return (
    <section id="experiences" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Experience discovery</p>
          <h2 className="mt-4 max-w-lg font-serif text-[clamp(3rem,7vw,4.75rem)] leading-[0.94] tracking-[-0.05em] text-white">
            Find the moment that matches your pace.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/68">
            Explore our experiences by place or by day — two different ways to enter the world.
          </p>

          <div className="mt-9 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm transition duration-300 ${mode === "city" ? "bg-teal-300 text-slate-950" : "text-white/72"}`}
              onClick={() => setMode("city")}
            >
              Find us in your city
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm transition duration-300 ${mode === "weekday" ? "bg-teal-300 text-slate-950" : "text-white/72"}`}
              onClick={() => setMode("weekday")}
            >
              Pick your day
            </button>
          </div>

          <div className="mt-8 rounded-4xl border border-white/10 bg-[#07171a]/78 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.25)]">
            <AnimatePresence mode="wait">
              {mode === "city" ? (
                <motion.div
                  key="city"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="space-y-3"
                >
                  {cityOptions.map((option) => (
                    <button
                      key={option.city}
                      type="button"
                      onClick={() => setSelectedCity(option.city)}
                      className={`w-full rounded-[1.35rem] border p-4 text-left transition-all duration-300 ${
                        selectedCity === option.city
                          ? "border-teal-300/50 bg-teal-300/10"
                          : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-serif text-2xl text-white">{option.city}</p>
                          <p className="mt-1 max-w-md text-sm leading-6 text-white/62">{option.note}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.66rem] uppercase tracking-[0.28em] text-teal-100/70">{option.region}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.26em] text-white/45">{option.date}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="weekday"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="grid gap-3"
                >
                  {weekdayEvents.map((event) => (
                    <div key={event.day} className="rounded-[1.35rem] border border-white/10 bg-white/3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-teal-100/70">{event.day}</p>
                          <p className="mt-2 font-serif text-2xl text-white">{event.title}</p>
                        </div>
                        <p className="max-w-sm text-sm leading-6 text-white/62">{event.detail}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/3 p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(125,211,207,0.18),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.22),transparent_24%)]" />
          <div className="relative grid gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-teal-100/70">Selected mode</p>
              <p className="mt-3 font-serif text-4xl text-white">{selectedCityData.city}</p>
              <p className="mt-4 max-w-md text-base leading-8 text-white/70">{selectedCityData.note}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.26em] text-teal-100/70">Availability</p>
              <p className="mt-3 text-lg text-white">{selectedCityData.date}</p>
            </div>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[1.8rem] border border-white/10">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,17,20,0.1),rgba(4,17,20,0.62))]" />
            <div className="grid min-h-104 place-items-center bg-[radial-gradient(circle_at_center,rgba(125,211,207,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-8">
              <div className="relative grid w-full max-w-md gap-4 rounded-3xl border border-white/10 bg-[#07171a]/65 p-5 backdrop-blur-xl">
                <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,transparent,rgba(125,211,207,0.06),transparent)]" />
                <p className="text-xs uppercase tracking-[0.32em] text-teal-100/70">Map-inspired pulse</p>
                <div className="grid grid-cols-2 gap-3 text-white/72">
                  <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/48">Region</p>
                    <p className="mt-2 font-serif text-2xl text-white">{selectedCityData.region}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/48">Mode</p>
                    <p className="mt-2 font-serif text-2xl text-white">{mode === "city" ? "City" : "Day"}</p>
                  </div>
                </div>
                <p className="text-sm leading-7 text-white/68">
                  The discovery layer is intentionally minimal, so the emotional weight stays with the content and not the chrome.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
