import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsClick } from '@/models/AnalyticsClick';
import { parseRange, requireAdmin } from '@/lib/analytics/admin-query';
import { addDays, bucketKeys, daysBetween, startOfDayInZone } from '@/lib/analytics/dates';
import type { AnalyticsOverview, SeriesPoint, Totals } from '@/lib/analytics/types';
import { BREAKDOWN_LIMIT, breakdown, rows, sourceFacets, sourceRows, unknownLabel } from '@/lib/analytics/breakdowns';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLICK_KIND_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Phone call',
  email: 'Email',
  social: 'Social profile',
  outbound: 'Other website',
  cta: 'Tracked button',
};

async function computeTotals(start: Date, end: Date): Promise<Totals> {
  const [agg] = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $facet: {
        pageviews: [{ $count: 'n' }],
        visitors: [{ $group: { _id: '$visitorId' } }, { $count: 'n' }],
        consented: [{ $match: { consent: { $ne: false } } }, { $group: { _id: '$visitorId' } }, { $count: 'n' }],
        sessions: [
          { $group: { _id: '$sessionId', pv: { $sum: 1 }, ms: { $sum: '$durationMs' } } },
          {
            $group: {
              _id: null,
              n: { $sum: 1 },
              bounces: { $sum: { $cond: [{ $eq: ['$pv', 1] }, 1, 0] } },
              ms: { $sum: '$ms' },
            },
          },
        ],
        pageTime: [{ $match: { durationMs: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$durationMs' } } }],
      },
    },
  ]);

  const range = { $gte: start, $lt: end };
  const [newVisitors, identified, contactClicks] = await Promise.all([
    AnalyticsVisitor.countDocuments({ firstSeen: range }),
    AnalyticsVisitor.countDocuments({ identifiedAt: range }),
    AnalyticsClick.countDocuments({ createdAt: range, kind: { $in: ['whatsapp', 'phone', 'email'] } }),
  ]);

  const sessions = agg.sessions[0];
  const sessionCount = sessions?.n ?? 0;
  return {
    pageviews: agg.pageviews[0]?.n ?? 0,
    visitors: agg.visitors[0]?.n ?? 0,
    sessions: sessionCount,
    bounceRate: sessionCount ? sessions.bounces / sessionCount : 0,
    avgSessionMs: sessionCount ? sessions.ms / sessionCount : 0,
    avgPageMs: agg.pageTime[0]?.avg ?? 0,
    newVisitors,
    identified,
    consentedVisitors: agg.consented[0]?.n ?? 0,
    contactClicks,
  };
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const range = parseRange(request);
  if (range instanceof NextResponse) return range;
  const { from, to, tz, interval, start, end } = range;

  // The comparison period is the same number of days immediately before.
  const span = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(span - 1));

  try {
    await connectDB();

    const bucketFormat = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [facets] = await AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $facet: {
          series: [
            {
              $group: {
                _id: { $dateToString: { format: bucketFormat, date: '$createdAt', timezone: tz } },
                visitors: { $addToSet: '$visitorId' },
                sessions: { $addToSet: '$sessionId' },
                pageviews: { $sum: 1 },
              },
            },
            { $project: { visitors: { $size: '$visitors' }, sessions: { $size: '$sessions' }, pageviews: 1 } },
          ],
          pages: breakdown('$path'),
          ...sourceFacets,
          browsers: breakdown('$browser'),
          os: breakdown('$os'),
          languages: breakdown('$language'),
          heatmap: [
            {
              $group: {
                _id: {
                  dow: { $isoDayOfWeek: { date: '$createdAt', timezone: tz } },
                  hour: { $hour: { date: '$createdAt', timezone: tz } },
                },
                n: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const clickBreakdown = (groupId: unknown) => [
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: groupId, visitors: { $addToSet: '$visitorId' }, pageviews: { $sum: 1 } } },
      { $project: { _id: 1, visitors: { $size: '$visitors' }, pageviews: 1 } },
      { $sort: { pageviews: -1 as const, visitors: -1 as const } },
      { $limit: BREAKDOWN_LIMIT },
    ];

    const [totals, previousTotals, live, clickTargets, clickKinds] = await Promise.all([
      computeTotals(start, end),
      computeTotals(startOfDayInZone(prevFrom, tz), start),
      AnalyticsEvent.distinct('visitorId', { createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
      AnalyticsClick.aggregate(clickBreakdown({ kind: '$kind', target: '$target' })),
      AnalyticsClick.aggregate(clickBreakdown('$kind')),
    ]);

    const byKey = new Map<string, SeriesPoint>(
      facets.series.map((s: any) => [
        s._id,
        { key: s._id, visitors: s.visitors, pageviews: s.pageviews, sessions: s.sessions },
      ])
    );
    const series = bucketKeys(from, to, interval).map(
      (key) => byKey.get(key) ?? { key, visitors: 0, pageviews: 0, sessions: 0 }
    );

    const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const cell of facets.heatmap) heatmap[cell._id.dow - 1][cell._id.hour] = cell.n;

    const body: AnalyticsOverview = {
      range: { from, to, tz, interval },
      previousRange: { from: prevFrom, to: prevTo },
      totals,
      previousTotals,
      liveVisitors: live.length,
      series,
      breakdowns: {
        pages: rows(facets.pages, unknownLabel),
        ...sourceRows(facets),
        browsers: rows(facets.browsers, unknownLabel),
        os: rows(facets.os, unknownLabel),
        languages: rows(facets.languages, unknownLabel),
        clickTargets: rows(clickTargets, (id) => id.target, (id) => id.kind),
        clickKinds: rows(clickKinds, (id) => CLICK_KIND_LABELS[id] ?? id),
      },
      heatmap,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ error: 'Failed to load analytics', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
