'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { fmtDateRange } from './format';

export interface RangeValue {
  preset: string;
  from: string;
  to: string;
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shift(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return iso(new Date(y, m - 1, d + days));
}

function monthBounds(year: number, monthIndex: number) {
  return { from: iso(new Date(year, monthIndex, 1)), to: iso(new Date(year, monthIndex + 1, 0)) };
}

/** Preset → concrete dates, in the admin's own timezone. */
export function resolvePreset(preset: string): RangeValue | null {
  const now = new Date();
  const today = iso(now);
  switch (preset) {
    case 'today': return { preset, from: today, to: today };
    case '7d': return { preset, from: shift(today, -6), to: today };
    case '30d': return { preset, from: shift(today, -29), to: today };
    case '90d': return { preset, from: shift(today, -89), to: today };
    case 'mtd': return { preset, from: monthBounds(now.getFullYear(), now.getMonth()).from, to: today };
    case 'last-month': return { preset, ...monthBounds(now.getFullYear(), now.getMonth() - 1) };
    case '12m': return { preset, from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to: today };
    case 'ytd': return { preset, from: `${now.getFullYear()}-01-01`, to: today };
  }
  const month = preset.match(/^month:(\d{4})-(\d{2})$/);
  if (month) {
    const b = monthBounds(Number(month[1]), Number(month[2]) - 1);
    return { preset, from: b.from, to: b.to > today ? today : b.to };
  }
  return null;
}

const PRESETS: [string, string][] = [
  ['today', 'Today'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
  ['mtd', 'This month'],
  ['last-month', 'Last month'],
  ['12m', 'Last 12 months'],
  ['ytd', 'Year to date'],
];

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `month:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  });
}

export function rangeLabel(value: RangeValue) {
  const preset = PRESETS.find(([k]) => k === value.preset);
  if (preset) return preset[1];
  if (value.preset.startsWith('month:')) return recentMonths(36).find((m) => m.value === value.preset)?.label ?? fmtDateRange(value.from, value.to);
  return fmtDateRange(value.from, value.to);
}

export default function DateRangeFilter({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);
  const months = recentMonths(24);
  const today = iso(new Date());

  useEffect(() => {
    setFrom(value.from);
    setTo(value.to);
  }, [value.from, value.to]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(preset: string) {
    const resolved = resolvePreset(preset);
    if (resolved) onChange(resolved);
    setOpen(false);
  }

  const customValid = from && to && from <= to;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/90 hover:bg-white/8 transition"
      >
        <Calendar size={16} className="text-teal-300/80" />
        <span className="font-medium">{rangeLabel(value)}</span>
        <span className="hidden sm:inline text-white/40 text-xs">{fmtDateRange(value.from, value.to)}</span>
        <ChevronDown size={15} className={`text-white/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date range"
          className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/12 bg-[#0b1f23] shadow-2xl shadow-black/50 overflow-hidden"
        >
          <ul className="py-1.5">
            {PRESETS.map(([key, label]) => (
              <li key={key}>
                <button
                  onClick={() => pick(key)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/85 hover:bg-white/5"
                >
                  <span className="w-4">{value.preset === key && <Check size={16} strokeWidth={3} className="text-teal-300" />}</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 px-4 py-3">
            <label className="block text-[0.68rem] uppercase tracking-[0.18em] text-white/40 mb-1.5" htmlFor="analytics-month">
              Specific month
            </label>
            <select
              id="analytics-month"
              value={value.preset.startsWith('month:') ? value.preset : ''}
              onChange={(e) => e.target.value && pick(e.target.value)}
              className="w-full rounded-lg border border-white/12 bg-[#07171a] px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-teal-300/50"
            >
              <option value="">Select a month…</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/40 mb-1.5">Custom range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="From date"
                value={from}
                max={to || today}
                onChange={(e) => setFrom(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/12 bg-[#07171a] px-2.5 py-2 text-sm text-white/90 [color-scheme:dark] focus:outline-none focus:border-teal-300/50"
              />
              <span className="text-white/35 text-sm">to</span>
              <input
                type="date"
                aria-label="To date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/12 bg-[#07171a] px-2.5 py-2 text-sm text-white/90 [color-scheme:dark] focus:outline-none focus:border-teal-300/50"
              />
            </div>
            <button
              disabled={!customValid}
              onClick={() => {
                onChange({ preset: 'custom', from, to });
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg bg-teal-300/15 border border-teal-300/30 py-2 text-sm font-medium text-teal-100 hover:bg-teal-300/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Apply custom range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
