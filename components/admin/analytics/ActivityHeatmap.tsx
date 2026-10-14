'use client';

import { useState } from 'react';
import { formatNumber } from './format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Single-hue sequential ramp (blue), dark → light so more traffic reads brighter.
const RAMP = ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];

function hourLabel(h: number) {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default function ActivityHeatmap({ data, timeZone }: { data: number[][]; timeZone: string }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(0, ...data.flat());

  const color = (v: number) => {
    if (!v || !max) return 'rgba(255,255,255,0.04)';
    return RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))];
  };

  const hovered = hover ? data[hover.d][hover.h] : null;

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-white/90">When people visit</h2>
        <p className="text-xs text-white/40" aria-live="polite">
          {hover && hovered !== null
            ? `${DAYS[hover.d]} ${hourLabel(hover.h)}–${hourLabel((hover.h + 1) % 24)}: ${formatNumber(hovered)} page views`
            : `Page views by weekday and hour · ${timeZone}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}>
            {data.map((row, d) => (
              <div key={DAYS[d]} className="contents">
                <span className="pr-2 text-right text-[11px] leading-5 text-white/40">{DAYS[d]}</span>
                {row.map((v, h) => (
                  <div
                    key={h}
                    role="img"
                    aria-label={`${DAYS[d]} ${hourLabel(h)}: ${v} page views`}
                    onPointerEnter={() => setHover({ d, h })}
                    onPointerLeave={() => setHover(null)}
                    className="h-5 rounded-[3px] transition hover:ring-2 hover:ring-white/60"
                    style={{ background: color(v) }}
                  />
                ))}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="pt-1 text-center text-[10px] text-white/35">
                {h % 3 === 0 ? hourLabel(h) : ''}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-white/40">
            <span>Fewer</span>
            {RAMP.map((c) => (
              <span key={c} aria-hidden className="h-3 w-5 rounded-[3px]" style={{ background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
