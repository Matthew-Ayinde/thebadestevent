"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { galleryItems } from "./data";

/**
 * Horizontal media gallery.
 * The scroll surface feels like a tactile film strip, with subtle zoom on hover.
 */
export function MediaGallery() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Gallery</p>
            <h2 className="mt-4 font-serif text-[clamp(3rem,7vw,5.2rem)] leading-[0.92] tracking-[-0.05em] text-white">
              A tactile media experience.
            </h2>
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/45">Drag / scroll</p>
        </div>

        <div className="mt-10 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-4 pr-10">
            {galleryItems.map((item, index) => (
              <motion.article
                key={item.title}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: "easeOut" }}
                className="group relative w-[18rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/4 md:w-88 lg:w-96"
              >
                <div className="relative h-112 overflow-hidden">
                  {item.kind === "video" ? (
                    <video
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      poster={item.poster}
                    >
                      <source src={item.src} type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 1024px) 80vw, 25vw"
                      className="object-cover object-center transition duration-500 group-hover:scale-[1.05]"
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,17,20,0.02)_0%,rgba(4,17,20,0.12)_55%,rgba(4,17,20,0.86)_100%)]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[0.66rem] uppercase tracking-[0.32em] text-teal-100/75">{item.kind}</p>
                  <h3 className="mt-3 font-serif text-2xl text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/70">{item.caption}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
