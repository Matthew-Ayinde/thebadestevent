'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LockKeyhole } from 'lucide-react';
import { MedallionWordmark } from '@/components/hotel-medallion/MedallionBrand';

export function ScannerLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/hotel-medallion/scanner/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Sign-in failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setPasscode('');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <MedallionWordmark compact />
      <div className="mt-8 rounded-3xl border border-(--hm-line) bg-(--hm-navy)/80 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-(--hm-accent)">
          <LockKeyhole className="size-4" aria-hidden />
          <p className="text-xs uppercase tracking-[0.28em]">Door staff</p>
        </div>
        <h1 className="mt-2 font-serif text-2xl text-(--hm-cream)">Guest check-in</h1>

        {configured ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="passcode" className="text-xs uppercase tracking-[0.22em] text-(--hm-mist)">Passcode</label>
              <input
                id="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={busy}
                className="mt-2 w-full rounded-xl border border-(--hm-line) bg-(--hm-ink)/70 px-4 py-3 text-base text-(--hm-cream) focus:border-(--hm-accent)/70 focus:outline-none focus:ring-4 focus:ring-(--hm-accent)/10"
              />
            </div>
            {error && <p role="alert" className="text-sm text-(--hm-bad)">{error}</p>}
            <button
              type="submit"
              disabled={busy || !passcode}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-(--hm-navy) transition hover:bg-(--hm-accent-soft) disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Unlock scanner
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-(--hm-mist)">
            The scanner isn’t set up yet. Add <code className="text-(--hm-accent-soft)">MEDALLION_SCANNER_PASSCODE</code> to
            the server environment and redeploy.
          </p>
        )}
      </div>
    </main>
  );
}
