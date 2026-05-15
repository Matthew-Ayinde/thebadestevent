"use client";

import { useEffect, useState } from "react";
import { brandPartners as fallbackPartners } from "./data";

/**
 * Seamless brand marquee.
 * The array is duplicated to create an infinite loop without visible seams.
 */
export function BrandMarquee() {
  const [partners, setPartners] = useState(fallbackPartners);

  useEffect(() => {
    fetch("/api/brand-partners")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((partner: any) => ({
            label: partner.name,
            region: partner.region,
          }));
          setPartners(mapped);
        }
      })
      .catch(() => setPartners(fallbackPartners));
  }, []);

  const loop = [...partners, ...partners];

  return (
    <section className="border-y border-white/8 py-6 sm:py-8">
      <div className="marquee-shell overflow-hidden mask-[linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="marquee-track flex w-max items-center gap-3 px-3">
          {loop.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex min-w-48 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white/70 transition duration-300 hover:bg-white/10 hover:text-white"
            >
              <div className="h-2.5 w-2.5 rounded-full bg-teal-300/80" />
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.32em] text-white/45">{item.region}</p>
                <p className="mt-1 text-sm font-medium grayscale transition duration-300 group-hover:grayscale-0">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
