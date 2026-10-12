import type { PipelineStage } from 'mongoose';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';

export type Granularity = 'day' | 'week' | 'month';

export interface DateRange {
  /** Inclusive local calendar dates, YYYY-MM-DD. */
  from: string;
  to: string;
  tz: string;
  /** UTC instants: [start, end). */
  start: Date;
  end: Date;
}

/* ------------------------------- Calendar & timezone math ------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function addDays(date: string, days: number) {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

function offsetMs(instant: Date, tz: string) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = name?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60_000;
}

/** The UTC instant at which local midnight of `date` occurs in `tz` (DST-safe). */
export function zonedMidnight(date: string, tz: string) {
  const { y, m, d } = parts(date);
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - offsetMs(new Date(guess), tz);
  result = guess - offsetMs(new Date(result), tz);
  return new Date(result);
}

export function localDate(instant: Date, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseRange(searchParams: URLSearchParams): DateRange | null {
  const tzParam = searchParams.get('tz') || 'Africa/Lagos';
  const tz = isValidTimeZone(tzParam) ? tzParam : 'Africa/Lagos';
  const today = localDate(new Date(), tz);
  const from = searchParams.get('from') || addDays(today, -29);
  const to = searchParams.get('to') || today;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return null;
  if (daysBetween(from, to) > 366 * 3) return null;
  return { from, to, tz, start: zonedMidnight(from, tz), end: zonedMidnight(addDays(to, 1), tz) };
}

export function previousRange(range: DateRange): DateRange {
  const length = daysBetween(range.from, range.to) + 1;
  const to = addDays(range.from, -1);
  const from = addDays(to, -(length - 1));
  return { from, to, tz: range.tz, start: zonedMidnight(from, range.tz), end: range.start };
}

function bucketOf(date: string, unit: Granularity) {
  if (unit === 'month') return `${date.slice(0, 7)}-01`;
  if (unit === 'week') {
    const { y, m, d } = parts(date);
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
    return addDays(date, -dow);
  }
  return date;
}

function bucketKeys(range: DateRange, unit: Granularity) {
  const keys: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const k = bucketOf(d, unit);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}

/* --------------------------------------- Queries --------------------------------------- */

const sizeOf = (field: string) => ({ $size: field });
const avgPositive = (field: string) => ({ $avg: { $cond: [{ $gt: [field, 0] }, field, null] } });

export interface SeriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions: number;
  conversions: number;
  newVisitors: number;
}

async function periodSummary(range: DateRange, unit: Granularity) {
  const match = { type: 'pageview', createdAt: { $gte: range.start, $lt: range.end } };
  const bucket = { $dateTrunc: { date: '$createdAt', unit, timezone: range.tz, startOfWeek: 'monday' } };

  const [[facets], conversionRows, newVisitorRows] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            { $group: { _id: null, pageviews: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
            { $project: { _id: 0, pageviews: 1, visitors: sizeOf('$visitors') } },
          ],
          sessions: [
            { $group: { _id: '$sessionId', views: { $sum: 1 }, engaged: { $sum: '$engagedMs' } } },
            {
              $group: {
                _id: null,
                sessions: { $sum: 1 },
                bounces: { $sum: { $cond: [{ $eq: ['$views', 1] }, 1, 0] } },
                avgDurationMs: { $avg: '$engaged' },
                pagesPerSession: { $avg: '$views' },
              },
            },
          ],
          series: [
            {
              $group: {
                _id: bucket,
                pageviews: { $sum: 1 },
                visitors: { $addToSet: '$visitorId' },
                sessions: { $addToSet: '$sessionId' },
              },
            },
            { $project: { pageviews: 1, visitors: sizeOf('$visitors'), sessions: sizeOf('$sessions') } },
          ],
        },
      },
    ] as PipelineStage[]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'conversion', createdAt: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: bucket, count: { $sum: 1 } } },
    ] as PipelineStage[]),
    AnalyticsVisitor.aggregate([
      { $match: { firstSeenAt: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: { $dateTrunc: { date: '$firstSeenAt', unit, timezone: range.tz, startOfWeek: 'monday' } }, count: { $sum: 1 } } },
    ] as PipelineStage[]),
  ]);

  const byKey = new Map<string, SeriesPoint>(
    bucketKeys(range, unit).map((date) => [date, { date, visitors: 0, pageviews: 0, sessions: 0, conversions: 0, newVisitors: 0 }])
  );
  const point = (instant: Date) => byKey.get(bucketOf(localDate(instant, range.tz), unit));
  for (const row of facets.series) Object.assign(point(row._id) ?? {}, { visitors: row.visitors, pageviews: row.pageviews, sessions: row.sessions });
  for (const row of conversionRows) { const p = point(row._id); if (p) p.conversions = row.count; }
  for (const row of newVisitorRows) { const p = point(row._id); if (p) p.newVisitors = row.count; }

  const t = facets.totals[0] ?? { pageviews: 0, visitors: 0 };
  const s = facets.sessions[0] ?? { sessions: 0, bounces: 0, avgDurationMs: 0, pagesPerSession: 0 };
  const conversions = conversionRows.reduce((n: number, r: { count: number }) => n + r.count, 0);
  const newVisitors = newVisitorRows.reduce((n: number, r: { count: number }) => n + r.count, 0);

  return {
    totals: {
      visitors: t.visitors,
      newVisitors,
      returningVisitors: Math.max(0, t.visitors - newVisitors),
      pageviews: t.pageviews,
      sessions: s.sessions,
      bounceRate: s.sessions ? s.bounces / s.sessions : 0,
      avgSessionMs: Math.round(s.avgDurationMs ?? 0),
      pagesPerSession: s.pagesPerSession ?? 0,
      conversions,
      conversionRate: s.sessions ? conversions / s.sessions : 0,
    },
    series: [...byKey.values()],
  };
}

async function breakdowns(range: DateRange) {
  const match = { type: 'pageview', createdAt: { $gte: range.start, $lt: range.end } };
  const unknown = (field: string) => ({ $ifNull: [field, 'Unknown'] });
  const byVisitors = (key: unknown, limit: number): PipelineStage.FacetPipelineStage[] => [
    { $group: { _id: key, visitors: { $addToSet: '$visitorId' }, pageviews: { $sum: 1 } } },
    { $project: { visitors: sizeOf('$visitors'), pageviews: 1 } },
    { $sort: { visitors: -1, pageviews: -1 } },
    { $limit: limit },
  ];

  const [[facets], conversionsByForm] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: match },
      {
        $facet: {
          pages: [
            {
              $group: {
                _id: '$path',
                title: { $last: '$title' },
                pageviews: { $sum: 1 },
                visitors: { $addToSet: '$visitorId' },
                avgEngagedMs: avgPositive('$engagedMs'),
                avgScroll: avgPositive('$scrollDepth'),
              },
            },
            { $project: { title: 1, pageviews: 1, visitors: sizeOf('$visitors'), avgEngagedMs: 1, avgScroll: 1 } },
            { $sort: { pageviews: -1 } },
            { $limit: 15 },
          ],
          landingPages: [
            { $match: { isNewSession: true } },
            { $group: { _id: '$path', sessions: { $sum: 1 } } },
            { $sort: { sessions: -1 } },
            { $limit: 10 },
          ],
          sources: [
            { $match: { isNewSession: true } },
            { $group: { _id: unknown('$source'), sessions: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
            { $project: { sessions: 1, visitors: sizeOf('$visitors') } },
            { $sort: { sessions: -1 } },
            { $limit: 12 },
          ],
          campaigns: [
            { $match: { isNewSession: true, utmCampaign: { $exists: true } } },
            {
              $group: {
                _id: { campaign: '$utmCampaign', source: unknown('$utmSource'), medium: unknown('$utmMedium') },
                sessions: { $sum: 1 },
              },
            },
            { $sort: { sessions: -1 } },
            { $limit: 10 },
          ],
          countries: byVisitors({ code: '$countryCode', name: unknown('$country') }, 20),
          cities: [
            { $match: { city: { $exists: true } } },
            ...byVisitors({ city: '$city', region: '$region', country: '$country', code: '$countryCode' }, 20),
          ],
          devices: byVisitors(unknown('$device'), 5),
          browsers: byVisitors(unknown('$browser'), 8),
          os: byVisitors(unknown('$os'), 8),
          languages: byVisitors(unknown('$language'), 8),
          heatmap: [
            {
              $group: {
                _id: {
                  dow: { $dayOfWeek: { date: '$createdAt', timezone: range.tz } },
                  hour: { $hour: { date: '$createdAt', timezone: range.tz } },
                },
                pageviews: { $sum: 1 },
              },
            },
          ],
        },
      },
    ] as PipelineStage[]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'conversion', createdAt: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // $dayOfWeek: 1 = Sunday … 7 = Saturday; re-index to Monday = 0.
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const row of facets.heatmap) heatmap[(row._id.dow + 5) % 7][row._id.hour] = row.pageviews;

  return { ...facets, heatmap, conversionsByForm };
}

export async function getOverview(range: DateRange, unit: Granularity) {
  const prev = previousRange(range);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);

  const [current, previous, breakdown, activeNow, recentlyIdentified] = await Promise.all([
    periodSummary(range, unit),
    periodSummary(prev, unit),
    breakdowns(range),
    AnalyticsEvent.distinct('visitorId', { type: 'pageview', createdAt: { $gte: fiveMinutesAgo } }).then((v) => v.length),
    AnalyticsVisitor.find({ identifiedAt: { $gte: range.start, $lt: range.end } })
      .sort({ identifiedAt: -1 })
      .limit(8)
      .select('visitorId name email city country countryCode identifiedAt identities pageviews')
      .lean(),
  ]);

  return {
    range: { from: range.from, to: range.to, tz: range.tz, unit },
    previousRange: { from: prev.from, to: prev.to },
    totals: current.totals,
    previousTotals: previous.totals,
    series: current.series,
    previousSeries: previous.series,
    activeNow,
    recentlyIdentified,
    ...breakdown,
  };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
