'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowRight, Check, FileText, UploadCloud, X } from 'lucide-react';
import {
  ANSWER_MAX,
  COVER_LETTER_MAX,
  RESUME_ACCEPT,
  RESUME_EXTENSIONS,
  RESUME_MAX_BYTES,
  fileExtension,
  formatBytes,
  isHttpUrl,
  normalizeUrl,
  type FieldMode,
  type JobQuestion,
  type PublicJob,
} from '@/lib/careers';
import { serif } from './CareersChrome';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls =
  'w-full min-h-[52px] rounded-2xl border bg-[#07171a]/90 px-4 py-3.5 text-white text-sm placeholder:text-white/22 outline-none transition focus:border-[#7dd3cf]/50 focus:shadow-[0_0_0_4px_rgba(125,211,207,0.07)]';

type Values = Record<string, string>;

export function ApplicationForm({ job }: { job: PublicJob }) {
  const reduced = useReducedMotion();
  const [submitted, setSubmitted] = useState<{ firstName: string; email: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleSubmitted(firstName: string, email: string) {
    setSubmitted({ firstName, email });
    requestAnimationFrame(() =>
      containerRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    );
  }

  return (
    <div ref={containerRef} className="scroll-mt-8">
      <Toaster
        position="top-center"
        toastOptions={{ style: { background: '#07171a', color: '#f5f0e8', border: '1px solid rgba(125,211,207,0.2)' } }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: reduced ? 0 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Submitted job={job} firstName={submitted.firstName} email={submitted.email} />
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, y: reduced ? 0 : -18 }} transition={{ duration: 0.35, ease: EASE }}>
            <Form job={job} onSubmitted={handleSubmitted} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form ──────────────────────────────────────────────────────────────────────

function Form({ job, onSubmitted }: { job: PublicJob; onSubmitted: (firstName: string, email: string) => void }) {
  const f = job.applicationFields;
  const [values, setValues] = useState<Values>({});
  const [resume, setResume] = useState<File | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const v = (key: string) => values[key] ?? '';
  const set = (key: string) => (value: string) => setValues(prev => ({ ...prev, [key]: value }));
  const touch = (key: string) => () => setTouched(prev => ({ ...prev, [key]: true }));

  // Field order here drives which invalid field receives focus on submit.
  const errors: Record<string, string> = {};
  if (v('fullName').trim().length < 2) errors.fullName = 'Please share your full name.';
  if (!EMAIL_RE.test(v('email').trim())) errors.email = 'Please enter a valid email address.';
  if ((v('phone').match(/\d/g) ?? []).length < 7) errors.phone = 'Please enter a phone number we can reach you on.';
  if (f.resume === 'required' && !resume) errors.resume = 'Please attach your résumé.';
  urlError(errors, 'linkedin', f.linkedin, v('linkedin'), 'your LinkedIn profile');
  urlError(errors, 'portfolio', f.portfolio, v('portfolio'), 'your portfolio');
  if (f.coverLetter === 'required' && v('coverLetter').trim().length < 30) {
    errors.coverLetter = 'A few sentences about why this role, and why you, would help.';
  }
  for (const q of job.questions) {
    const key = `q:${q.id}`;
    const answer = v(key).trim();
    if (q.required && !answer) errors[key] = 'This question needs an answer.';
    else if (answer && q.type === 'url' && !isHttpUrl(normalizeUrl(answer))) errors[key] = 'Please enter a valid link.';
  }
  const show = (key: string) => (touched[key] ? errors[key] : undefined);

  function pickResume(file: File | null) {
    setTouched(prev => ({ ...prev, resume: true }));
    if (!file) return setResume(null);
    const ext = fileExtension(file.name);
    if (!(RESUME_EXTENSIONS as readonly string[]).includes(ext)) {
      toast.error('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      toast.error(`That file is ${formatBytes(file.size)}. Please keep it under ${formatBytes(RESUME_MAX_BYTES)}.`);
      return;
    }
    setResume(file);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const keys = Object.keys(errors);
    if (keys.length) {
      setTouched(Object.fromEntries(keys.map(k => [k, true])));
      const el = document.getElementById(fieldId(keys[0]));
      el?.focus({ preventScroll: true });
      // Scroll once the error messages have rendered; scrolling in the same tick gets cancelled by that re-render.
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' }), 60);
      return;
    }

    const body = new FormData();
    body.set('jobId', job.id);
    for (const key of ['fullName', 'email', 'phone', 'location', 'linkedin', 'portfolio', 'coverLetter', 'website']) {
      body.set(key, v(key).trim());
    }
    body.set(
      'answers',
      JSON.stringify(Object.fromEntries(job.questions.map(q => [q.id, v(`q:${q.id}`).trim()])))
    );
    if (resume && f.resume !== 'off') body.set('resume', resume);

    try {
      setSubmitting(true);
      const res = await fetch('/api/job-applications', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json.error || (res.status === 413 ? 'Your file is too large. Please upload a smaller résumé.' : 'Something went wrong. Please try again.')
        );
      }
      onSubmitted(v('fullName').trim().split(/\s+/)[0], v('email').trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.', { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  }

  const hasWorkGroup = f.resume !== 'off' || f.linkedin !== 'off' || f.portfolio !== 'off' || f.coverLetter !== 'off';
  const groups = ['about', ...(hasWorkGroup ? ['work'] : []), ...(job.questions.length ? ['questions'] : [])];
  const num = (g: string) => String(groups.indexOf(g) + 1).padStart(2, '0');

  return (
    <form onSubmit={submit} noValidate>
      <p className="mb-5 text-[0.6rem] uppercase tracking-[0.38em] text-[#7dd3cf]/60">Apply</p>
      <h2 id="apply-heading" className="text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] tracking-tight text-white" style={serif}>
        Introduce yourself.
      </h2>
      <p className="mt-4 mb-10 max-w-lg text-[0.92rem] leading-relaxed text-white/50">
        Tell us who you are and what you&apos;d bring to the role. It takes about five minutes, and every application is read by a person.
      </p>

      <div className="space-y-5">
        <Group num={num('about')} label="About you">
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField name="fullName" label="Full name" req autoComplete="name" placeholder="Your full name"
              value={v('fullName')} onChange={set('fullName')} onBlur={touch('fullName')} error={show('fullName')} />
            <TextField name="email" label="Email" req type="email" autoComplete="email" placeholder="you@example.com"
              value={v('email')} onChange={set('email')} onBlur={touch('email')} error={show('email')} />
            <TextField name="phone" label="Phone" req type="tel" autoComplete="tel" placeholder="+234 …"
              value={v('phone')} onChange={set('phone')} onBlur={touch('phone')} error={show('phone')} />
            <TextField name="location" label="Where are you based?" autoComplete="address-level2" placeholder="City, country"
              value={v('location')} onChange={set('location')} onBlur={touch('location')} />
          </div>
        </Group>

        {hasWorkGroup && (
          <Group num={num('work')} label="Your work">
            <div className="space-y-6">
              {f.resume !== 'off' && (
                <ResumeDrop file={resume} required={f.resume === 'required'} error={show('resume')} onPick={pickResume} />
              )}
              {(f.linkedin !== 'off' || f.portfolio !== 'off') && (
                <div className="grid gap-6 sm:grid-cols-2">
                  {f.linkedin !== 'off' && (
                    <TextField name="linkedin" label="LinkedIn" req={f.linkedin === 'required'} type="url" inputMode="url"
                      placeholder="linkedin.com/in/…" value={v('linkedin')} onChange={set('linkedin')}
                      onBlur={touch('linkedin')} error={show('linkedin')} />
                  )}
                  {f.portfolio !== 'off' && (
                    <TextField name="portfolio" label="Portfolio or website" req={f.portfolio === 'required'} type="url"
                      inputMode="url" placeholder="yourwork.com" value={v('portfolio')} onChange={set('portfolio')}
                      onBlur={touch('portfolio')} error={show('portfolio')} />
                  )}
                </div>
              )}
              {f.coverLetter !== 'off' && (
                <AreaField name="coverLetter" label="Cover letter" req={f.coverLetter === 'required'} rows={7}
                  maxLength={COVER_LETTER_MAX} placeholder="Why this role, and why now? What would you bring to RÌNWÁ?"
                  value={v('coverLetter')} onChange={set('coverLetter')} onBlur={touch('coverLetter')} error={show('coverLetter')} />
              )}
            </div>
          </Group>
        )}

        {job.questions.length > 0 && (
          <Group num={num('questions')} label="A few questions">
            <div className="space-y-7">
              {job.questions.map(q => (
                <QuestionField key={q.id} q={q} value={v(`q:${q.id}`)} onChange={set(`q:${q.id}`)}
                  onBlur={touch(`q:${q.id}`)} error={show(`q:${q.id}`)} />
              ))}
            </div>
          </Group>
        )}
      </div>

      {/* Honeypot */}
      <input
        type="text" name="website" value={v('website')} onChange={e => set('website')(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-white/35 sm:max-w-xs">
          Your details are only used to consider your application for this role.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="group flex items-center justify-center gap-2 rounded-full bg-[#7dd3cf] px-8 py-4 text-sm font-semibold text-[#041114] transition hover:bg-[#a5e3df] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#041114]/30 border-t-[#041114]" aria-hidden="true" />
              Sending your application…
            </>
          ) : (
            <>
              Submit application
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function urlError(errors: Record<string, string>, key: string, mode: FieldMode, value: string, label: string) {
  if (mode === 'off') return;
  const trimmed = value.trim();
  if (mode === 'required' && !trimmed) errors[key] = `Please add ${label}.`;
  else if (trimmed && !isHttpUrl(normalizeUrl(trimmed))) errors[key] = 'Please enter a valid link.';
}

const fieldId = (key: string) => `apply-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

// ─── Building blocks ───────────────────────────────────────────────────────────

function Group({ num, label, children }: { num: string; label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#041114]/72 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8">
      <div className="mb-7 flex items-center gap-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#7dd3cf]/40 bg-[#7dd3cf]/10 text-[0.62rem] tracking-[0.1em] text-[#7dd3cf]">
          {num}
        </span>
        <h3 className="text-[0.68rem] uppercase tracking-[0.3em] text-white/70">{label}</h3>
        <span className="h-px flex-1 bg-white/8" />
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, req, id, htmlFor }: { children: React.ReactNode; req?: boolean; id?: string; htmlFor?: string }) {
  const cls = 'block text-[0.68rem] uppercase tracking-[0.22em] text-white/42 mb-3 leading-relaxed';
  const content = (
    <>
      {children}
      {req ? <span className="ml-1 text-[#7dd3cf]/60">*</span> : <span className="ml-2 normal-case tracking-normal text-white/25">(optional)</span>}
    </>
  );
  return htmlFor ? <label id={id} htmlFor={htmlFor} className={cls}>{content}</label> : <span id={id} className={cls}>{content}</span>;
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden pt-2 text-xs text-[#e8a598]" role="alert"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

type FieldProps = {
  name: string; label: string; value: string; onChange: (v: string) => void; onBlur: () => void;
  error?: string; req?: boolean; placeholder?: string;
};

function TextField({
  name, label, value, onChange, onBlur, error, req, placeholder, type = 'text', autoComplete, inputMode,
}: FieldProps & { type?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  const id = fieldId(name);
  return (
    <div>
      <FieldLabel htmlFor={id} req={req}>{label}</FieldLabel>
      <input
        id={id} name={name} type={type} value={value} autoComplete={autoComplete} inputMode={inputMode}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} maxLength={300}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} aria-required={req}
        className={`${inputCls} ${error ? 'border-[#e8a598]/50' : 'border-white/10'}`}
      />
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

function AreaField({ name, label, value, onChange, onBlur, error, req, placeholder, rows = 4, maxLength }: FieldProps & { rows?: number; maxLength: number }) {
  const id = fieldId(name);
  const near = value.length >= maxLength * 0.85;
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <FieldLabel htmlFor={id} req={req}>{label}</FieldLabel>
        {value.length > 0 && (
          <span className={`shrink-0 text-[0.65rem] tabular-nums ${near ? 'text-[#e8a598]' : 'text-white/25'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id} name={name} rows={rows} value={value} maxLength={maxLength}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} aria-required={req}
        className={`${inputCls} min-h-0 resize-y leading-relaxed ${error ? 'border-[#e8a598]/50' : 'border-white/10'}`}
      />
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

function QuestionField({ q, value, onChange, onBlur, error }: {
  q: JobQuestion; value: string; onChange: (v: string) => void; onBlur: () => void; error?: string;
}) {
  const name = `q:${q.id}`;
  if (q.type === 'short' || q.type === 'url') {
    return (
      <TextField name={name} label={q.label} req={q.required} value={value} onChange={onChange} onBlur={onBlur} error={error}
        type={q.type === 'url' ? 'url' : 'text'} inputMode={q.type === 'url' ? 'url' : undefined}
        placeholder={q.type === 'url' ? 'https://…' : undefined} />
    );
  }
  if (q.type === 'long') {
    return (
      <AreaField name={name} label={q.label} req={q.required} value={value} onChange={onChange} onBlur={onBlur}
        error={error} maxLength={ANSWER_MAX} />
    );
  }

  const options = q.type === 'yesno' ? ['Yes', 'No'] : q.options;
  const id = fieldId(name);
  return (
    <div>
      <FieldLabel id={`${id}-label`} req={q.required}>{q.label}</FieldLabel>
      <div
        id={id} tabIndex={-1} role="radiogroup" aria-labelledby={`${id}-label`} aria-required={q.required}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-wrap gap-2 outline-none"
      >
        {options.map(opt => (
          <button
            key={opt} type="button" role="radio" aria-checked={value === opt}
            onClick={() => { onChange(value === opt ? '' : opt); onBlur(); }}
            className={`rounded-full border px-4 py-2 text-sm transition-all ${
              value === opt
                ? 'border-[#7dd3cf] bg-[#7dd3cf]/14 text-[#7dd3cf]'
                : `${error ? 'border-[#e8a598]/40' : 'border-white/10'} bg-white/4 text-white/55 hover:border-white/18 hover:bg-white/7 hover:text-white`
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

function ResumeDrop({ file, required, error, onPick }: {
  file: File | null; required: boolean; error?: string; onPick: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = fieldId('resume');

  // Keep the native input in sync when the file is cleared.
  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = '';
  }, [file]);

  return (
    <div>
      <FieldLabel htmlFor={id} req={required}>Résumé / CV</FieldLabel>
      {file ? (
        <div className="flex items-center gap-4 rounded-2xl border border-[#7dd3cf]/30 bg-[#7dd3cf]/[0.06] px-4 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7dd3cf]/30 bg-[#041114]/60">
            <FileText size={18} className="text-[#7dd3cf]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/85">{file.name}</p>
            <p className="mt-0.5 text-xs text-white/40">{formatBytes(file.size)} · ready to send</p>
          </div>
          <button
            type="button" onClick={() => onPick(null)} aria-label="Remove résumé"
            className="shrink-0 rounded-full border border-white/10 p-2 text-white/50 transition hover:border-[#e8a598]/40 hover:text-[#e8a598]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files?.[0] ?? null); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-9 text-center transition focus-within:border-[#7dd3cf]/60 focus-within:shadow-[0_0_0_4px_rgba(125,211,207,0.07)] ${
            dragging
              ? 'border-[#7dd3cf] bg-[#7dd3cf]/[0.08]'
              : error
                ? 'border-[#e8a598]/50 bg-[#07171a]/60'
                : 'border-white/15 bg-[#07171a]/60 hover:border-[#7dd3cf]/40 hover:bg-[#07171a]/90'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#7dd3cf]/30 bg-[#7dd3cf]/10">
            <UploadCloud size={19} className="text-[#7dd3cf]" />
          </span>
          <span className="text-sm text-white/75">
            <span className="text-[#7dd3cf]">Choose a file</span> or drag it here
          </span>
          <span className="text-xs text-white/35">PDF or Word · up to {formatBytes(RESUME_MAX_BYTES)}</span>
          <input
            ref={inputRef} id={id} type="file" accept={RESUME_ACCEPT} className="sr-only"
            aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} aria-required={required}
            onChange={e => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

// ─── Confirmation ──────────────────────────────────────────────────────────────

function Submitted({ job, firstName, email }: { job: PublicJob; firstName: string; email: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-white/10 bg-[#041114]/72 px-6 py-14 text-center shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-12 sm:py-20">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#7dd3cf]/40 bg-[#7dd3cf]/10"
      >
        <Check size={26} className="text-[#7dd3cf]" strokeWidth={2.5} />
      </motion.div>

      <p className="mb-6 text-[0.6rem] tracking-[0.45em] text-[#7dd3cf]/60">You&apos;ve&nbsp;Rinwa&apos;d</p>
      <h2
        ref={headingRef} tabIndex={-1}
        className="mb-6 max-w-xl text-[clamp(2.2rem,6vw,3.6rem)] leading-[1] tracking-tight text-white outline-none"
        style={serif}
      >
        Thank you, {firstName}. Your application is with us.
      </h2>
      <p className="mb-3 max-w-md text-base leading-relaxed text-white/55">
        We&apos;ve sent a confirmation to <span className="break-all text-white/80">{email}</span>. Our team will read your
        application for <span className="text-white/80">{job.title}</span>{' '}and reach out if there&apos;s a fit.
      </p>
      <p className="mb-10 text-sm italic text-white/35">Don&apos;t see the email? Check your spam or promotions folder.</p>

      <Link
        href="/careers"
        className="group inline-flex items-center gap-3 rounded-full border border-[#7dd3cf]/35 bg-[#7dd3cf]/10 px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#7dd3cf] transition-all hover:border-[#7dd3cf]/60 hover:bg-[#7dd3cf]/18"
      >
        Explore other roles
      </Link>
    </div>
  );
}
