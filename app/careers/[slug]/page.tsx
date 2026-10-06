import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowDown, Briefcase, CalendarClock, Clock, MapPin, Wallet } from 'lucide-react';
import { CareersBackdrop, CareersFooter, CareersTopBar, serif } from '@/components/careers/CareersChrome';
import { ApplicationForm } from '@/components/careers/ApplicationForm';
import { getJobBySlug } from '@/lib/careers-server';
import { closingDateEnd, formatClosingDate, type PublicJob } from '@/lib/careers';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getJobBySlug(slug);
  if (!result) return { title: 'Role not found' };
  const { job } = result;
  const description = job.overview.length > 160 ? `${job.overview.slice(0, 157).trimEnd()}…` : job.overview;
  return {
    title: `${job.title} · Careers`,
    description,
    alternates: { canonical: `/careers/${job.slug}` },
    openGraph: { title: `${job.title} — RÌNWÁ Careers`, description, url: `/careers/${job.slug}` },
    robots: result.accepting ? undefined : { index: false },
  };
}

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACTOR',
  Internship: 'INTERN',
  Freelance: 'CONTRACTOR',
};

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// schema.org JobPosting so open roles can surface in Google's job search.
function jobPostingJsonLd(job: PublicJob) {
  const list = (title: string, items: string[]) =>
    items.length ? `<p><strong>${title}</strong></p><ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: `<p>${escapeHtml(job.overview)}</p>${list("What you'll do", job.responsibilities)}${list('Who you are', job.requirements)}${list('Nice to have', job.niceToHave)}`,
    datePosted: job.createdAt,
    ...(job.closingDate ? { validThrough: closingDateEnd(job.closingDate).toISOString() } : {}),
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.type] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      sameAs: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    },
    ...(job.workplace === 'Remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    directApply: true,
    url: `${siteUrl}/careers/${job.slug}`,
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const result = await getJobBySlug(slug);
  if (!result) notFound();
  const { job, accepting } = result;
  const closes = formatClosingDate(job.closingDate);

  const facts = [
    { icon: MapPin, label: 'Location', value: job.location },
    { icon: Briefcase, label: 'Workplace', value: job.workplace },
    { icon: Clock, label: 'Employment', value: job.type },
    job.compensation ? { icon: Wallet, label: 'Compensation', value: job.compensation } : null,
    closes ? { icon: CalendarClock, label: accepting ? 'Applications close' : 'Closed', value: closes } : null,
  ].filter((f): f is NonNullable<typeof f> => !!f);

  return (
    <main className="relative min-h-screen overflow-x-clip">
      {accepting && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job)).replace(/</g, '\\u003c') }}
        />
      )}
      <CareersBackdrop />

      <div className="relative z-10">
        <CareersTopBar back={{ href: '/careers', label: 'All roles' }} />

        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16">
          <p className="mb-5 text-[0.6rem] uppercase tracking-[0.42em] text-[#7dd3cf]/65">
            {job.department || 'Open role'}
          </p>
          <h1 className="max-w-4xl text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.95] tracking-tight text-white" style={serif}>
            {job.title}
          </h1>
          <ul className="mt-8 flex flex-wrap gap-2">
            {[job.location, job.workplace, job.type].map(v => (
              <li key={v} className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/65">{v}</li>
            ))}
          </ul>
        </section>

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          {/* Description */}
          <article className="min-w-0 space-y-12">
            <Section eyebrow="The role">
              <p className="whitespace-pre-line text-[0.98rem] leading-[1.85] text-white/70 sm:text-[1.05rem]">{job.overview}</p>
            </Section>
            <BulletSection eyebrow="What you'll do" items={job.responsibilities} />
            <BulletSection eyebrow="Who you are" items={job.requirements} />
            <BulletSection eyebrow="Nice to have" items={job.niceToHave} muted />
          </article>

          {/* Summary rail */}
          <aside className="lg:row-span-2">
            <div className="rounded-[1.8rem] border border-white/10 bg-[#041114]/72 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:sticky lg:top-8">
              <p className="mb-5 text-[0.58rem] uppercase tracking-[0.3em] text-white/40">At a glance</p>
              <dl className="space-y-4">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <Icon size={15} className="mt-0.5 shrink-0 text-[#7dd3cf]/70" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">{label}</dt>
                      <dd className="mt-0.5 break-words text-sm text-white/85">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <div className="mt-6 border-t border-white/8 pt-6">
                {accepting ? (
                  <a
                    href="#apply"
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#7dd3cf] px-6 py-3.5 text-sm font-semibold text-[#041114] transition hover:bg-[#a5e3df]"
                  >
                    Apply for this role
                    <ArrowDown size={14} className="transition-transform group-hover:translate-y-0.5" />
                  </a>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-center text-sm text-white/55">
                    Applications for this role have closed.
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* Application */}
          <section id="apply" aria-labelledby="apply-heading" className="min-w-0 scroll-mt-8 border-t border-white/8 pt-14">
            {accepting ? (
              <ApplicationForm job={job} />
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-[#041114]/72 px-6 py-12 text-center backdrop-blur-xl">
                <h2 id="apply-heading" className="text-3xl text-white" style={serif}>This role has closed.</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/50">
                  Thank you for your interest. Take a look at our other open roles — there may be a place for you there.
                </p>
                <a
                  href="/careers"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#7dd3cf]/35 bg-[#7dd3cf]/10 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#7dd3cf] transition hover:border-[#7dd3cf]/60 hover:bg-[#7dd3cf]/18"
                >
                  See open roles
                </a>
              </div>
            )}
          </section>
        </div>

        <CareersFooter />
      </div>
    </main>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-[0.6rem] uppercase tracking-[0.38em] text-[#7dd3cf]/60">{eyebrow}</h2>
      {children}
    </section>
  );
}

function BulletSection({ eyebrow, items, muted }: { eyebrow: string; items: string[]; muted?: boolean }) {
  if (!items.length) return null;
  return (
    <Section eyebrow={eyebrow}>
      <ul className="space-y-3.5">
        {items.map((item, i) => (
          <li key={i} className={`flex gap-4 text-[0.95rem] leading-relaxed sm:text-base ${muted ? 'text-white/55' : 'text-white/72'}`}>
            <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-[#7dd3cf]/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
