"use client";

import { useEffect, useRef, useState } from "react";

interface Testimonial {
  _id: string;
  name: string;
  details: string;
  initials: string;
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="testimonial-card flex-shrink-0 w-[280px] bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-5 cursor-default select-none transition-all duration-300 hover:-rotate-[1.5deg] hover:-translate-y-1 hover:border-teal-300/25 hover:bg-teal-300/[0.05]">
      <span className="block font-serif text-[3.2rem] leading-none text-teal-300/25 -mb-2">"</span>
      <p className="text-[0.82rem] text-white/65 leading-relaxed mb-4">{t.details}</p>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-teal-300 text-slate-900 text-[0.7rem] font-semibold flex items-center justify-center flex-shrink-0">
          {t.initials}
        </div>
        <div>
          <div className="flex gap-0.5 mb-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-teal-300 text-[0.65rem]">★</span>
            ))}
          </div>
          <p className="text-[0.78rem] font-medium text-white/85">{t.name}</p>
        </div>
      </div>
    </article>
  );
}

interface MarqueeRowProps {
  items: Testimonial[];
  direction?: "left" | "right";
  speed?: number; // seconds for one full cycle
}

function MarqueeRow({ items, direction = "left", speed = 28 }: MarqueeRowProps) {
  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  const animClass =
    direction === "left"
      ? "animate-marquee-left"
      : "animate-marquee-right";

  return (
    <div
      className={`flex gap-4 w-max py-2 ${animClass} hover:[animation-play-state:paused]`}
      style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}
    >
      {doubled.map((t, i) => (
        <TestimonialCard key={`${t._id}-${i}`} t={t} />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch testimonials", err));
  }, []);

  if (!items || items.length === 0) return null;

  // Split into two rows
  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid);
  const row2 = items.slice(mid);

  return (
    <>
      {/* Inline keyframes — move to global CSS / tailwind config if preferred */}
      <style>{`
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        .animate-marquee-left  { animation: marquee-left  var(--marquee-duration, 28s) linear infinite; }
        .animate-marquee-right { animation: marquee-right var(--marquee-duration, 22s) linear infinite; }
      `}</style>

      <section className="py-12">
        {/* Header */}
        <div className="mb-10 text-center px-6">
          <h2 className="font-serif text-3xl text-white/90">Testimonials</h2>
          <p className="text-white/50 mt-2 text-sm">What people are saying about our events</p>
        </div>

        {/* Marquee stage */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#0b1120] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-[#0b1120] to-transparent" />

          <div className="flex flex-col gap-1">
            {row1.length > 0 && (
              <MarqueeRow items={row1} direction="left" speed={30} />
            )}
            {row2.length > 0 && (
              <MarqueeRow items={row2} direction="right" speed={24} />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default TestimonialsSection;