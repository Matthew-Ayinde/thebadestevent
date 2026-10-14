'use client';

import { useState } from 'react';
import type { BreakdownRow } from '@/lib/analytics/types';
import { formatNumber, formatPercent } from './format';
import CountryCode from './CountryCode';

interface Tab {
  id: string;
  label: string;
  rows: BreakdownRow[];
  showFlags?: boolean;
  empty?: string;
}

interface Props {
  title: string;
  tabs: Tab[];
  totalVisitors: number;
  /** Which count to rank and display; defaults to unique visitors. */
  metric?: 'visitors' | 'pageviews';
  metricLabel?: string;
}

export default function BreakdownCard({ title, tabs, totalVisitors, metric = 'visitors', metricLabel = 'Visitors' }: Props) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const max = Math.max(1, ...tab.rows.map((r) => r[metric]));

  return (
    <section className="flex flex-col rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-white/90">{title}</h2>
        {tabs.length > 1 && (
          <div role="tablist" aria-label={title} className="flex gap-1 rounded-lg bg-white/5 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={t.id === tab.id}
                onClick={() => setActiveId(t.id)}
                className={`rounded-md px-2.5 py-1 text-xs transition ${
                  t.id === tab.id ? 'bg-teal-300/15 text-teal-100' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 flex justify-between px-1 text-[0.68rem] uppercase tracking-[0.12em] text-white/35">
        <span>{tab.label}</span>
        <span>{metricLabel}</span>
      </div>

      {tab.rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm text-white/35">
          {tab.empty ?? 'No data for this period'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tab.rows.map((row) => (
            <li
              key={`${row.code ?? ''}-${row.label}`}
              className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-2"
              title={
                metric === 'pageviews'
                  ? `${row.label}: ${formatNumber(row.pageviews)} ${metricLabel.toLowerCase()} by ${formatNumber(row.visitors)} people`
                  : `${row.label}: ${formatNumber(row.visitors)} visitors · ${formatNumber(row.pageviews)} page views`
              }
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg bg-[#3987e5]/20 transition group-hover:bg-[#3987e5]/30"
                style={{ width: `${(row[metric] / max) * 100}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2 text-sm text-white/85">
                {tab.showFlags && <CountryCode code={row.code} />}
                <span className="truncate">{row.label}</span>
              </span>
              <span className="relative flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="hidden text-xs text-white/35 group-hover:inline">
                  {metric === 'visitors' && totalVisitors ? formatPercent(row.visitors / totalVisitors) : ''}
                </span>
                <span className="text-sm font-medium text-white/90">{formatNumber(row[metric])}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
