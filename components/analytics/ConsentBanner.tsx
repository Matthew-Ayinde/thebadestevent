'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OPEN_CONSENT_EVENT, readConsent, writeConsent, type ConsentChoice } from '@/lib/consent';

// Staff-only surfaces never show the banner.
const HIDDEN = [/^\/admin(\/|$)/, /^\/hotel-medallion\/scan(\/|$)/];

export function ConsentBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Wait a moment so the banner doesn't fight the splash screen for attention.
    const timer = readConsent() === null ? window.setTimeout(() => setOpen(true), 1200) : undefined;
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
    };
  }, []);

  if (!open || HIDDEN.some((re) => re.test(pathname ?? ''))) return null;

  function choose(choice: ConsentChoice) {
    writeConsent(choice);
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="fixed inset-x-3 bottom-3 z-90 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-md"
    >
      <div className="rounded-[1.6rem] border border-line bg-card-solid p-5 text-fg shadow-card sm:p-6">
        <p className="mb-1 text-[0.62rem] uppercase tracking-[0.28em] text-accent">Your privacy</p>
        <h2 id="consent-title" className="font-serif text-2xl leading-tight text-fg">
          A warm welcome, on your terms
        </h2>
        <p id="consent-body" className="mt-2 text-sm leading-relaxed text-fg-muted">
          We&apos;d like to use cookies to remember your visits and understand how you found us. If you share your details through one of our forms, we&apos;ll
          link them to these visits so we can host you better. {' '}
          <Link href="/privacy" className="text-accent underline underline-offset-4 hover:text-accent-hover">
            Privacy policy
          </Link>
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="flex-1 rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-fg transition hover:bg-tint-strong"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="flex-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
