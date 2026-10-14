'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader, Monitor, Search, Smartphone, Tablet, UserCheck } from 'lucide-react';
import type { VisitorList } from '@/lib/analytics/types';
import CountryCode from './CountryCode';
import { formatDuration, formatNumber, SOURCE_LABELS, timeAgo } from './format';

interface Props {
  query: string;
  onSelect: (visitorId: string) => void;
  /** Bump to refetch, e.g. after a visitor is deleted. */
  refreshKey?: number;
}

const SORT_OPTIONS = [
  { id: 'lastSeen', label: 'Most recent' },
  { id: 'pageviews', label: 'Most page views' },
  { id: 'sessions', label: 'Most visits' },
  { id: 'time', label: 'Most time on site' },
];

export function DeviceIcon({ type, size = 15 }: { type?: string; size?: number }) {
  const Icon = type === 'mobile' ? Smartphone : type === 'tablet' ? Tablet : Monitor;
  return <Icon size={size} aria-label={type ?? 'Unknown device'} className="text-white/40" />;
}

export default function VisitorsTable({ query, onSelect, refreshKey = 0 }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [identifiedOnly, setIdentifiedOnly] = useState(false);
  const [sort, setSort] = useState('lastSeen');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<VisitorList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [query, debounced, identifiedOnly, sort]);

  const params = new URLSearchParams(query);
  if (debounced) params.set('q', debounced);
  if (identifiedOnly) params.set('identified', '1');
  params.set('sort', sort);
  const listQuery = params.toString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/analytics/visitors?${listQuery}&page=${page}&limit=20`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to load visitors');
        return res.json();
      })
      .then((body: VisitorList) => {
        setData(body);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [listQuery, page, refreshKey]);

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-white/90">Visitors</h2>
          <p className="text-xs text-white/40">
            {data ? `${formatNumber(data.total)} people active in this period` : 'Loading…'}
          </p>
        </div>
        <a
          href={`/api/analytics/visitors?${listQuery}&format=csv`}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
        >
          <Download size={15} />
          Export CSV
        </a>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search visitors</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city, IP…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white/90 placeholder:text-white/30 focus:border-teal-300/50 focus:outline-none"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort visitors"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 [color-scheme:dark] focus:border-teal-300/50 focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={identifiedOnly}
            onChange={(e) => setIdentifiedOnly(e.target.checked)}
            className="h-4 w-4 accent-teal-400"
          />
          Identified only
        </label>
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-rose-300">{error}</p>
      ) : (
        <div className={`overflow-x-auto transition-opacity ${loading && data ? 'opacity-50' : ''}`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-[0.68rem] uppercase tracking-[0.12em] text-white/35">
              <tr>
                <th className="px-3 py-2 font-medium">Visitor</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 text-right font-medium">Visits</th>
                <th className="px-3 py-2 text-right font-medium">Pages</th>
                <th className="px-3 py-2 text-right font-medium">Time</th>
                <th className="px-3 py-2 text-right font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {!data && loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader className="mx-auto h-6 w-6 animate-spin text-teal-300/70" />
                  </td>
                </tr>
              )}
              {data?.visitors.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-white/35">
                    No visitors match these filters.
                  </td>
                </tr>
              )}
              {data?.visitors.map((v) => {
                const identified = !!(v.name || v.email || v.phone);
                return (
                  <tr
                    key={v.visitorId}
                    tabIndex={0}
                    onClick={() => onSelect(v.visitorId)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(v.visitorId))}
                    className="cursor-pointer border-t border-white/5 outline-none transition hover:bg-white/[0.04] focus-visible:bg-white/[0.06]"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            identified ? 'bg-teal-300/15 text-teal-100' : 'bg-white/5 text-white/35'
                          }`}
                          aria-hidden
                        >
                          {identified ? (v.name || v.email || '?').trim()[0]?.toUpperCase() : '·'}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-white/90">
                            {v.name || v.email || v.phone || (
                              <span className="text-white/45">{v.consent ? 'Anonymous visitor' : 'Cookieless visitor'}</span>
                            )}
                            {identified && <UserCheck size={13} className="shrink-0 text-teal-300/80" aria-label="Identified" />}
                          </p>
                          <p className="truncate text-xs text-white/40">
                            {v.name && v.email
                              ? v.email
                              : v.identitySources?.length
                                ? v.identitySources.map((s) => SOURCE_LABELS[s] ?? s).join(', ')
                                : v.ip
                                  ? v.ip
                                  : v.firstReferrerHost
                                  ? `via ${v.firstReferrerHost}`
                                  : `#${v.visitorId.slice(0, 8)}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/75">
                      <span className="flex items-center gap-2">
                        <CountryCode code={v.countryCode} />
                        {[v.city, v.country].filter(Boolean).join(', ') || <span className="text-white/35">Unknown</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 text-white/70">
                        <DeviceIcon type={v.deviceType} />
                        <span className="truncate">{[v.deviceModel, v.browser, v.os].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/80">{formatNumber(v.sessions)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/80">{formatNumber(v.pageviews)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/80">{formatDuration(v.totalMs)}</td>
                    <td className="px-3 py-3 text-right text-white/60" title={new Date(v.lastSeen).toLocaleString()}>
                      {timeAgo(v.lastSeen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/50">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:opacity-30"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
