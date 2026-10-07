'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Briefcase, Clock, MapPin, Mail } from 'lucide-react';
import { formatClosingDate, type PublicJob } from '@/lib/careers';
import { serif } from './CareersChrome';

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = { kind: 'all' } | { kind: 'department' | 'type'; value: string };

export function CareersBoard({ jobs, description, contactEmail }: { jobs: PublicJob[]; description: string; contactEmail: string }) {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });

  const departments = useMemo(() => distinct(jobs.map(j => j.department)), [jobs]);
  const types = useMemo(() => distinct(jobs.map(j => j.type)), [jobs]);

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
          Careers at RÌNWÁ
        </motion.p>
        <motion.h1
          {...rise(0.05)}
          className="max-w-4xl text-[clamp(2.8rem,8vw,6rem)] leading-[0.92] tracking-tight text-fg"
          style={serif}
        >
          Shape the moments people carry home.
        </motion.h1>
        <motion.p {...rise(0.12)} className="mt-8 max-w-xl text-[0.95rem] leading-relaxed text-fg-muted sm:text-base">
          {description}
        </motion.p>

        <motion.dl {...rise(0.2)} className="mt-12 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line">
          {[
            { k: 'Open roles', v: String(jobs.length) },
            { k: 'Rooted in', v: 'Lagos' },
            { k: 'Reaching', v: 'Africa · Canada' },
          ].map(item => (
            <div key={item.k} className="bg-card px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
              <dt className="text-[0.66rem] uppercase tracking-[0.28em] text-fg-subtle">{item.k}</dt>
              <dd className="mt-1.5 truncate text-lg text-fg sm:text-2xl" style={serif}>{item.v}</dd>
            </div>
          ))}
        </motion.dl>
      </section>

      {/* Roles */}
      <section id="roles" aria-labelledby="roles-heading" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 sm:px-8">
        <div className="mb-8 flex flex-col gap-6 border-t border-line-soft pt-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[0.66rem] uppercase tracking-[0.38em] text-accent">Open Roles</p>
            <h2 id="roles-heading" className="text-[clamp(1.9rem,4vw,2.8rem)] leading-none text-fg" style={serif}>
              {jobs.length === 0 ? 'Nothing open just now' : 'Find your place'}
            </h2>
          </div>

          {jobs.length > 1 && chips.length > 1 && (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0" role="toolbar" aria-label="Filter roles">
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
        </div>

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
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group relative flex items-center gap-5 overflow-hidden rounded-[1.8rem] border border-line bg-card p-6 shadow-card backdrop-blur-xl transition duration-500 hover:border-accent/35 hover:bg-field focus-visible:border-accent/60 focus-visible:outline-none sm:p-8"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] origin-top scale-y-0 bg-accent transition-transform duration-500 group-hover:scale-y-100" />

      <div className="min-w-0 flex-1">
        {job.department && (
          <p className="mb-2 text-[0.66rem] uppercase tracking-[0.3em] text-accent">{job.department}</p>
        )}
        <h3 className="text-[1.65rem] leading-[1.1] text-fg transition-colors sm:text-[2rem]" style={serif}>
          {job.title}
        </h3>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.8rem] text-fg-muted">
          <Meta icon={MapPin}>{job.location}</Meta>
          <Meta icon={Briefcase}>{job.workplace}</Meta>
          <Meta icon={Clock}>{job.type}</Meta>
        </ul>
        {closes && <p className="mt-4 text-xs italic text-fg-faint">Applications close {closes}</p>}
      </div>

      <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent sm:flex">
        <ArrowUpRight size={18} className="transition-transform duration-500 group-hover:rotate-45" />
      </span>
    </Link>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon size={13} className="text-accent" aria-hidden="true" />
      {children}
    </li>
  );
}

function EmptyState({ contactEmail }: { contactEmail: string }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-line bg-card px-6 py-16 text-center shadow-card backdrop-blur-xl sm:py-20">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
        <Briefcase size={20} className="text-accent" />
      </div>
      <p className="max-w-md text-2xl leading-snug text-fg sm:text-3xl" style={serif}>
        Our team is complete for now — but not closed to wonder.
      </p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
        New roles appear here first. If you&apos;d love to work with us, introduce yourself and tell us what you&apos;d bring.
      </p>
      <a
        href={`mailto:${contactEmail}?subject=${encodeURIComponent('Introducing myself — RÌNWÁ Careers')}`}
        className="group mt-8 inline-flex items-center gap-3 rounded-full border border-accent/35 bg-accent/10 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.24em] text-accent transition-all hover:border-accent/60 hover:bg-accent/18"
      >
        <Mail size={14} />
        Say hello
      </a>
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
