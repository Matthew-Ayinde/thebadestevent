'use client';

import { ReactNode, useState } from 'react';
import { SERIES_COLOR, fmtNumber } from './format';

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white/90">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children = 'No data for this period yet' }: { children?: ReactNode }) {
  return <p className="py-8 text-center text-sm text-white/35">{children}</p>;
}

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Optional secondary figure shown muted beside the value. */
  meta?: string;
  title?: string;
}

/** Ranked horizontal bars. Values are always printed, so the bar is never the only way to read them. */
export function BarList({ items, valueLabel, max }: { items: BarItem[]; valueLabel: string; max?: number }) {
  if (items.length === 0) return <Empty />;
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((n, i) => n + i.value, 0);
  return (
    <div>
      <div className="mb-2 flex justify-between text-[0.68rem] uppercase tracking-[0.16em] text-white/35">
        <span>Name</span>
        <span>{valueLabel}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.key}
            title={item.title ?? `${typeof item.label === 'string' ? item.label : item.key}: ${fmtNumber(item.value)} ${valueLabel.toLowerCase()} (${total ? Math.round((item.value / total) * 100) : 0}%)`}
            className="group relative flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/[0.04]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0 rounded-md transition-opacity group-hover:opacity-100 opacity-80"
              style={{ width: `${Math.max(2, (item.value / top) * 100)}%`, background: `${SERIES_COLOR}2e` }}
            />
            <span className="relative min-w-0 flex-1 truncate text-white/80">{item.label}</span>
            <span className="relative shrink-0 tabular-nums text-white/90">
              {item.meta && <span className="mr-2 text-xs text-white/40">{item.meta}</span>}
              {fmtNumber(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Proportion split for a handful of categories (e.g. device type) as labelled tiles, not a pie. */
export function ShareTiles({ items }: { items: { key: string; label: string; value: number; icon?: ReactNode }[] }) {
  const total = items.reduce((n, i) => n + i.value, 0);
  if (!total) return <Empty />;
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const share = item.value / total;
        return (
          <div key={item.key} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              {item.icon}
              {item.label}
            </div>
            <p className="mt-1.5 text-xl text-white/90">{Math.round(share * 100)}%</p>
            <div className="mt-2 h-1 rounded-full bg-white/8">
              <div className="h-1 rounded-full" style={{ width: `${share * 100}%`, background: SERIES_COLOR }} />
            </div>
            <p className="mt-1.5 text-[0.7rem] text-white/40 tabular-nums">{fmtNumber(item.value)} visitors</p>
          </div>
        );
      })}
    </div>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Day-of-week × hour-of-day traffic, one-hue sequential scale. */
export function Heatmap({ data, tz }: { data: number[][]; tz: string }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(0, ...data.flat());
  if (!max) return <Empty />;

  // Find the busiest slot for the default readout.
  let peak = { d: 0, h: 0 };
  data.forEach((row, d) => row.forEach((v, h) => { if (v > data[peak.d][peak.h]) peak = { d, h }; }));
  const shown = hover ?? peak;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }}>
            {data.map((row, d) => (
              <div key={d} className="contents">
                <span className="pr-1.5 text-[0.68rem] leading-[18px] text-white/40">{DAYS[d]}</span>
                {row.map((v, h) => (
                  <button
                    key={h}
                    type="button"
                    onMouseEnter={() => setHover({ d, h })}
                    onFocus={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    aria-label={`${DAYS_LONG[d]} ${hourLabel(h)}: ${v} pageviews`}
                    className={`h-[18px] rounded-[3px] outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${hover?.d === d && hover?.h === h ? 'ring-1 ring-white/70' : ''}`}
                    style={{
                      background: v ? SERIES_COLOR : 'rgba(255,255,255,0.04)',
                      opacity: v ? 0.18 + 0.82 * (v / max) : 1,
                    }}
                  />
                ))}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[0.6rem] text-white/30">{h % 3 === 0 ? h : ''}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-white/60">
          <span className="text-white/90 font-medium">{fmtNumber(data[shown.d][shown.h])} pageviews</span>{' '}
          {hover ? '' : 'at peak · '}
          {DAYS_LONG[shown.d]} {hourLabel(shown.h)}–{hourLabel((shown.h + 1) % 24)}
        </p>
        <div className="flex items-center gap-1.5 text-white/40">
          <span>Less</span>
          {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
            <span key={o} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SERIES_COLOR, opacity: o }} />
          ))}
          <span>More</span>
          <span className="ml-2 text-white/30">({tz.replace(/_/g, ' ')})</span>
        </div>
      </div>
    </div>
  );
}
