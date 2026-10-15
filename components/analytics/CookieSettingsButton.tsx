'use client';

import { useEffect, useState } from 'react';
import { CONSENT_EVENT, openConsentSettings, readConsent, type ConsentChoice } from '@/lib/consent';

export function CookieSettingsButton() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    setChoice(readConsent());
    const onChange = (e: Event) => setChoice((e as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={openConsentSettings}
        className="rounded-full border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
      >
        Change cookie settings
      </button>
      <span className="text-sm text-fg-subtle">
        Current choice:{' '}
        <span className="text-fg">
          {choice === 'all' ? 'All cookies accepted' : choice === 'essential' ? 'Essential only' : 'Not chosen yet'}
        </span>
      </span>
    </div>
  );
}
