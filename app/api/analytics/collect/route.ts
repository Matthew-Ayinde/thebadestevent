import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import {
  defined,
  getRequestContext,
  newId,
  readIds,
  referrerHostOf,
  sourceLabel,
  writeIds,
} from '@/lib/analytics-server';

export const runtime = 'nodejs';

const str = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

const PageviewSchema = z.object({
  t: z.literal('pv'),
  path: z.string().trim().min(1).max(512),
  title: str(300),
  referrer: str(1024),
  utmSource: str(120),
  utmMedium: str(120),
  utmCampaign: str(200),
  utmTerm: str(200),
  utmContent: str(200),
  screen: str(20),
  language: str(35),
  timezone: str(64),
  touch: z.boolean().optional(),
});

const LeaveSchema = z.object({
  t: z.literal('leave'),
  id: z.string().refine((v) => mongoose.isValidObjectId(v)),
  engagedMs: z.number().int().min(0).max(30 * 60 * 1000),
  scrollDepth: z.number().int().min(0).max(100),
});

const BodySchema = z.discriminatedUnion('t', [PageviewSchema, LeaveSchema]);

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    // sendBeacon posts text/plain, so parse the raw body rather than relying on the content type.
    const parsed = BodySchema.safeParse(JSON.parse(await request.text()));
    if (!parsed.success) return noContent();

    const ctx = getRequestContext(request);
    if (ctx.isBot) return noContent();

    // Keep the team's own browsing out of the numbers.
    const token = await getToken({ req: request }).catch(() => null);
    if (token && (token.role === 'admin' || token.role === 'editor')) return noContent();

    const ids = readIds(request);
    await connectDB();

    if (parsed.data.t === 'leave') {
      if (!ids.visitorId) return noContent();
      const { id, engagedMs, scrollDepth } = parsed.data;
      // Leave beacons can fire more than once per page (tab hidden, then closed); values are cumulative.
      const before = await AnalyticsEvent.findOneAndUpdate(
        { _id: id, visitorId: ids.visitorId, type: 'pageview' },
        { $max: { engagedMs, scrollDepth } }
      ).select('engagedMs');
      const delta = before ? Math.max(0, engagedMs - (before.engagedMs ?? 0)) : 0;
      if (delta > 0) await AnalyticsVisitor.updateOne({ visitorId: ids.visitorId }, { $inc: { totalEngagedMs: delta } });
      // Reading counts as activity: keep the session alive through long pages.
      const response = noContent();
      if (before && ids.sessionId) writeIds(response, ids.visitorId, ids.sessionId);
      return response;
    }

    const pv = parsed.data;
    const visitorId = ids.visitorId ?? newId();
    const isNewSession = !ids.sessionId;
    const sessionId = ids.sessionId ?? newId();
    const now = new Date();

    // iPadOS 13+ reports itself as a Mac; touch support gives it away.
    let { device, os } = ctx;
    if (os === 'macOS' && pv.touch) {
      device = 'Tablet';
      os = 'iPadOS';
    }

    const referrerHost = isNewSession ? referrerHostOf(pv.referrer, request.headers.get('host')) : undefined;
    const source = sourceLabel(pv.utmSource, referrerHost);
    const geo = defined({
      country: ctx.country,
      countryCode: ctx.countryCode,
      region: ctx.region,
      city: ctx.city,
      postalCode: ctx.postalCode,
      latitude: ctx.latitude,
      longitude: ctx.longitude,
    });

    await AnalyticsVisitor.updateOne(
      { visitorId },
      {
        $setOnInsert: defined({
          firstSeenAt: now,
          firstSource: source,
          firstReferrer: referrerHost ? pv.referrer : undefined,
          firstReferrerHost: referrerHost,
          firstLandingPage: pv.path,
          firstUtmSource: pv.utmSource,
          firstUtmMedium: pv.utmMedium,
          firstUtmCampaign: pv.utmCampaign,
        }),
        $set: {
          lastSeenAt: now,
          lastPath: pv.path,
          ...geo,
          ...defined({
            ip: ctx.ip,
            timezone: pv.timezone ?? ctx.timezone,
            language: pv.language,
            device,
            browser: ctx.browser,
            browserVersion: ctx.browserVersion,
            os,
            osVersion: ctx.osVersion,
            screen: pv.screen,
            userAgent: ctx.userAgent,
          }),
        },
        $inc: { pageviews: 1, sessions: isNewSession ? 1 : 0 },
      },
      { upsert: true }
    );

    const event = await AnalyticsEvent.create({
      type: 'pageview',
      visitorId,
      sessionId,
      isNewSession,
      path: pv.path,
      source,
      ...defined({
        title: pv.title,
        referrer: referrerHost ? pv.referrer : undefined,
        referrerHost,
        utmSource: pv.utmSource,
        utmMedium: pv.utmMedium,
        utmCampaign: pv.utmCampaign,
        utmTerm: pv.utmTerm,
        utmContent: pv.utmContent,
        country: geo.country,
        countryCode: geo.countryCode,
        region: geo.region,
        city: geo.city,
        device,
        browser: ctx.browser,
        os,
        language: pv.language,
        timezone: pv.timezone ?? ctx.timezone,
        screen: pv.screen,
      }),
    });

    const response = NextResponse.json({ id: event._id.toString() });
    writeIds(response, visitorId, sessionId);
    return response;
  } catch (error) {
    console.warn('Analytics collect failed:', error);
    return noContent();
  }
}
