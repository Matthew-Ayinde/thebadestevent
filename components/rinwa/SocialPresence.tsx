"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Social presence section.
 * This is designed like a curated media wall rather than a list of icons.
 */
const platforms = [
  {
    name: "Instagram",
    handle: "@rinwahospitality",
    followers: "18.4K",
    cta: "Follow",
    gradient: "from-[#0f766e]/40 via-[#111827]/20 to-[#042c2b]",
    preview: "Editorial table moments, soft arrivals, and behind-the-scenes rituals.",
  },
  {
    name: "X / Twitter",
    handle: "@rinwahospitality",
    followers: "6.1K",
    cta: "Read",
    gradient: "from-[#0f172a]/40 via-[#111827]/20 to-[#08161b]",
    preview: "Thoughts on hospitality, culture, and community-led brand building.",
  },
  {
    name: "TikTok",
    handle: "@rinwahospitality",
    followers: "22.7K",
    cta: "Watch",
    gradient: "from-[#7c2d12]/30 via-[#111827]/20 to-[#120b0a]",
    preview: "Short-form event recaps, room reveals, and warm social moments.",
  },
  {
    name: "YouTube",
    handle: "RÌNWÁ Stories",
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
            d="M5 5L18.5 19M16.5 5H19L13.3 11.7M5 19H7.4L13 12.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
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
          <path
            d="M4 8.5a8 8 0 0 1 16 0v7a8 8 0 0 1-16 0v-7Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9 10.5h6M9 14h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
                      <SocialIcon platform={platform.name} />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">{platform.name}</p>
                      <p className="text-sm text-white/65">{platform.handle}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">Followers</p>
                    <p className="mt-1 text-sm text-white">{platform.followers}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  <p className="max-w-xs text-sm leading-7 text-white/72">{platform.preview}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200">
                      {platform.cta}
                    </button>
                    <button className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80 transition duration-300 hover:border-teal-300/40 hover:bg-white/10">
                      View profile
                    </button>
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
            <a
              href="#contact"
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
