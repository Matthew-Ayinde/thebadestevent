export type Granularity = 'day' | 'week' | 'month';

export const SERIES_COLOR = '#0fa594'; // brand teal, validated for the admin's dark surface
export const COMPARE_COLOR = 'rgba(255,255,255,0.32)'; // de-emphasised previous period

export interface Totals {
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgSessionMs: number;
  pagesPerSession: number;
  conversions: number;
  conversionRate: number;
}

export interface SeriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions: number;
  conversions: number;
  newVisitors: number;
}

export interface Overview {
  range: { from: string; to: string; tz: string; unit: Granularity };
  previousRange: { from: string; to: string };
  totals: Totals;
  previousTotals: Totals;
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  activeNow: number;
  recentlyIdentified: any[];
  pages: { _id: string; title?: string; pageviews: number; visitors: number; avgEngagedMs: number | null; avgScroll: number | null }[];
  landingPages: { _id: string; sessions: number }[];
  sources: { _id: string; sessions: number; visitors: number }[];
  campaigns: { _id: { campaign: string; source: string; medium: string }; sessions: number }[];
  countries: { _id: { code?: string; name: string }; visitors: number; pageviews: number }[];
  cities: { _id: { city: string; region?: string; country?: string; code?: string }; visitors: number; pageviews: number }[];
  devices: { _id: string; visitors: number }[];
  browsers: { _id: string; visitors: number }[];
  os: { _id: string; visitors: number }[];
  languages: { _id: string; visitors: number }[];
  heatmap: number[][];
  conversionsByForm: { _id: string; count: number }[];
}

export const CONVERSION_LABELS: Record<string, string> = {
  questionnaire: 'Questionnaire',
  meeting_request: 'Meeting request',
  job_application: 'Job application',
  medallion_rsvp: 'Medallion RSVP',
  contact: 'Contact form',
};

const nf = new Intl.NumberFormat('en-GB');
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtNumber = (n: number) => nf.format(Math.round(n));
export const fmtCompact = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : nf.format(Math.round(n)));
export const fmtPercent = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

export function fmtDuration(ms: number | null | undefined) {
  if (!ms || ms < 1000) return ms ? '<1s' : '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function utc(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtBucket(date: string, unit: Granularity, long = false) {
  const d = utc(date);
  if (unit === 'month') return d.toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(long ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  return unit === 'week' && long ? `Week of ${label}` : label;
}

export function fmtDateRange(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  return from === to
    ? utc(from).toLocaleDateString('en-GB', opts)
    : `${utc(from).toLocaleDateString('en-GB', opts)} – ${utc(to).toLocaleDateString('en-GB', opts)}`;
}

export function fmtDateTime(value: string | Date) {
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Percent change vs the previous period; null when there's nothing to compare against. */
export function delta(current: number, previous: number) {
  if (!previous) return current ? null : 0;
  return (current - previous) / previous;
}

export function flagUrl(code?: string) {
  return code && /^[A-Z]{2}$/i.test(code) ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : null;
}
