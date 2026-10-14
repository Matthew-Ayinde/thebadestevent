import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { escapeRegex, parseRange, requireAdmin } from '@/lib/analytics/admin-query';
import type { VisitorList, VisitorRow } from '@/lib/analytics/types';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORTS: Record<string, Record<string, 1 | -1>> = {
  lastSeen: { lastSeen: -1 },
  pageviews: { pageviews: -1, lastSeen: -1 },
  sessions: { sessions: -1, lastSeen: -1 },
  time: { totalMs: -1, lastSeen: -1 },
};
const CSV_LIMIT = 10_000;

function csvCell(value: unknown) {
  const s = value === undefined || value === null ? '' : value instanceof Date ? value.toISOString() : String(value);
  // Neutralise spreadsheet formula injection (but leave phone numbers like
  // "+44 7700 900123" alone), then quote.
  const isPhoneLike = /^[+-][\d\s().-]+$/.test(s);
  const safe = /^[=+\-@\t\r]/.test(s) && !isPhoneLike ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(rows: VisitorRow[]) {
  const columns: [string, (r: VisitorRow) => unknown][] = [
    ['Visitor ID', (r) => r.visitorId],
    ['Name', (r) => r.name],
    ['Email', (r) => r.email],
    ['Phone', (r) => r.phone],
    ['Company', (r) => r.company],
    ['Forms submitted', (r) => r.identitySources?.join('; ')],
    ['City', (r) => r.city],
    ['Region', (r) => r.region],
    ['Country', (r) => r.country],
    ['Cookie consent', (r) => (r.consent ? 'yes' : 'no')],
    ['IP address', (r) => r.ip],
    ['Device', (r) => r.deviceType],
    ['Device model', (r) => r.deviceModel],
    ['Browser', (r) => r.browser],
    ['OS', (r) => r.os],
    ['First seen (in range)', (r) => r.firstSeen],
    ['Last seen (in range)', (r) => r.lastSeen],
    ['Page views', (r) => r.pageviews],
    ['Sessions', (r) => r.sessions],
    ['Engaged seconds', (r) => Math.round(r.totalMs / 1000)],
    ['First referrer', (r) => r.firstReferrerHost],
    ['First UTM source', (r) => r.firstUtmSource],
  ];
  const header = columns.map(([name]) => csvCell(name)).join(',');
  const lines = rows.map((r) => columns.map(([, get]) => csvCell(get(r))).join(','));
  return [header, ...lines].join('\r\n');
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const range = parseRange(request);
  if (range instanceof NextResponse) return range;
  const { from, to, start, end } = range;

  const params = request.nextUrl.searchParams;
  const isCsv = params.get('format') === 'csv';
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25', 10) || 25));
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const sort = SORTS[params.get('sort') || ''] ?? SORTS.lastSeen;
  const q = params.get('q')?.trim().slice(0, 100);
  const identifiedOnly = params.get('identified') === '1';

  const filters: Record<string, unknown>[] = [];
  if (identifiedOnly) {
    filters.push({ $or: [{ email: { $exists: true } }, { phone: { $exists: true } }, { name: { $exists: true } }] });
  }
  if (q) {
    const re = { $regex: escapeRegex(q), $options: 'i' };
    filters.push({
      $or: ['name', 'email', 'phone', 'company', 'city', 'country', 'region', 'visitorId', 'ip'].map((f) => ({ [f]: re })),
    });
  }

  try {
    await connectDB();

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$visitorId',
          consent: { $max: { $ne: ['$consent', false] } },
          ip: { $last: '$ip' },
          countryCode: { $last: '$countryCode' },
          country: { $last: '$country' },
          region: { $last: '$region' },
          city: { $last: '$city' },
          deviceType: { $last: '$deviceType' },
          deviceModel: { $last: '$deviceModel' },
          browser: { $last: '$browser' },
          os: { $last: '$os' },
          firstReferrerHost: { $first: '$referrerHost' },
          firstUtmSource: { $first: '$utmSource' },
          pageviews: { $sum: 1 },
          sessionIds: { $addToSet: '$sessionId' },
          totalMs: { $sum: '$durationMs' },
          firstSeen: { $min: '$createdAt' },
          lastSeen: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: AnalyticsVisitor.collection.name,
          localField: '_id',
          foreignField: 'visitorId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          visitorId: '$_id',
          pageviews: 1,
          sessions: { $size: '$sessionIds' },
          totalMs: 1,
          firstSeen: 1,
          lastSeen: 1,
          name: '$profile.name',
          email: '$profile.email',
          phone: '$profile.phone',
          company: '$profile.company',
          consent: 1,
          ip: { $ifNull: ['$profile.ip', '$ip'] },
          deviceModel: { $ifNull: ['$profile.deviceModel', '$deviceModel'] },
          identitySources: { $setUnion: [{ $ifNull: ['$profile.identitySources.source', []] }, []] },
          countryCode: { $ifNull: ['$profile.countryCode', '$countryCode'] },
          country: { $ifNull: ['$profile.country', '$country'] },
          region: { $ifNull: ['$profile.region', '$region'] },
          city: { $ifNull: ['$profile.city', '$city'] },
          deviceType: { $ifNull: ['$profile.deviceType', '$deviceType'] },
          browser: { $ifNull: ['$profile.browser', '$browser'] },
          os: { $ifNull: ['$profile.os', '$os'] },
          firstReferrerHost: { $ifNull: ['$profile.firstReferrerHost', '$firstReferrerHost'] },
          firstUtmSource: { $ifNull: ['$profile.firstUtmSource', '$firstUtmSource'] },
        },
      },
      ...(filters.length ? [{ $match: { $and: filters } }] : []),
      { $sort: sort },
    ];

    if (isCsv) {
      const all = await AnalyticsEvent.aggregate([...pipeline, { $limit: CSV_LIMIT }]).allowDiskUse(true);
      return new NextResponse(toCsv(all), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rinwa-visitors-${from}-to-${to}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const [result] = await AnalyticsEvent.aggregate([
      ...pipeline,
      {
        $facet: {
          rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: 'n' }],
        },
      },
    ]).allowDiskUse(true);

    const total = result.total[0]?.n ?? 0;
    const body: VisitorList = {
      visitors: result.rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Analytics visitors error:', error);
    return NextResponse.json({ error: 'Failed to load visitors', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
