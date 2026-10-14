'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Activity,
  Clock,
  Eye,
  Layers,
  Loader,
  LogOut,
  MessageCircle,
  Cookie,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AnalyticsOverview } from '@/lib/analytics/types';
import type { Interval } from '@/lib/analytics/dates';
import { todayInZone } from '@/lib/analytics/dates';
import DateRangeFilter, { buildPresets, type DateRange } from '@/components/admin/analytics/DateRangeFilter';
import KpiTile from '@/components/admin/analytics/KpiTile';
import TrendChart, { SERIES_COLORS } from '@/components/admin/analytics/TrendChart';
import BreakdownCard from '@/components/admin/analytics/BreakdownCard';
import ActivityHeatmap from '@/components/admin/analytics/ActivityHeatmap';
import VisitorsTable from '@/components/admin/analytics/VisitorsTable';
import VisitorDrawer from '@/components/admin/analytics/VisitorDrawer';
import { formatDuration, formatNumber, formatPercent } from '@/components/admin/analytics/format';
import FormAnalyticsView from '@/components/admin/analytics/FormAnalyticsView';
import { FORMS, isFormId, type FormId } from '@/lib/analytics/forms';

type View = 'site' | FormId;
const VIEWS: { id: View; label: string }[] = [
  { id: 'site', label: 'Whole site' },
  ...Object.values(FORMS).map((f) => ({ id: f.id, label: f.label })),
];

const REFRESH_MS = 60_000;

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const today = useMemo(() => todayInZone(tz), [tz]);
  const [range, setRange] = useState<DateRange>(() => buildPresets(today).find((p) => p.id === '30d')!);
  const [interval, setGranularity] = useState<Interval | 'auto'>('auto');
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitorsVersion, setVisitorsVersion] = useState(0);
  const [view, setView] = useState<View>('site');

  // Keep the chosen view in the URL (?view=guest) so it can be bookmarked and shared.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('view');
    if (isFormId(fromUrl)) setView(fromUrl);
  }, []);

  function chooseView(next: View) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'site') url.searchParams.delete('view');
    else url.searchParams.set('view', next);
    window.history.replaceState(null, '', url);
  }

  const query = useMemo(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to, tz });
    if (interval !== 'auto') params.set('interval', interval);
    return params.toString();
  }, [range, interval, tz]);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/analytics?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to load analytics');
        return res.json();
      })
      .then((body: AnalyticsOverview) => {
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
  }, [query, isAdmin, refreshKey]);

  // Keep "live now" and today's numbers fresh while the tab is visible.
  useEffect(() => {
    if (!isAdmin) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRefreshKey((k) => k + 1);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [isAdmin]);

  const closeDrawer = useCallback(() => setSelectedVisitor(null), []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-10 w-10 animate-spin text-teal-300" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-8 pt-24 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-300/80" />
        <h1 className="mb-2 font-serif text-3xl text-white/90">Admins only</h1>
        <p className="text-white/50">Visitor analytics include personal details, so only admin accounts can view them.</p>
      </div>
    );
  }

  const t = data?.totals;
  const p = data?.previousTotals;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.32em] text-teal-300/60">Admin Console</p>
          <h1 className="font-serif text-4xl text-white/90">Analytics</h1>
          <p className="mt-1 text-white/50">Who is visiting RÌNWÁ, where they come from, and what they do.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-sm text-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-semibold tabular-nums">{data ? formatNumber(data.liveVisitors) : '–'}</span>
          <span className="text-emerald-200/70">active in the last 5 min</span>
        </div>
      </header>

      <div role="tablist" aria-label="Analytics view" className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={view === v.id}
            onClick={() => chooseView(v.id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              view === v.id
                ? 'border-teal-300/40 bg-teal-300/15 text-teal-100'
                : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            {v.label}
            {v.id !== 'site' && <span className="ml-2 text-xs text-white/35">{FORMS[v.id].path}</span>}
          </button>
        ))}
      </div>

      <div className="z-20 -mx-4 md:sticky md:top-0 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#07171a]/90 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <DateRangeFilter
          today={today}
          value={range}
          onChange={setRange}
          interval={interval}
          onIntervalChange={setGranularity}
        />
        <div className="flex items-center gap-3 text-xs text-white/40">
          {data && (
            <span className="hidden md:inline">
              Compared with {data.previousRange.from} → {data.previousRange.to}
            </span>
          )}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Refresh"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/50 transition hover:text-white"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {view !== 'site' ? (
        <FormAnalyticsView form={view} query={query} rangeLabel={range.label} refreshKey={refreshKey} />
      ) : null}

      {view === 'site' && error && (
        <div className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      {view !== 'site' ? null : !data && loading ? (
        <div className="flex justify-center py-32">
          <Loader className="h-10 w-10 animate-spin text-teal-300" />
        </div>
      ) : data && t && p ? (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <KpiTile label="Visitors" value={formatNumber(t.visitors)} current={t.visitors} previous={p.visitors} icon={Users} />
            <KpiTile label="Page views" value={formatNumber(t.pageviews)} current={t.pageviews} previous={p.pageviews} icon={Eye} />
            <KpiTile label="Visits" value={formatNumber(t.sessions)} current={t.sessions} previous={p.sessions} icon={Layers} />
            <KpiTile
              label="Avg. visit length"
              value={formatDuration(t.avgSessionMs)}
              current={t.avgSessionMs}
              previous={p.avgSessionMs}
              icon={Clock}
            />
            <KpiTile
              label="Bounce rate"
              value={formatPercent(t.bounceRate)}
              current={t.bounceRate}
              previous={p.bounceRate}
              icon={LogOut}
              lowerIsBetter
              hint="Share of visits that viewed only one page"
            />
            <KpiTile
              label="New visitors"
              value={formatNumber(t.newVisitors)}
              current={t.newVisitors}
              previous={p.newVisitors}
              icon={UserPlus}
              hint="Counts visitors who accepted cookies; cookieless visitors can't be recognised as returning"
            />
            <KpiTile
              label="Identified leads"
              value={formatNumber(t.identified)}
              current={t.identified}
              previous={p.identified}
              icon={UserCheck}
              hint="Visitors who submitted a form for the first time in this period"
            />
            <KpiTile
              label="Pages per visit"
              value={t.sessions ? (t.pageviews / t.sessions).toFixed(1) : '0'}
              current={t.sessions ? t.pageviews / t.sessions : 0}
              previous={p.sessions ? p.pageviews / p.sessions : 0}
              icon={Activity}
            />
            <KpiTile
              label="Contact clicks"
              value={formatNumber(t.contactClicks)}
              current={t.contactClicks}
              previous={p.contactClicks}
              icon={MessageCircle}
              hint="Clicks on WhatsApp, phone and email links"
            />
            <KpiTile
              label="Cookie opt-in"
              value={t.visitors ? formatPercent(t.consentedVisitors / t.visitors) : '–'}
              current={t.visitors ? t.consentedVisitors / t.visitors : 0}
              previous={p.visitors ? p.consentedVisitors / p.visitors : 0}
              icon={Cookie}
              hint="Share of visitors who accepted analytics cookies. Only they get full profiles."
            />
          </div>

          <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="mb-2">
              <h2 className="font-serif text-2xl text-white/90">Traffic over time</h2>
              <p className="text-xs text-white/40">
                {data.range.interval === 'month' ? 'Monthly' : 'Daily'} totals · {range.label} · times in {data.range.tz}
              </p>
            </div>
            <TrendChart
              data={data.series}
              series={[
                { key: 'visitors', label: 'Visitors', color: SERIES_COLORS[0] },
                { key: 'pageviews', label: 'Page views', color: SERIES_COLORS[1] },
              ]}
              extra={[{ key: 'sessions', label: 'Sessions' }]}
              interval={data.range.interval}
              label="Visitors and page views"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownCard
              title="Pages"
              totalVisitors={t.visitors}
              tabs={[{ id: 'pages', label: 'Page', rows: data.breakdowns.pages }]}
            />
            <BreakdownCard
              title="Sources"
              totalVisitors={t.visitors}
              tabs={[
                { id: 'referrers', label: 'Referrer', rows: data.breakdowns.referrers },
                {
                  id: 'campaigns',
                  label: 'Campaign',
                  rows: data.breakdowns.campaigns,
                  empty: 'No UTM-tagged visits. Add ?utm_source=… to links you share.',
                },
              ]}
            />
            <BreakdownCard
              title="Location"
              totalVisitors={t.visitors}
              tabs={[
                { id: 'countries', label: 'Country', rows: data.breakdowns.countries, showFlags: true },
                { id: 'cities', label: 'City', rows: data.breakdowns.cities, showFlags: true },
                { id: 'languages', label: 'Language', rows: data.breakdowns.languages },
              ]}
            />
            <BreakdownCard
              title="Technology"
              totalVisitors={t.visitors}
              tabs={[
                { id: 'devices', label: 'Device', rows: data.breakdowns.devices },
                { id: 'browsers', label: 'Browser', rows: data.breakdowns.browsers },
                { id: 'os', label: 'OS', rows: data.breakdowns.os },
              ]}
            />
          </div>

          <BreakdownCard
            title="Clicks"
            metric="pageviews"
            metricLabel="Clicks"
            totalVisitors={t.visitors}
            tabs={[
              {
                id: 'targets',
                label: 'Link',
                rows: data.breakdowns.clickTargets,
                empty: 'No WhatsApp, phone, email or outbound link clicks yet.',
              },
              { id: 'kinds', label: 'Type', rows: data.breakdowns.clickKinds },
            ]}
          />

          <ActivityHeatmap data={data.heatmap} timeZone={data.range.tz} />

          <VisitorsTable query={query} onSelect={setSelectedVisitor} refreshKey={visitorsVersion} />
        </div>
      ) : null}

      <VisitorDrawer
        visitorId={selectedVisitor}
        onClose={closeDrawer}
        onDeleted={() => {
          setSelectedVisitor(null);
          setVisitorsVersion((v) => v + 1);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
