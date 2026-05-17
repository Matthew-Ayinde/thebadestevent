"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

const platforms = [
  {
    name: "Instagram",
    handle: "@rinwahospitality",
    link: "https://www.instagram.com/rinwahospitality",
    followers: "18.4K",
    cta: "Follow",
    gradient: "from-[#0f766e]/40 via-[#111827]/20 to-[#042c2b]",
    preview: "Editorial table moments, soft arrivals, and behind-the-scenes rituals.",
  },
  {
    name: "X / Twitter",
    handle: "@rinwahospitality",
    link: "https://twitter.com/rinwahospitality",
    followers: "6.1K",
    cta: "Read",
    gradient: "from-[#0f172a]/40 via-[#111827]/20 to-[#08161b]",
    preview: "Thoughts on hospitality, culture, and community-led brand building.",
  },
  {
    name: "TikTok",
    handle: "@rinwahospitality",
    link: "https://www.tiktok.com/@rinwahospitality",
    followers: "22.7K",
    cta: "Watch",
    gradient: "from-[#7c2d12]/30 via-[#111827]/20 to-[#120b0a]",
    preview: "Short-form event recaps, room reveals, and warm social moments.",
  },
  {
    name: "YouTube",
    handle: "RÌNWÁ Stories",
    link: "https://www.youtube.com/@thebadestevents",
    followers: "9.8K",
    cta: "Join",
    gradient: "from-[#0c4a6e]/35 via-[#111827]/20 to-[#08131f]",
    preview: "Mini-docs, event films, and longer narrative chapters.",
  },
];

function SocialIcon({ platform }: { platform: string }) {
  const common = "h-5 w-5 text-teal-100";

  switch (platform) {
    case "Instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17" cy="7" r="1" fill="currentColor" />
        </svg>
      );
    case "X / Twitter":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
  <path
    d="M4 4.5h4.5L12 9.5l3.8-5H20l-6 7.8L20 19.5h-4.6L12 14l-4 5.5H4l6.3-8.2L4 4.5Z"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
    fill="none"
  />
</svg>
      );
    case "TikTok":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path d="M14 5c.7 2.8 2.7 4.8 5 5.2v3.1c-1.8 0-3.6-.5-5-1.4v4.1c0 3-2.4 5.5-5.5 5.5S3 19 3 15.9 5.4 10.4 8.5 10.4c.4 0 .8.1 1.2.2V14c-.4-.2-.8-.2-1.2-.2-1.3 0-2.3 1-2.3 2.2 0 1.3 1 2.3 2.3 2.3 1.2 0 2.2-1 2.2-2.3V5h3.3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
  <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" />
  <path d="M10 9.5l5 2.5-5 2.5V9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" />
</svg>
      );
  }
}

export function SocialPresence() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="social-presence" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Social presence</p>
          <h2 id="social-presence" className="mt-4 font-serif text-[clamp(3rem,7vw,5.2rem)] leading-[0.92] tracking-[-0.05em] text-white">
            Step into the room online.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
            Follow the narrative across image, motion, and long-form storytelling. Each platform holds a different chapter of RÌNWÁ.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {platforms.map((platform, index) => (
            <motion.article
              key={platform.name}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.06, ease: "easeOut" }}
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/4"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${platform.gradient} opacity-90 transition duration-500 group-hover:opacity-100`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,207,0.16),transparent_35%)]" />

              <div className="relative flex h-full min-h-[18rem] flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/20">
                      <SocialIcon platform={platform.name} />  {/* ✅ Fixed */}
                    </div>
                    <div>
                      <p className="text-sm text-white/65">{platform.handle}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  <p className="max-w-xs text-sm leading-7 text-white/72">{platform.preview}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={platform.link} target="_blank" className="rounded-full cursor-pointer bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200">
                      View profile
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/3 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-teal-100/70">Community invitation</p>
              <p className="mt-2 text-lg text-white/82">Join the community for behind-the-scenes stories, event drops, and curated invites.</p>
            </div>
            
             <a href="#contact"
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200"
            >
              Join the Community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}