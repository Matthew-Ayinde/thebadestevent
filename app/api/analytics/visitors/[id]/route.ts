import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsClick } from '@/models/AnalyticsClick';
import { requireAdmin } from '@/lib/analytics/admin-query';
import type { VisitorDetail } from '@/lib/analytics/types';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENT_LIMIT = 300;
const ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'Invalid visitor id' }, { status: 400 });

  try {
    await connectDB();
    const [profile, events, clicks, totalMsAgg] = await Promise.all([
      AnalyticsVisitor.findOne({ visitorId: id }).lean<any>(),
      AnalyticsEvent.find({ visitorId: id }).sort({ createdAt: -1 }).limit(EVENT_LIMIT).lean<any[]>(),
      AnalyticsClick.find({ visitorId: id }).sort({ createdAt: -1 }).limit(EVENT_LIMIT).lean<any[]>(),
      AnalyticsEvent.aggregate([
        { $match: { visitorId: id } },
        { $group: { _id: null, ms: { $sum: '$durationMs' }, sessions: { $addToSet: '$sessionId' }, n: { $sum: 1 } } },
      ]),
    ]);

    if (!profile && events.length === 0) return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });

    // Cookieless visitors have no stored profile; describe them from their page views.
    const latest = events[0] ?? {};
    const earliest = events[events.length - 1] ?? {};
    const p = profile ?? {
      visitorId: id,
      countryCode: latest.countryCode,
      country: latest.country,
      region: latest.region,
      city: latest.city,
      deviceType: latest.deviceType,
      browser: latest.browser,
      os: latest.os,
      language: latest.language,
      timezone: latest.timezone,
      screen: latest.screen,
      firstSeen: earliest.createdAt,
      lastSeen: latest.createdAt,
      pageviews: totalMsAgg[0]?.n ?? 0,
      sessions: totalMsAgg[0]?.sessions.length ?? 0,
      firstReferrerHost: earliest.referrerHost,
      firstUtmSource: earliest.utmSource,
      firstUtmCampaign: earliest.utmCampaign,
      firstLandingPath: earliest.path,
    };

    const body: VisitorDetail = {
      visitor: {
        visitorId: p.visitorId,
        consent: !!profile,
        name: p.name,
        email: p.email,
        phone: p.phone,
        company: p.company,
        ip: p.ip,
        ipAddresses: p.ipAddresses ?? [],
        userAgent: p.userAgent,
        consentAt: p.consentAt,
        identitySources: [...new Set<string>((p.identitySources ?? []).map((s: any) => s.source))],
        identitySourceLog: (p.identitySources ?? []).map((s: any) => ({
          source: s.source,
          submissionId: s.submissionId,
          at: s.at,
        })),
        identifiedAt: p.identifiedAt,
        countryCode: p.countryCode,
        country: p.country,
        region: p.region,
        city: p.city,
        deviceType: p.deviceType,
        deviceModel: p.deviceModel,
        browser: p.browser,
        os: p.os,
        osVersion: p.osVersion,
        language: p.language,
        timezone: p.timezone,
        screen: p.screen,
        viewport: p.viewport,
        colorScheme: p.colorScheme,
        connection: p.connection,
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen,
        pageviews: p.pageviews,
        sessions: p.sessions,
        totalMs: totalMsAgg[0]?.ms ?? 0,
        firstReferrer: p.firstReferrer,
        firstReferrerHost: p.firstReferrerHost,
        firstUtmSource: p.firstUtmSource,
        firstUtmCampaign: p.firstUtmCampaign,
        firstLandingPath: p.firstLandingPath,
      },
      events: events.map((e) => ({
        pageviewId: e.pageviewId,
        sessionId: e.sessionId,
        path: e.path,
        title: e.title,
        referrerHost: e.referrerHost,
        utmSource: e.utmSource,
        utmCampaign: e.utmCampaign,
        city: e.city,
        country: e.country,
        countryCode: e.countryCode,
        browser: e.browser,
        os: e.os,
        deviceType: e.deviceType,
        ip: e.ip,
        durationMs: e.durationMs ?? 0,
        maxScroll: e.maxScroll ?? 0,
        createdAt: e.createdAt,
      })),
      clicks: clicks.map((c) => ({
        pageviewId: c.pageviewId,
        path: c.path,
        kind: c.kind,
        target: c.target,
        label: c.label,
        createdAt: c.createdAt,
      })),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Analytics visitor detail error:', error);
    return NextResponse.json({ error: 'Failed to load visitor' }, { status: 500 });
  }
}

/** Erases everything analytics holds about one visitor (right-to-erasure requests). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'Invalid visitor id' }, { status: 400 });

  try {
    await connectDB();
    const [events, clicks, profile] = await Promise.all([
      AnalyticsEvent.deleteMany({ visitorId: id }),
      AnalyticsClick.deleteMany({ visitorId: id }),
      AnalyticsVisitor.deleteOne({ visitorId: id }),
    ]);
    return NextResponse.json({
      deleted: { pageviews: events.deletedCount, clicks: clicks.deletedCount, profile: profile.deletedCount },
    });
  } catch (error) {
    console.error('Analytics visitor delete error:', error);
    return NextResponse.json({ error: 'Failed to delete visitor data' }, { status: 500 });
  }
}
