'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, Loader2, MailWarning, Search } from 'lucide-react';
import type { CheckInResult } from '@/lib/hotel-medallion';

type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  registeredAt: string;
  checkedInAt: string | null;
  emailDelivered: boolean;
};

type Filter = 'all' | 'in' | 'out';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function csvCell(value: string) {
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportCsv(guests: Guest[]) {
  const rows = [
    ['First name', 'Last name', 'Email', 'Code', 'Registered', 'Checked in'],
    ...guests.map((g) => [
      g.firstName,
      g.lastName,
      g.email,
      g.code,
      new Date(g.registeredAt).toLocaleString(),
      g.checkedInAt ? new Date(g.checkedInAt).toLocaleString() : '',
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hotel-medallion-guests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GuestList() {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hotel-medallion/guests', { cache: 'no-store' });
      if (res.status === 401) return window.location.assign('/hotel-medallion/scan');
      if (!res.ok) throw new Error();
      setGuests((await res.json()).guests);
      setError('');
    } catch {
      setError('Couldn’t refresh the guest list. Retrying…');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function checkIn(guest: Guest) {
    if (!window.confirm(`Check in ${guest.firstName} ${guest.lastName} (${guest.code})?`)) return;
    setPendingId(guest.id);
    try {
      const res = await fetch('/api/hotel-medallion/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: guest.code }),
      });
      if (res.status === 401) return window.location.assign('/hotel-medallion/scan');
      const data = (await res.json()) as CheckInResult;
      if ('guest' in data) {
        setGuests((list) => list?.map((g) => (g.id === guest.id ? { ...g, checkedInAt: data.guest.checkedInAt } : g)) ?? null);
      }
    } catch {
      setError('Check-in failed — check the connection and try again.');
    } finally {
      setPendingId(null);
    }
  }

  const counts = useMemo(() => {
    const checkedIn = guests?.filter((g) => g.checkedInAt).length ?? 0;
    return { all: guests?.length ?? 0, in: checkedIn, out: (guests?.length ?? 0) - checkedIn };
  }, [guests]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (guests ?? []).filter((g) => {
      if (filter === 'in' && !g.checkedInAt) return false;
      if (filter === 'out' && g.checkedInAt) return false;
      if (!q) return true;
      return `${g.firstName} ${g.lastName} ${g.email} ${g.code}`.toLowerCase().includes(q);
    });
  }, [guests, query, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in', label: 'Checked in' },
    { key: 'out', label: 'Not arrived' },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/hotel-medallion/scan"
          className="flex items-center gap-1.5 rounded-full border border-(--hm-line) px-3 py-2 text-xs text-(--hm-mist) transition hover:border-(--hm-accent)/50 hover:text-(--hm-cream)"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Scanner
        </Link>
        <button
          type="button"
          onClick={() => guests && exportCsv(visible)}
          disabled={!guests?.length}
          className="flex items-center gap-1.5 rounded-full border border-(--hm-line) px-3 py-2 text-xs text-(--hm-mist) transition hover:border-(--hm-accent)/50 hover:text-(--hm-cream) disabled:opacity-40"
        >
          <Download className="size-3.5" aria-hidden />
          Export CSV
        </button>
      </header>

      <div className="mt-5">
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-(--hm-accent)">Hotel Medallion</p>
        <h1 className="font-serif text-3xl text-(--hm-cream)">Guest list</h1>
      </div>

      <section aria-label="Attendance" className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Registered', value: counts.all },
          { label: 'Checked in', value: counts.in, accent: true },
          { label: 'Not arrived', value: counts.out },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-3 py-3 sm:px-4">
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-(--hm-dim)">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.accent ? 'text-(--hm-accent-soft)' : 'text-(--hm-cream)'}`}>
              {guests ? s.value : '—'}
            </p>
          </div>
        ))}
      </section>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-(--hm-dim)" aria-hidden />
        <label htmlFor="guest-search" className="sr-only">Search guests</label>
        <input
          id="guest-search"
          type="search"
          placeholder="Search name, email or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-(--hm-line) bg-(--hm-ink)/70 py-3 pl-11 pr-4 text-base text-(--hm-cream) placeholder:text-(--hm-dim)/70 focus:border-(--hm-accent)/70 focus:outline-none"
        />
      </div>

      <div role="tablist" aria-label="Filter guests" className="mt-3 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${
              filter === t.key
                ? 'border-(--hm-accent) bg-(--hm-accent) font-semibold text-(--hm-navy)'
                : 'border-(--hm-line) text-(--hm-mist) hover:text-(--hm-cream)'
            }`}
          >
            {t.label} <span className="tabular-nums">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-(--hm-warn)">{error}</p>}

      {!guests ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="size-7 animate-spin text-(--hm-accent)" aria-label="Loading guests" />
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-12 text-center text-sm text-(--hm-dim)">
          {guests.length === 0 ? 'No one has registered yet.' : 'No guests match this search.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-(--hm-line) overflow-hidden rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60">
          {visible.map((g) => (
            <li key={g.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-(--hm-cream)">{g.firstName} {g.lastName}</p>
                <p className="truncate text-sm text-(--hm-mist)">{g.email}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--hm-dim)">
                  <span className="font-mono tracking-wider">{g.code}</span>
                  <span>Registered {dateFmt.format(new Date(g.registeredAt))}</span>
                  {!g.emailDelivered && (
                    <span className="flex items-center gap-1 text-(--hm-warn)">
                      <MailWarning className="size-3.5" aria-hidden />
                      Invite not delivered
                    </span>
                  )}
                </p>
              </div>
              {g.checkedInAt ? (
                <span className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-(--hm-ok) sm:self-center">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  In at {timeFmt.format(new Date(g.checkedInAt))}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => checkIn(g)}
                  disabled={pendingId !== null}
                  className="flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-(--hm-accent)/60 px-4 py-1.5 text-xs font-semibold text-(--hm-accent-soft) transition hover:bg-(--hm-accent)/10 disabled:opacity-50 sm:self-center"
                >
                  {pendingId === g.id && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  Check in
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
