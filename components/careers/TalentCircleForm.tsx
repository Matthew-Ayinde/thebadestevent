'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowRight, Check } from 'lucide-react';
import { useSimpleFormAnalytics } from '@/lib/use-form-analytics';
import {
  ANSWER_MAX,
  TALENT_CRAFTS,
  TALENT_EXPERIENCE,
  TALENT_START,
  TALENT_WORK_TYPES,
  isHttpUrl,
  normalizeUrl,
} from '@/lib/careers';
import { serif } from './CareersChrome';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls =
  'w-full min-h-[52px] rounded-2xl border bg-field px-4 py-3.5 text-fg text-sm placeholder:text-fg-faint outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_4px_var(--ring)]';

const EMPTY = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  currentRole: '',
  experience: TALENT_EXPERIENCE[0] as string,
  startWhen: TALENT_START[0] as string,
  link: '',
  moment: '',
  dreamMove: '',
  website: '',
};
type Values = typeof EMPTY;

export function TalentCircle() {
  return (
    <section id="talent-circle" aria-labelledby="talent-circle-heading" className="scroll-mt-8 border-y border-line-soft bg-tint">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-4 text-[0.66rem] uppercase tracking-[0.38em] text-accent">The RÌNWÁ talent circle</p>
          <h2 id="talent-circle-heading" className="text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.02] tracking-tight text-fg" style={serif}>
            Don&apos;t see your role yet?
          </h2>
          <p className="mt-6 text-base leading-relaxed text-fg-muted">
            The best opportunities often move before they&apos;re posted. Join the circle to be first to hear about new roles,
            pop-ups, residencies and launches across Lagos and beyond.
          </p>
          <p className="mt-5 text-sm text-fg-faint">It takes about four minutes. We read every one.</p>
        </div>

        <TalentCircleForm />
      </div>
    </section>
  );
}

function TalentCircleForm() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [crafts, setCrafts] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const analytics = useSimpleFormAnalytics('talent_circle');

  const set = (key: keyof Values) => (value: string) => setValues(prev => ({ ...prev, [key]: value }));
  const touch = (key: string) => () => setTouched(prev => ({ ...prev, [key]: true }));
  const toggle = (list: string[], setList: (v: string[]) => void, key: string) => (item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  // Field order here drives which invalid field receives focus on submit.
  const errors: Record<string, string> = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Please share your full name.';
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Please enter a valid email address.';
  if ((values.whatsapp.match(/\d/g) ?? []).length < 7) errors.whatsapp = 'Please enter a WhatsApp number we can reach you on.';
  if (values.city.trim().length < 2) errors.city = 'Please tell us which city you’re based in.';
  if (crafts.length === 0) errors.crafts = 'Pick at least one.';
  if (lookingFor.length === 0) errors.lookingFor = 'Pick at least one.';
  if (values.link.trim() && !isHttpUrl(normalizeUrl(values.link))) errors.link = 'Please enter a valid link.';
  if (!consent) errors.consent = 'We need your permission to keep your details on file.';
  const show = (key: string) => (touched[key] ? errors[key] : undefined);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const keys = Object.keys(errors);
    if (keys.length) {
      analytics.trackError(errors[keys[0]] || 'Required fields missing');
      setTouched(Object.fromEntries(keys.map(k => [k, true])));
      const el = document.getElementById(fieldId(keys[0]));
      el?.focus({ preventScroll: true });
      // Scroll once the error messages have rendered; scrolling in the same tick gets cancelled by that re-render.
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' }), 60);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/talent-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])),
          crafts,
          lookingFor,
          consent,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      analytics.markSubmitted();
      setJoined(values.fullName.trim().split(/\s+/)[0]);
      requestAnimationFrame(() =>
        containerRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(message, { duration: 6000 });
      analytics.trackSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={containerRef} className="scroll-mt-8">
      <Toaster
        position="top-center"
        toastOptions={{ style: { background: 'var(--card-solid)', color: 'var(--fg)', border: '1px solid var(--line)', boxShadow: 'var(--card-shadow)' } }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {joined ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: reduced ? 0 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Joined firstName={joined} />
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: reduced ? 0 : -18 }}
            transition={{ duration: 0.35, ease: EASE }}
            onSubmit={submit}
            onFocus={analytics.markStarted}
            noValidate
            className="relative rounded-[2rem] border border-line bg-card p-6 shadow-card backdrop-blur-xl sm:p-9"
          >
            <Part num={1} label="About you">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField name="fullName" label="Full name" autoComplete="name" placeholder="Your name"
                  value={values.fullName} onChange={set('fullName')} onBlur={touch('fullName')} error={show('fullName')} />
                <TextField name="email" label="Email" type="email" autoComplete="email" placeholder="you@email.com"
                  value={values.email} onChange={set('email')} onBlur={touch('email')} error={show('email')} />
                <TextField name="whatsapp" label="WhatsApp number" type="tel" autoComplete="tel" placeholder="+234"
                  value={values.whatsapp} onChange={set('whatsapp')} onBlur={touch('whatsapp')} error={show('whatsapp')} />
                <TextField name="city" label="City you’re based in" autoComplete="address-level2" placeholder="e.g. Lagos"
                  value={values.city} onChange={set('city')} onBlur={touch('city')} error={show('city')} />
              </div>
            </Part>

            <Part num={2} label="Your craft">
              <Chips name="crafts" label="Where do you do your best work? Pick all that apply." options={TALENT_CRAFTS}
                selected={crafts} onToggle={toggle(crafts, setCrafts, 'crafts')} error={show('crafts')} />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <TextField name="currentRole" label="Current or most recent role" optional placeholder="e.g. Sous Chef, Head Bartender"
                  value={values.currentRole} onChange={set('currentRole')} onBlur={touch('currentRole')} />
                <SelectField name="experience" label="Years in hospitality" options={TALENT_EXPERIENCE}
                  value={values.experience} onChange={set('experience')} />
              </div>
            </Part>

            <Part num={3} label="What you’re looking for">
              <Chips name="lookingFor" label="Pick all that apply." options={TALENT_WORK_TYPES}
                selected={lookingFor} onToggle={toggle(lookingFor, setLookingFor, 'lookingFor')} error={show('lookingFor')} />
              <div className="mt-6 sm:max-w-[calc(50%-0.625rem)]">
                <SelectField name="startWhen" label="When could you start?" options={TALENT_START}
                  value={values.startWhen} onChange={set('startWhen')} />
              </div>
            </Part>

            <Part num={4} label="Show us your work">
              <div className="space-y-5">
                <TextField name="link" label="Instagram, portfolio or CV link" optional type="url" inputMode="url"
                  placeholder="Link to your menus, cocktails, events or CV"
                  value={values.link} onChange={set('link')} onBlur={touch('link')} error={show('link')} />
                <AreaField name="moment" label="Tell us about a moment you made unforgettable"
                  hint="A dish, a drink, a guest you won back, a night that almost went wrong. A few lines is plenty."
                  value={values.moment} onChange={set('moment')} onBlur={touch('moment')} />
                <TextField name="dreamMove" label="What would make your next role a dream move?" optional
                  placeholder="e.g. Leading my own kitchen, working with a hotel brand, travelling for events"
                  value={values.dreamMove} onChange={set('dreamMove')} onBlur={touch('dreamMove')} />
              </div>
            </Part>

            {/* Honeypot */}
            <input
              type="text" name="website" value={values.website} onChange={e => set('website')(e.target.value)}
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            <div className="mt-8 border-t border-line pt-7">
              <label htmlFor={fieldId('consent')} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg-muted">
                <input
                  id={fieldId('consent')} type="checkbox" checked={consent}
                  onChange={e => { setConsent(e.target.checked); touch('consent')(); }}
                  aria-invalid={!!show('consent')} aria-describedby={show('consent') ? `${fieldId('consent')}-error` : undefined}
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-[var(--accent)]"
                />
                I&apos;m happy for RÌNWÁ to keep my details and contact me about roles with partner brands.
              </label>
              <FieldError id={`${fieldId('consent')}-error`} msg={show('consent')} />

              <button
                type="submit"
                disabled={submitting}
                className="group mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent" aria-hidden="true" />
                    Joining…
                  </>
                ) : (
                  <>
                    Join the circle
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const fieldId = (key: string) => `circle-${key}`;

// ─── Building blocks ───────────────────────────────────────────────────────────

function Part({ num, label, children }: { num: number; label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-9 first:mt-0">
      <legend className="mb-5 text-[1.55rem] leading-tight text-fg" style={serif}>
        <span className="text-accent">{num}.</span> {label}
      </legend>
      {children}
    </fieldset>
  );
}

const labelCls = 'mb-2 block text-[0.8rem] text-fg-muted';

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden pt-2 text-xs text-danger" role="alert"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

type FieldProps = {
  name: string; label: string; value: string; onChange: (v: string) => void; onBlur: () => void;
  error?: string; optional?: boolean; placeholder?: string;
};

function Label({ htmlFor, id, label, optional }: { htmlFor?: string; id?: string; label: string; optional?: boolean }) {
  const content = (
    <>
      {label}
      {optional && <span className="ml-1.5 text-fg-faint">(optional)</span>}
    </>
  );
  return htmlFor ? <label htmlFor={htmlFor} className={labelCls}>{content}</label> : <span id={id} className={labelCls}>{content}</span>;
}

function TextField({
  name, label, value, onChange, onBlur, error, optional, placeholder, type = 'text', autoComplete, inputMode,
}: FieldProps & { type?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id} label={label} optional={optional} />
      <input
        id={id} name={name} type={type} value={value} autoComplete={autoComplete} inputMode={inputMode}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} maxLength={300}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} aria-required={!optional}
        className={`${inputCls} ${error ? 'border-danger/50' : 'border-line'}`}
      />
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

function AreaField({ name, label, hint, value, onChange, onBlur }: Omit<FieldProps, 'error' | 'optional'> & { hint: string }) {
  const id = fieldId(name);
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <Label htmlFor={id} label={label} optional />
        {value.length > 0 && (
          <span className={`shrink-0 text-[0.65rem] tabular-nums ${value.length >= ANSWER_MAX * 0.85 ? 'text-danger' : 'text-fg-faint'}`}>
            {value.length}/{ANSWER_MAX}
          </span>
        )}
      </div>
      <p id={`${id}-hint`} className="-mt-1 mb-2 text-xs text-fg-faint">{hint}</p>
      <textarea
        id={id} name={name} rows={4} value={value} maxLength={ANSWER_MAX}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} aria-describedby={`${id}-hint`}
        className={`${inputCls} min-h-0 resize-y border-line leading-relaxed`}
      />
    </div>
  );
}

function SelectField({ name, label, options, value, onChange }: {
  name: string; label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id} label={label} />
      <select id={id} name={name} value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} cursor-pointer border-line`}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Chips({ name, label, options, selected, onToggle, error }: {
  name: string; label: string; options: readonly string[]; selected: string[]; onToggle: (v: string) => void; error?: string;
}) {
  const id = fieldId(name);
  return (
    <div>
      <Label id={`${id}-label`} label={label} />
      <div
        id={id} tabIndex={-1} role="group" aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined} className="flex flex-wrap gap-2 outline-none"
      >
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt} type="button" aria-pressed={active} onClick={() => onToggle(opt)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all ${
                active
                  ? 'border-accent bg-accent/14 text-accent'
                  : `${error ? 'border-danger/40' : 'border-line'} bg-field text-fg-muted hover:border-line-strong hover:bg-tint-strong hover:text-fg`
              }`}
            >
              {active && <Check size={13} aria-hidden="true" />}
              {opt}
            </button>
          );
        })}
      </div>
      <FieldError id={`${id}-error`} msg={error} />
    </div>
  );
}

// ─── Confirmation ──────────────────────────────────────────────────────────────

function Joined({ firstName }: { firstName: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-line bg-card px-6 py-14 text-center shadow-card backdrop-blur-xl sm:px-12 sm:py-20">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/10"
      >
        <Check size={26} className="text-accent" strokeWidth={2.5} />
      </motion.div>
      <p className="mb-6 text-[0.66rem] uppercase tracking-[0.45em] text-accent">You&apos;re in the circle</p>
      <h3
        ref={headingRef} tabIndex={-1}
        className="mb-6 max-w-lg text-[clamp(2rem,5vw,3rem)] leading-[1.04] tracking-tight text-fg outline-none"
        style={serif}
      >
        Thank you, {firstName}. We&apos;ll be in touch.
      </h3>
      <p className="max-w-md text-base leading-relaxed text-fg-muted">
        A RÌNWÁ advisor will read what you&apos;ve shared. When a room opens that fits what you do best, you&apos;ll hear from us first.
      </p>
    </div>
  );
}
