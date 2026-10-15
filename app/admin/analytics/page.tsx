'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowDownRight, ArrowUpRight, Laptop, RefreshCw, Smartphone, Table2, Tablet, LineChart } from 'lucide-react';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import DateRangeFilter, { resolvePreset, type RangeValue } from '@/components/admin/analytics/DateRangeFilter';
import TrendChart, { type ChartMetric } from '@/components/admin/analytics/TrendChart';
import { BarList, Empty, Heatmap, Panel, ShareTiles } from '@/components/admin/analytics/Panels';
import { Avatar, Flag, VisitorsTable } from '@/components/admin/analytics/Visitors';
import FormAnalyticsView from '@/components/admin/analytics/FormAnalyticsView';
import { FORMS, isFormId, type FormId } from '@/lib/analytics-forms';
import {
  CLICK_LABELS,
  CONVERSION_LABELS,
  delta,
  fmtCompact,
  fmtDateRange,
  fmtDuration,
  fmtNumber,
  fmtPercent,
  fmtRelative,
  type Granularity,
  type Overview,
  type Totals,
} from '@/components/admin/analytics/format';

interface Kpi {
  key: keyof Totals;
  label: string;
  format: (n: number) => string;
  chart?: ChartMetric;
  /** For metrics where a decrease is the good direction. */
  invert?: boolean;
  hint: string;
}

const KPIS: Kpi[] = [
  { key: 'visitors', label: 'Visitors', format: fmtCompact, chart: 'visitors', hint: 'Unique browsers that viewed at least one page' },
  { key: 'newVisitors', label: 'New visitors', format: fmtCompact, chart: 'newVisitors', hint: 'First-ever visit fell in this period' },
  { key: 'sessions', label: 'Visits', format: fmtCompact, chart: 'sessions', hint: 'Sessions; a visit ends after 30 minutes of inactivity' },
  { key: 'pageviews', label: 'Pageviews', format: fmtCompact, chart: 'pageviews', hint: 'Total pages viewed' },
  { key: 'avgSessionMs', label: 'Avg. visit time', format: fmtDuration, hint: 'Active (tab-visible) time per visit' },
  { key: 'bounceRate', label: 'Bounce rate', format: fmtPercent, invert: true, hint: 'Visits that viewed only one page' },
  { key: 'conversions', label: 'Form submissions', format: fmtCompact, chart: 'conversions', hint: 'Questionnaire, meeting, job, RSVP and contact forms' },
  { key: 'conversionRate', label: 'Conversion rate', format: fmtPercent, hint: 'Form submissions per visit' },
  { key: 'contactClicks', label: 'Contact clicks', format: fmtCompact, hint: 'Clicks on WhatsApp, phone and email links' },
  { key: 'consentRate', label: 'Cookie opt-in', format: fmtPercent, hint: 'Visitors who accepted analytics cookies; only they get full profiles' },
];

const UNITS: [Granularity, string][] = [['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']];

const VIEWS: { id: 'site' | FormId; label: string }[] = [
  { id: 'site', label: 'Whole site' },
  ...Object.values(FORMS).map((f) => ({ id: f.id, label: f.label })),
];

function daysIn(range: RangeValue) {
  return Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000) + 1;
}

function defaultUnit(range: RangeValue): Granularity {
  const days = daysIn(range);
  return days <= 45 ? 'day' : days <= 190 ? 'week' : 'month';
}

function Delta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  const d = delta(current, previous);
  if (d === null) return <span className="text-[0.7rem] text-white/35">new</span>;
  if (Math.abs(d) < 0.005) return <span className="text-[0.7rem] text-white/35">no change</span>;
  const up = d > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[0.72rem] font-medium ${good ? 'text-emerald-300' : 'text-rose-300'}`}>
      <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{up ? 'up' : 'down'}</span>
      {Math.abs(d * 100).toFixed(Math.abs(d) < 0.1 ? 1 : 0)}%
    </span>
  );
}

function AnalyticsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos', []);

  // Filters live in the URL so a view can be bookmarked or shared with the team.
  const range: RangeValue = useMemo(() => {
    const preset = searchParams.get('range') ?? '30d';
    if (preset === 'custom') {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to) return { preset, from, to };
    }
    return resolvePreset(preset) ?? resolvePreset('30d')!;
  }, [searchParams]);
  const unitParam = searchParams.get('unit') as Granularity | null;
  const unit: Granularity = unitParam && UNITS.some(([u]) => u === unitParam) ? unitParam : defaultUnit(range);
  const metric = (searchParams.get('metric') as ChartMetric) || 'visitors';
  const compare = searchParams.get('compare') !== '0';
  const viewParam = searchParams.get('view');
  const view: 'site' | FormId = isFormId(viewParam) ? viewParam : 'site';

  const [data, setData] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  function changeRange(next: RangeValue) {
    update({
      range: next.preset,
      from: next.preset === 'custom' ? next.from : null,
      to: next.preset === 'custom' ? next.to : null,
      unit: null, // let granularity re-fit the new range
    });
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams({ from: range.from, to: range.to, tz, unit });
    fetch(`/api/analytics?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && toast.error('Failed to load analytics'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [range.from, range.to, tz, unit, refreshKey]);

  // Keep the "active now" figure fresh while the page is open.
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === 'visible' && setRefreshKey((k) => k + 1), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  const activeKpi = KPIS.find((k) => k.chart === metric) ?? KPIS[0];
  const deviceValue = (name: string) => data?.devices.find((d) => d._id === name)?.visitors ?? 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Analytics</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-white/50">Who visits the site, where they come from, and what they do</p>
        </div>
        {data && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-white/75">
            <span className="relative flex h-2 w-2">
              {data.activeNow > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${data.activeNow > 0 ? 'bg-emerald-400' : 'bg-white/30'}`} />
            </span>
            <span className="tabular-nums font-medium text-white/90">{data.activeNow}</span> on the site now
          </div>
        )}
      </div>

      {/* Views — the whole site, or one form's journey; the filters below scope either */}
      <div role="tablist" aria-label="Analytics view" className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={view === v.id}
            onClick={() => update({ view: v.id === 'site' ? null : v.id })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              view === v.id
                ? 'border-teal-300/40 bg-teal-300/15 text-teal-100'
                : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters — one row, scoping everything below */}
      <div className="md:sticky md:top-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 mb-6 flex flex-wrap items-center gap-2 border-b border-white/5 bg-[#07171a]/90 px-4 sm:px-6 md:px-8 py-3 backdrop-blur-xl">
        <DateRangeFilter value={range} onChange={changeRange} />
        <div className="flex rounded-xl border border-white/12 bg-white/5 p-0.5 text-sm" role="group" aria-label="Chart granularity">
          {UNITS.map(([u, label]) => (
            <button
              key={u}
              onClick={() => update({ unit: u })}
              aria-pressed={unit === u}
              className={`rounded-lg px-3 py-1.5 transition ${unit === u ? 'bg-teal-300/15 text-teal-100' : 'text-white/55 hover:text-white/85'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === 'site' && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/70 select-none">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => update({ compare: e.target.checked ? null : '0' })}
              className="accent-teal-500"
            />
            Compare to previous period
          </label>
        )}
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="ml-auto rounded-xl border border-white/12 bg-white/5 p-2.5 text-white/60 hover:bg-white/8 hover:text-white transition"
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {view !== 'site' ? (
        <FormAnalyticsView form={view} from={range.from} to={range.to} tz={tz} unit={unit} refreshKey={refreshKey} />
      ) : !data ? (
        <div className="py-32">{isLoading ? <LoadingSpinner /> : <Empty>Analytics could not be loaded.</Empty>}</div>
      ) : (
        <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-50' : ''}`}>
          {/* KPI tiles — tiles with a chart icon drive the trend chart */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {KPIS.map((k) => {
              const selected = k.chart === metric;
              const Tag = k.chart ? 'button' : 'div';
              return (
                <Tag
                  key={k.key}
                  {...(k.chart ? { onClick: () => update({ metric: k.chart! }), 'aria-pressed': selected } : {})}
                  title={k.hint}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-teal-300/40 bg-teal-300/[0.08]'
                      : `border-white/10 bg-white/[0.03] ${k.chart ? 'hover:border-white/20 hover:bg-white/[0.05]' : ''}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-white/55">{k.label}</p>
                    {k.chart && <LineChart size={13} className={selected ? 'text-teal-300' : 'text-white/25'} aria-hidden="true" />}
                  </div>
                  <p className="mt-2 text-2xl sm:text-[1.7rem] font-medium leading-none text-white/95">{k.format(data.totals[k.key])}</p>
                  {compare && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Delta current={data.totals[k.key]} previous={data.previousTotals[k.key]} invert={k.invert} />
                      <span className="truncate text-[0.68rem] text-white/30">vs {k.format(data.previousTotals[k.key])}</span>
                    </div>
                  )}
                </Tag>
              );
            })}
          </div>

          {/* Trend */}
          <Panel
            title={activeKpi.label}
            subtitle={`${fmtDateRange(data.range.from, data.range.to)}${compare ? ` · compared with ${fmtDateRange(data.previousRange.from, data.previousRange.to)}` : ''}`}
            action={
              <div className="flex items-center gap-3">
                {compare && (
                  <div className="hidden sm:flex items-center gap-3 text-xs text-white/55" aria-label="Legend">
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-[#0fa594]" />This period</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-white/30" />Previous</span>
                  </div>
                )}
                <button
                  onClick={() => setShowTable((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                  aria-pressed={showTable}
                >
                  {showTable ? <LineChart size={13} /> : <Table2 size={13} />}
                  {showTable ? 'Chart' : 'Table'}
                </button>
              </div>
            }
          >
            <TrendChart
              metric={metric}
              metricLabel={activeKpi.label}
              series={data.series}
              previousSeries={data.previousSeries}
              unit={data.range.unit}
              compare={compare}
              showTable={showTable}
            />
          </Panel>

          {/* Content & acquisition */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Top pages" subtitle="Most viewed, with average active time and scroll depth" className="lg:col-span-3">
              {data.pages.length === 0 ? (
                <Empty />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[0.68rem] uppercase tracking-[0.16em] text-white/35">
                        <th className="px-1 pb-2 font-medium">Page</th>
                        <th className="px-2 pb-2 font-medium text-right">Views</th>
                        <th className="px-2 pb-2 font-medium text-right">Visitors</th>
                        <th className="px-2 pb-2 font-medium text-right">Avg. time</th>
                        <th className="px-1 pb-2 font-medium text-right">Scroll</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {data.pages.map((p) => (
                        <tr key={p._id} className="border-t border-white/5">
                          <td className="max-w-[14rem] px-1 py-2">
                            <p className="truncate font-mono text-xs text-white/85" title={p._id}>{p._id}</p>
                            {p.title && <p className="truncate text-[0.7rem] text-white/35" title={p.title}>{p.title}</p>}
                          </td>
                          <td className="px-2 py-2 text-right text-white/90">{fmtNumber(p.pageviews)}</td>
                          <td className="px-2 py-2 text-right text-white/70">{fmtNumber(p.visitors)}</td>
                          <td className="px-2 py-2 text-right text-white/60">{fmtDuration(p.avgEngagedMs)}</td>
                          <td className="px-1 py-2 text-right text-white/60">{p.avgScroll ? `${Math.round(p.avgScroll)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Traffic sources" subtitle="Where visits started" className="lg:col-span-2">
              <BarList valueLabel="Visits" items={data.sources.map((s) => ({ key: s._id, label: s._id, value: s.sessions }))} />
            </Panel>
          </div>

          {/* Geography */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Countries" subtitle="By unique visitors">
              <BarList
                valueLabel="Visitors"
                items={data.countries.map((c) => ({
                  key: c._id.code ?? c._id.name,
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <Flag code={c._id.code} />
                      {c._id.name}
                    </span>
                  ),
                  title: `${c._id.name}: ${fmtNumber(c.visitors)} visitors, ${fmtNumber(c.pageviews)} pageviews`,
                  value: c.visitors,
                }))}
              />
            </Panel>
            <Panel title="Cities" subtitle="By unique visitors">
              <BarList
                valueLabel="Visitors"
                items={data.cities.map((c) => ({
                  key: `${c._id.city}-${c._id.region}-${c._id.code}`,
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <Flag code={c._id.code} />
                      {c._id.city}
                      <span className="text-white/35">{[c._id.region, c._id.country].filter(Boolean).join(', ')}</span>
                    </span>
                  ),
                  title: `${c._id.city}, ${c._id.country ?? ''}: ${fmtNumber(c.visitors)} visitors`,
                  value: c.visitors,
                }))}
              />
            </Panel>
          </div>

          {/* Technology */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Devices">
              <ShareTiles
                items={[
                  { key: 'Desktop', label: 'Desktop', value: deviceValue('Desktop'), icon: <Laptop size={13} /> },
                  { key: 'Mobile', label: 'Mobile', value: deviceValue('Mobile'), icon: <Smartphone size={13} /> },
                  { key: 'Tablet', label: 'Tablet', value: deviceValue('Tablet'), icon: <Tablet size={13} /> },
                ]}
              />
            </Panel>
            <Panel title="Browsers">
              <BarList valueLabel="Visitors" items={data.browsers.map((b) => ({ key: b._id, label: b._id, value: b.visitors }))} />
            </Panel>
            <Panel title="Operating systems">
              <BarList valueLabel="Visitors" items={data.os.map((b) => ({ key: b._id, label: b._id, value: b.visitors }))} />
            </Panel>
          </div>

          {/* Behaviour */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="When people visit" subtitle="Pageviews by day and hour" className="lg:col-span-3">
              <Heatmap data={data.heatmap} tz={data.range.tz} />
            </Panel>
            <Panel title="Form submissions" subtitle="Conversions by form" className="lg:col-span-2">
              <BarList
                valueLabel="Submissions"
                items={data.conversionsByForm.map((c) => ({ key: c._id, label: CONVERSION_LABELS[c._id] ?? c._id, value: c.count }))}
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Clicks" subtitle="WhatsApp, phone, email, social and outbound links" className="lg:col-span-3">
              <BarList
                valueLabel="Clicks"
                items={data.clickTargets.map((c) => ({
                  key: `${c._id.kind}:${c._id.target}`,
                  label: (
                    <span>
                      <span className="mr-2 text-[0.65rem] uppercase tracking-widest text-white/40">{CLICK_LABELS[c._id.kind] ?? c._id.kind}</span>
                      {c._id.target}
                    </span>
                  ),
                  title: c.label ? `${c.label} → ${c._id.target}` : c._id.target,
                  value: c.clicks,
                  meta: `${fmtNumber(c.visitors)} ${c.visitors === 1 ? 'person' : 'people'}`,
                }))}
              />
            </Panel>
            <Panel title="Click types" subtitle="What people reached for" className="lg:col-span-2">
              <BarList
                valueLabel="Clicks"
                items={data.clickKinds.map((c) => ({ key: c._id, label: CLICK_LABELS[c._id] ?? c._id, value: c.clicks }))}
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Landing pages" subtitle="First page of each visit">
              <BarList
                valueLabel="Visits"
                items={data.landingPages.map((p) => ({ key: p._id, label: <span className="font-mono text-xs">{p._id}</span>, title: p._id, value: p.sessions }))}
              />
            </Panel>
            <Panel title="Campaigns" subtitle="Visits tagged with UTM parameters">
              {data.campaigns.length === 0 ? (
                <Empty>No tagged campaigns. Add ?utm_source=…&amp;utm_campaign=… to links you share.</Empty>
              ) : (
                <BarList
                  valueLabel="Visits"
                  items={data.campaigns.map((c) => ({
                    key: `${c._id.campaign}-${c._id.source}-${c._id.medium}`,
                    label: c._id.campaign,
                    meta: `${c._id.source} / ${c._id.medium}`,
                    value: c.sessions,
                  }))}
                />
              )}
            </Panel>
            <Panel title="Languages" subtitle="Browser language">
              <BarList valueLabel="Visitors" items={data.languages.map((l) => ({ key: l._id, label: l._id, value: l.visitors }))} />
            </Panel>
          </div>

          {data.recentlyIdentified.length > 0 && (
            <Panel title="Recently identified" subtitle="Visitors who submitted a form in this period">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {data.recentlyIdentified.map((v) => (
                  <li key={v.visitorId} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <Avatar visitor={v} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white/90">{v.name || v.email}</p>
                      <p className="truncate text-xs text-white/40">
                        {CONVERSION_LABELS[v.identities?.[v.identities.length - 1]?.source] ?? 'Form'} · {fmtRelative(v.identifiedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <VisitorsTable from={data.range.from} to={data.range.to} tz={data.range.tz} />
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="py-32"><LoadingSpinner /></div>}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
