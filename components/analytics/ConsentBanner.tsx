'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OPEN_CONSENT_EVENT, readConsent, writeConsent, type ConsentChoice } from '@/lib/consent';

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

  if (!open || pathname?.startsWith('/admin')) return null;

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
      <div className="rounded-[1.6rem] border border-white/10 bg-[#07171a]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6">
        <p className="mb-1 text-[0.62rem] uppercase tracking-[0.28em] text-teal-300/70">Your privacy</p>
        <h2 id="consent-title" className="font-serif text-2xl leading-tight text-white/95">
          A warm welcome, on your terms
        </h2>
        <p id="consent-body" className="mt-2 text-sm leading-relaxed text-white/60">
          We&apos;d like to use a cookie to remember your visits and understand how you found us, including your
          approximate location, device and IP address. If you share your details through one of our forms, we&apos;ll
          link them to these visits so we can host you better.{' '}
          <Link href="/privacy" className="text-teal-200/90 underline underline-offset-4 hover:text-teal-100">
            Privacy policy
          </Link>
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="flex-1 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="flex-1 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#041114] transition hover:bg-teal-200"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
