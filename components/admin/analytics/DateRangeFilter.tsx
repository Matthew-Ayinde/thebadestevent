'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { addDays } from '@/lib/analytics/dates';
import type { Interval } from '@/lib/analytics/dates';

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${String(month).padStart(2, '0')}-${last}` };
}

export function buildPresets(today: string): (DateRange & { id: string })[] {
  const [y, m] = today.split('-').map(Number);
  const thisMonth = monthBounds(y, m);
  const lastMonth = m === 1 ? monthBounds(y - 1, 12) : monthBounds(y, m - 1);
  return [
    { id: 'today', label: 'Today', from: today, to: today },
    { id: '7d', label: 'Last 7 days', from: addDays(today, -6), to: today },
    { id: '30d', label: 'Last 30 days', from: addDays(today, -29), to: today },
    { id: '90d', label: 'Last 90 days', from: addDays(today, -89), to: today },
    { id: 'mtd', label: 'This month', from: thisMonth.from, to: today },
    { id: 'lm', label: 'Last month', ...lastMonth },
    { id: '12m', label: 'Last 12 months', from: addDays(today, -364), to: today },
  ];
}

interface Props {
  today: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  interval: Interval | 'auto';
  onIntervalChange: (interval: Interval | 'auto') => void;
}

export default function DateRangeFilter({ today, value, onChange, interval, onIntervalChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);
  const presets = buildPresets(today);

  useEffect(() => {
    if (!open) return;
    setCustomFrom(value.from);
    setCustomTo(value.to);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, value.from, value.to]);

  function pick(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  function pickMonth(month: string) {
    if (!month) return;
    const [y, m] = month.split('-').map(Number);
    const bounds = monthBounds(y, m);
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    pick({ ...bounds, to: bounds.to > today ? today : bounds.to, label });
  }

  const customValid = customFrom && customTo && customFrom <= customTo && customTo <= today;
  const shortDate = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/8"
        >
          <Calendar size={16} className="text-teal-300/80" />
          <span className="font-medium">{value.label}</span>
          <span className="hidden text-white/40 sm:inline">
            {value.from === value.to ? shortDate(value.from) : `${shortDate(value.from)} – ${shortDate(value.to)}`}
          </span>
          <ChevronDown size={15} className={`text-white/40 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Choose date range"
            className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b2025] shadow-2xl shadow-black/50"
          >
            <ul className="py-1.5">
              {presets.map((p) => {
                const selected = p.from === value.from && p.to === value.to;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/5"
                    >
                      <span className={selected ? 'font-semibold text-white' : ''}>{p.label}</span>
                      {selected && <Check size={16} strokeWidth={3} className="text-teal-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-white/10 px-4 py-3">
              <label className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.14em] text-white/40">
                A specific month
              </label>
              <input
                type="month"
                max={today.slice(0, 7)}
                onChange={(e) => pickMonth(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 [color-scheme:dark] focus:border-teal-300/50 focus:outline-none"
              />
            </div>

            <form
              className="border-t border-white/10 px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (customValid) pick({ from: customFrom, to: customTo, label: 'Custom range' });
              }}
            >
              <p className="mb-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-white/40">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  aria-label="Start date"
                  value={customFrom}
                  max={customTo || today}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white/90 [color-scheme:dark] focus:border-teal-300/50 focus:outline-none"
                />
                <input
                  type="date"
                  aria-label="End date"
                  value={customTo}
                  min={customFrom}
                  max={today}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white/90 [color-scheme:dark] focus:border-teal-300/50 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!customValid}
                className="mt-2.5 w-full rounded-lg bg-teal-300/15 py-2 text-sm font-medium text-teal-100 transition hover:bg-teal-300/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply range
              </button>
            </form>
          </div>
        )}
      </div>

      <div role="radiogroup" aria-label="Chart granularity" className="flex rounded-xl border border-white/10 bg-white/5 p-1">
        {(['auto', 'day', 'month'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={interval === opt}
            onClick={() => onIntervalChange(opt)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
              interval === opt ? 'bg-teal-300/15 text-teal-100' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {opt === 'auto' ? 'Auto' : opt === 'day' ? 'Daily' : 'Monthly'}
          </button>
        ))}
      </div>
    </div>
  );
}
