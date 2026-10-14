'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatBucket, formatNumber } from './format';

// Categorical slots, validated together (dataviz validate_palette, dark mode,
// all pairs) against the admin card surface. Assign in this order.
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70'] as const;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

type Point = { key: string };

const HEIGHT = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 44 };

/** Axis max split into four integer steps of 1/2/2.5/5 × 10ⁿ. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const raw = value / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const s of [1, 2, 2.5, 5, 10]) {
    const step = s * exp;
    if (step >= raw && Number.isInteger(step)) return step * 4;
  }
  return 40 * exp;
}

interface Props {
  data: Point[];
  /** Plotted lines, in legend order. The first also gets a soft area fill. */
  series: ChartSeries[];
  /** Extra values shown in the tooltip and table, but not plotted. */
  extra?: { key: string; label: string }[];
  interval: 'day' | 'month';
  label: string;
}

export default function TrendChart({ data, series: SERIES, extra = [], interval, label }: Props) {
  const series = data;
  const val = (p: Point, key: string) => Number((p as unknown as Record<string, unknown>)[key] ?? 0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = `fill-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((p) => SERIES.map((s) => val(p, s.key)))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const paths = useMemo(() => {
    if (!width || !n) return null;
    return Object.fromEntries(
      SERIES.map((s) => {
        const pts = series.map((p, i) => `${x(i).toFixed(1)},${y(val(p, s.key)).toFixed(1)}`);
        return [s.key, { line: `M${pts.join('L')}`, area: `M${x(0)},${y(0)}L${pts.join('L')}L${x(n - 1)},${y(0)}Z` }];
      })
    ) as Record<string, { line: string; area: string }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, SERIES, width, max]);

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 80))));

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round((rel / rect.width) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setActive((cur) => Math.max(0, Math.min(n - 1, (cur ?? (step > 0 ? -1 : n)) + step)));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  }

  const activePoint = active !== null ? series[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 90), width - 90) : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex items-center gap-5" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm text-white/70">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
        >
          {showTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-[280px] overflow-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0b1d21] text-left text-xs uppercase tracking-[0.1em] text-white/40">
              <tr>
                <th className="px-4 py-2.5 font-medium">{interval === 'month' ? 'Month' : 'Date'}</th>
                {[...SERIES, ...extra].map((s) => (
                  <th key={s.key} className="px-4 py-2.5 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums text-white/80">
              {[...series].reverse().map((p) => (
                <tr key={p.key} className="border-t border-white/5">
                  <td className="px-4 py-2">{formatBucket(p.key, interval, 'long')}</td>
                  {[...SERIES, ...extra].map((s) => (
                    <td key={s.key} className="px-4 py-2 text-right">
                      {formatNumber(val(p, s.key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative" style={{ height: HEIGHT }}>
          {width > 0 && paths && (
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={`${label} by ${interval}. Use arrow keys to read values.`}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-300/40"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={SERIES[0].color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SERIES[0].color} stopOpacity={0} />
                </linearGradient>
              </defs>

              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                  />
                  <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-white/40 text-[11px] tabular-nums">
                    {formatNumber(t)}
                  </text>
                </g>
              ))}

              {series.map((p, i) =>
                i % labelEvery === 0 ? (
                  <text key={p.key} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-white/40 text-[11px]">
                    {formatBucket(p.key, interval)}
                  </text>
                ) : null
              )}

              <path d={paths[SERIES[0].key].area} fill={`url(#${gradientId})`} />
              {SERIES.map((s) => (
                <path
                  key={s.key}
                  d={paths[s.key].line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {n === 1 &&
                SERIES.map((s) => (
                  <circle key={s.key} cx={x(0)} cy={y(val(series[0], s.key))} r={4} fill={s.color} stroke="#0b1d21" strokeWidth={2} />
                ))}

              {activePoint && active !== null && (
                <g pointerEvents="none">
                  <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.25)" />
                  {SERIES.map((s) => (
                    <circle
                      key={s.key}
                      cx={x(active)}
                      cy={y(val(activePoint, s.key))}
                      r={4.5}
                      fill={s.color}
                      stroke="#0b1d21"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}

              <rect
                x={PAD.left}
                y={PAD.top}
                width={innerW}
                height={innerH}
                fill="transparent"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
              />
            </svg>
          )}

          {activePoint && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 min-w-[10rem] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b2025]/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur"
              style={{ left: tooltipLeft }}
            >
              <p className="mb-1.5 text-xs text-white/50">{formatBucket(activePoint.key, interval, 'long')}</p>
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-2 py-0.5">
                  <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-semibold tabular-nums text-white">{formatNumber(val(activePoint, s.key))}</span>
                  <span className="text-xs text-white/50">{s.label}</span>
                </div>
              ))}
              {extra.map((s) => (
                <div key={s.key} className="flex items-center gap-2 py-0.5 pl-5">
                  <span className="text-sm font-semibold tabular-nums text-white">{formatNumber(val(activePoint, s.key))}</span>
                  <span className="text-xs text-white/50">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
