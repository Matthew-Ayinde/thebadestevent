'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ArrowRight, Briefcase, Mail } from 'lucide-react';
import { formatClosingDate, type PublicJob } from '@/lib/careers';
import { serif } from './CareersChrome';

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = { kind: 'all' } | { kind: 'department' | 'type'; value: string };

// `children` renders between the hero and the roles list.
export function CareersBoard({ jobs, description, contactEmail, children }: {
  jobs: PublicJob[]; description: string; contactEmail: string; children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });

  const departments = useMemo(() => distinct(jobs.map(j => j.department)), [jobs]);
  const types = useMemo(() => distinct(jobs.map(j => j.type)), [jobs]);
  const companies = useMemo(() => distinct(jobs.map(j => j.company)), [jobs]);

  // Only offer a filter dimension when it actually splits the list.
  const chips: Filter[] = [
    { kind: 'all' },
    ...(departments.length > 1 ? departments.map(value => ({ kind: 'department' as const, value })) : []),
    ...(types.length > 1 ? types.map(value => ({ kind: 'type' as const, value })) : []),
  ];

  const visible = jobs.filter(j =>
    filter.kind === 'all' ? true : filter.kind === 'department' ? j.department === filter.value : j.type === filter.value
  );

  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: reduced ? 0 : 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-20">
        <motion.p {...rise()} className="mb-6 text-[0.66rem] uppercase tracking-[0.42em] text-accent">
          Talent, curated by RÌNWÁ
        </motion.p>
        <motion.h1
          {...rise(0.05)}
          className="max-w-4xl text-[clamp(2.8rem,8vw,6rem)] leading-[0.92] tracking-tight text-fg"
          style={serif}
        >
          You make the moment.
          <br />
          <em className="text-accent">We find the room.</em>
        </motion.h1>
        <motion.p {...rise(0.12)} className="mt-8 max-w-xl text-[0.95rem] leading-relaxed text-fg-muted sm:text-base">
          {description}
        </motion.p>

        <motion.div {...rise(0.16)} className="mt-10 flex flex-wrap gap-3">
          <a
            href="#roles"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            View open roles
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#talent-circle"
            className="inline-flex items-center rounded-full border border-line-strong bg-tint px-7 py-3.5 text-sm text-fg transition hover:border-accent/50 hover:bg-tint-strong"
          >
            Join the talent circle
          </a>
        </motion.div>

        <motion.dl {...rise(0.22)} className="mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line">
          {[
            { k: 'Open roles', v: String(jobs.length) },
            { k: 'Partner brands hiring', v: String(companies.length) },
            { k: 'Every application', v: 'Read by a human', italic: true },
          ].map(item => (
            <div key={item.k} className="bg-card px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
              <dt className="text-[0.6rem] uppercase tracking-[0.24em] text-fg-subtle sm:text-[0.66rem] sm:tracking-[0.28em]">{item.k}</dt>
              <dd className={`mt-1.5 text-lg leading-tight text-fg sm:text-2xl ${item.italic ? 'italic' : ''}`} style={serif}>{item.v}</dd>
            </div>
          ))}
        </motion.dl>
      </section>

      {children}

      {/* Roles */}
      <section id="roles" aria-labelledby="roles-heading" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 sm:px-8">
        <div className="mb-10 flex flex-col gap-6 pt-24 sm:pt-28 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 text-[0.66rem] uppercase tracking-[0.38em] text-accent">Open now</p>
            <h2 id="roles-heading" className="text-[clamp(2.4rem,5.5vw,4rem)] leading-[1] tracking-tight text-fg" style={serif}>
              {jobs.length === 0 ? 'Nothing open just now.' : 'Rooms looking for you.'}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
            Partner brands stay confidential until we introduce you. You&apos;ll always know the kind of house, the area and the work before you apply.
          </p>
        </div>

          {jobs.length > 1 && chips.length > 1 && (
            <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="toolbar" aria-label="Filter roles">
              {chips.map(chip => {
                const active = sameFilter(chip, filter);
                const label = chip.kind === 'all' ? 'All roles' : chip.value;
                return (
                  <button
                    key={chip.kind === 'all' ? 'all' : `${chip.kind}:${chip.value}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(chip)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all ${
                      active
                        ? 'border-accent bg-accent/14 text-accent'
                        : 'border-line bg-tint text-fg-muted hover:border-line-strong hover:bg-tint-strong hover:text-fg'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

        {jobs.length === 0 ? (
          <EmptyState contactEmail={contactEmail} />
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((job, i) => (
                <motion.li
                  key={job.id}
                  layout={!reduced}
                  initial={{ opacity: 0, y: reduced ? 0 : 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
                >
                  <RoleCard job={job} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </>
  );
}

function RoleCard({ job }: { job: PublicJob }) {
  const closes = formatClosingDate(job.closingDate);
  const tags = [job.department, job.type].filter(Boolean);
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group relative flex flex-col gap-6 overflow-hidden rounded-[1.8rem] border border-line bg-card p-6 shadow-card backdrop-blur-xl transition duration-500 hover:border-accent/35 hover:bg-field focus-visible:border-accent/60 focus-visible:outline-none sm:flex-row sm:items-center sm:p-8"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] origin-top scale-y-0 bg-accent transition-transform duration-500 group-hover:scale-y-100" />

      <div className="min-w-0 flex-1">
        {tags.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <li
                key={tag}
                className={`rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.22em] ${
                  i === 0 ? 'bg-accent/12 text-accent' : 'bg-tint-strong text-fg-muted'
                }`}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        <h3 className="text-[1.65rem] leading-[1.1] text-fg sm:text-[2rem]" style={serif}>
          {job.title}
        </h3>
        <p className="mt-1.5 text-sm text-fg-subtle">{[job.company, job.location].filter(Boolean).join(' · ')}</p>
        {job.overview && <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-fg-muted">{firstSentence(job.overview)}</p>}
        {closes && <p className="mt-3 text-xs italic text-fg-faint">Applications close {closes}</p>}
      </div>

      <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition group-hover:bg-accent-hover sm:self-center">
        Apply for this role
        <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

// Cards show one line on why the role is exciting; the full overview lives on the role page.
function firstSentence(text: string) {
  const sentence = text.trim().split(/(?<=[.!?])\s+/)[0];
  return sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence;
}

function EmptyState({ contactEmail }: { contactEmail: string }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-line bg-card px-6 py-16 text-center shadow-card backdrop-blur-xl sm:py-20">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
        <Briefcase size={20} className="text-accent" />
      </div>
      <p className="max-w-md text-2xl leading-snug text-fg sm:text-3xl" style={serif}>
        No roles are open right now, but new ones arrive often.
      </p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
        The best opportunities often move before they&apos;re posted. Join the talent circle and you&apos;ll be first to hear when the right room opens up.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href="#talent-circle"
          className="inline-flex items-center rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
        >
          Join the talent circle
        </a>
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent('Future opportunities · RÌNWÁ Careers')}`}
          className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-tint px-7 py-3.5 text-sm text-fg transition hover:border-accent/50 hover:bg-tint-strong"
        >
          <Mail size={14} />
          Say hello
        </a>
      </div>
    </div>
  );
}

function distinct(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sameFilter(a: Filter, b: Filter) {
  if (a.kind === 'all' || b.kind === 'all') return a.kind === b.kind;
  return a.kind === b.kind && a.value === b.value;
}
