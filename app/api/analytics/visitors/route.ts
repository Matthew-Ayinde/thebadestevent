import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { escapeRegex, parseRange } from '@/lib/analytics-query';

export const runtime = 'nodejs';

const LIST_FIELDS =
  'visitorId name email phone city region country countryCode device browser os firstSeenAt lastSeenAt pageviews sessions conversions totalEngagedMs firstSource firstReferrerHost firstUtmSource firstLandingPage identities.source';

const CSV_FIELDS: [string, (v: any) => unknown][] = [
  ['Visitor ID', (v) => v.visitorId],
  ['Name', (v) => v.name],
  ['Email', (v) => v.email],
  ['Phone', (v) => v.phone],
  ['Forms submitted', (v) => [...new Set((v.identities ?? []).map((i: any) => i.source))].join('; ')],
  ['City', (v) => v.city],
  ['Region', (v) => v.region],
  ['Country', (v) => v.country],
  ['Postal code', (v) => v.postalCode],
  ['Latitude', (v) => v.latitude],
  ['Longitude', (v) => v.longitude],
  ['Timezone', (v) => v.timezone],
  ['Language', (v) => v.language],
  ['IP address', (v) => v.ip],
  ['Device', (v) => v.device],
  ['Browser', (v) => [v.browser, v.browserVersion].filter(Boolean).join(' ')],
  ['OS', (v) => [v.os, v.osVersion].filter(Boolean).join(' ')],
  ['Screen', (v) => v.screen],
  ['First source', (v) => v.firstSource || v.firstUtmSource || v.firstReferrerHost || 'Direct'],
  ['First campaign', (v) => v.firstUtmCampaign],
  ['Landing page', (v) => v.firstLandingPage],
  ['Pageviews', (v) => v.pageviews],
  ['Sessions', (v) => v.sessions],
  ['Conversions', (v) => v.conversions],
  ['Time on site (s)', (v) => Math.round((v.totalEngagedMs ?? 0) / 1000)],
  ['First seen', (v) => v.firstSeenAt?.toISOString()],
  ['Last seen', (v) => v.lastSeenAt?.toISOString()],
  ['User agent', (v) => v.userAgent],
];

// Spreadsheet apps execute cells starting with these characters as formulas.
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = parseRange(searchParams);
    if (!range) return NextResponse.json({ error: 'Invalid date range', code: 'VALIDATION_ERROR' }, { status: 400 });

    // Anyone active at any point inside the range.
    const filter: Record<string, unknown> = { lastSeenAt: { $gte: range.start }, firstSeenAt: { $lt: range.end } };
    if (searchParams.get('identified') === '1') filter.email = { $exists: true, $ne: null };
    const q = searchParams.get('q')?.trim().slice(0, 100);
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = ['name', 'email', 'phone', 'city', 'region', 'country', 'ip', 'visitorId'].map((f) => ({ [f]: re }));
    }

    await connectDB();

    if (searchParams.get('format') === 'csv') {
      const rows = await AnalyticsVisitor.find(filter).sort({ lastSeenAt: -1 }).limit(20000).lean();
      const csv = [
        CSV_FIELDS.map(([h]) => csvCell(h)).join(','),
        ...rows.map((r) => CSV_FIELDS.map(([, get]) => csvCell(get(r))).join(',')),
      ].join('\r\n');
      return new NextResponse('﻿' + csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rinwa-visitors-${range.from}-to-${range.to}.csv"`,
        },
      });
    }

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const total = await AnalyticsVisitor.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const visitors = await AnalyticsVisitor.find(filter)
      .sort({ lastSeenAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .select(LIST_FIELDS)
      .lean();

    return NextResponse.json({ visitors, total, page: currentPage, totalPages, limit }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return NextResponse.json({ error: 'Failed to fetch visitors', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
