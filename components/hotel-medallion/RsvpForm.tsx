'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { useSimpleFormAnalytics } from '@/lib/use-form-analytics';

type Fields = { firstName: string; lastName: string; email: string };
const EMPTY: Fields = { firstName: '', lastName: '', email: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (!f.firstName.trim()) errors.firstName = 'Please enter your first name';
  if (!f.lastName.trim()) errors.lastName = 'Please enter your last name';
  if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Please enter a valid email address';
  return errors;
}

const inputClass =
  'mt-2 w-full rounded-xl border border-(--hm-line) bg-(--hm-ink)/70 px-4 py-3 text-base text-(--hm-cream) placeholder:text-(--hm-dim)/70 transition focus:border-(--hm-accent)/70 focus:outline-none focus:ring-4 focus:ring-(--hm-accent)/10 aria-invalid:border-(--hm-bad)/70';

export function RsvpForm() {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'redirecting' | 'exists'>('idle');
  const analytics = useSimpleFormAnalytics('medallion_rsvp');

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      analytics.trackError(Object.values(found)[0] ?? 'Required fields missing');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/hotel-medallion/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      analytics.markSubmitted();

      if (data.status === 'created') {
        setStatus('redirecting');
        router.push(`/hotel-medallion/ticket/${data.token}`);
      } else {
        setStatus('exists');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(message);
      analytics.trackSubmitError(message);
      setStatus('idle');
    }
  }

  if (status === 'exists') {
    return (
      <div role="status" className="mt-6 rounded-2xl border border-(--hm-accent)/30 bg-(--hm-accent)/5 p-5 text-sm">
        <div className="flex items-center gap-2 font-medium text-(--hm-accent-soft)">
          <MailCheck className="size-5" aria-hidden />
          You’re already on the guest list
        </div>
        <p className="mt-2 leading-relaxed text-(--hm-mist)">
          We’ve sent your invitation and QR pass to <span className="text-(--hm-cream)">{fields.email.trim()}</span>{' '}
          again. Check your inbox (and spam folder) — it may take a minute to arrive.
        </p>
        <button
          type="button"
          onClick={() => { setFields(EMPTY); setStatus('idle'); analytics.reset(); }}
          className="mt-4 text-xs uppercase tracking-[0.2em] text-(--hm-accent) underline-offset-4 hover:underline"
        >
          Register someone else
        </button>
      </div>
    );
  }

  const busy = status !== 'idle';

  return (
    <form onSubmit={handleSubmit} onFocus={analytics.markStarted} noValidate className="mt-6 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {(['firstName', 'lastName'] as const).map((key) => (
          <div key={key}>
            <label htmlFor={key} className="text-xs uppercase tracking-[0.22em] text-(--hm-mist)">
              {key === 'firstName' ? 'First name' : 'Last name'}
            </label>
            <input
              id={key}
              name={key}
              autoComplete={key === 'firstName' ? 'given-name' : 'family-name'}
              value={fields[key]}
              onChange={set(key)}
              maxLength={60}
              disabled={busy}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
              className={inputClass}
            />
            {errors[key] && <p id={`${key}-error`} className="mt-1.5 text-xs text-(--hm-bad)">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="email" className="text-xs uppercase tracking-[0.22em] text-(--hm-mist)">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={fields.email}
          onChange={set('email')}
          maxLength={200}
          disabled={busy}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={inputClass}
        />
        {errors.email && <p id="email-error" className="mt-1.5 text-xs text-(--hm-bad)">{errors.email}</p>}
      </div>

      {/* Honeypot — hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {formError && (
        <p role="alert" className="rounded-xl border border-(--hm-bad)/30 bg-(--hm-bad)/10 px-4 py-3 text-sm text-(--hm-bad)">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-(--hm-navy) transition hover:bg-(--hm-accent-soft) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {status === 'redirecting' ? 'Preparing your pass…' : busy ? 'Reserving…' : 'RSVP'}
      </button>
    </form>
  );
}
