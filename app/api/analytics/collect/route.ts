import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsClick } from '@/models/AnalyticsClick';
import { AnalyticsFormEvent } from '@/models/AnalyticsFormEvent';
import { FORM_ACTIONS, FORM_IDS } from '@/lib/analytics-forms';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';
import {
  anonymousVisitorId,
  clearIds,
  defined,
  getRequestContext,
  hasAnalyticsConsent,
  newId,
  readIds,
  referrerHostOf,
  sourceLabel,
  writeIds,
} from '@/lib/analytics-server';

export const runtime = 'nodejs';

const str = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const objectId = z.string().refine((v) => mongoose.isValidObjectId(v));

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
  viewport: str(20),
  colorScheme: z.enum(['light', 'dark']).optional(),
  connection: str(10),
  language: str(35),
  timezone: str(64),
  touch: z.boolean().optional(),
  /** Set when the visitor accepted cookies on this page: convert that anonymous view instead of adding one. */
  upgradeId: objectId.optional(),
});

const LeaveSchema = z.object({
  t: z.literal('leave'),
  id: objectId,
  engagedMs: z.number().int().min(0).max(30 * 60 * 1000),
  scrollDepth: z.number().int().min(0).max(100),
});

const ClickSchema = z.object({
  t: z.literal('click'),
  pageviewId: objectId.optional(),
  path: z.string().trim().min(1).max(512),
  kind: z.enum(['whatsapp', 'phone', 'email', 'social', 'outbound', 'cta']),
  target: z.string().trim().min(1).max(200),
  label: str(120),
});

const FormSchema = z.object({
  t: z.literal('form'),
  form: z.enum(FORM_IDS),
  attemptId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  action: z.enum(FORM_ACTIONS),
  step: z.number().int().min(0).max(20),
  message: str(160),
});

const OptOutSchema = z.object({ t: z.literal('optout') });

const BodySchema = z.discriminatedUnion('t', [PageviewSchema, LeaveSchema, ClickSchema, FormSchema, OptOutSchema]);

const noContent = () => new NextResponse(null, { status: 204 });
const SESSION_GAP_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // sendBeacon posts text/plain, so parse the raw body rather than relying on the content type.
    const raw = await request.text();
    if (raw.length > 10_000) return new NextResponse(null, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return noContent();
    }
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) return noContent();
    const body = parsed.data;

    const consented = hasAnalyticsConsent(request);
    const ids = readIds(request);

    // Opting out: drop the httpOnly visitor/session cookies, which the browser can't remove itself.
    if (body.t === 'optout') {
      const response = noContent();
      if (!consented) clearIds(response);
      return response;
    }

    const ctx = getRequestContext(request);
    if (ctx.isBot) return noContent();

    const limited = await rateLimit(RATE_LIMITS.collect, rateLimitKey(request.headers));
    if (!limited.ok) {
      return new NextResponse(null, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    // Keep the team's own browsing out of the numbers.
    const token = await getToken({ req: request }).catch(() => null);
    if (token && (token.role === 'admin' || token.role === 'editor')) return noContent();

    // Without consent: a daily, cookieless id; no cookies are set and leftover ones are cleared.
    const visitorId = consented ? ids.visitorId ?? newId() : anonymousVisitorId(request);
    const finish = (response: NextResponse, sessionId?: string) => {
      if (consented && sessionId) writeIds(response, visitorId, sessionId);
      if (!consented && (ids.visitorId || ids.sessionId)) clearIds(response);
      return response;
    };

    await connectDB();

    if (body.t === 'leave') {
      const { id, engagedMs, scrollDepth } = body;
      if (consented && !ids.visitorId) return noContent();
      // Leave beacons can fire more than once per page (tab hidden, then closed); values are cumulative.
      const before = await AnalyticsEvent.findOneAndUpdate(
        { _id: id, visitorId, type: 'pageview' },
        { $max: { engagedMs, scrollDepth } }
      ).select('engagedMs');
      const delta = before ? Math.max(0, engagedMs - (before.engagedMs ?? 0)) : 0;
      if (consented && delta > 0) await AnalyticsVisitor.updateOne({ visitorId }, { $inc: { totalEngagedMs: delta } });
      // Reading counts as activity: keep the session alive through long pages.
      return finish(noContent(), before ? ids.sessionId : undefined);
    }

    if (body.t === 'click') {
      await AnalyticsClick.create({
        pageviewId: body.pageviewId,
        visitorId,
        sessionId: (consented && ids.sessionId) || visitorId,
        consent: consented,
        path: body.path,
        kind: body.kind,
        target: body.target,
        label: body.label,
        ...defined({ countryCode: ctx.countryCode, country: ctx.country, city: ctx.city, deviceType: ctx.device }),
      });
      return finish(noContent());
    }

    if (body.t === 'form') {
      await AnalyticsFormEvent.create({
        form: body.form,
        attemptId: body.attemptId,
        visitorId,
        consent: consented,
        action: body.action,
        step: body.step,
        message: body.message,
        ...defined({ countryCode: ctx.countryCode, deviceType: ctx.device }),
      });
      return finish(noContent());
    }

    const pv = body;
    const now = new Date();

    let sessionId: string;
    let isNewSession: boolean;
    if (consented) {
      isNewSession = !ids.sessionId;
      sessionId = ids.sessionId ?? newId();
    } else {
      // Cookieless: continue the session if they were active in the last 30 minutes.
      const recent = await AnalyticsEvent.findOne({ visitorId, createdAt: { $gte: new Date(now.getTime() - SESSION_GAP_MS) } })
        .sort({ createdAt: -1 })
        .select('sessionId')
        .lean<{ sessionId: string }>();
      isNewSession = !recent;
      sessionId = recent?.sessionId ?? `${visitorId}-${now.getTime().toString(36)}`;
    }

    // iPadOS 13+ reports itself as a Mac; touch support gives it away.
    let { device, os } = ctx;
    if (os === 'macOS' && pv.touch) {
      device = 'Tablet';
      os = 'iPadOS';
    }

    const referrerHost = isNewSession || pv.upgradeId ? referrerHostOf(pv.referrer, request.headers.get('host')) : undefined;
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

    const eventFields = {
      type: 'pageview' as const,
      visitorId,
      sessionId,
      isNewSession,
      consent: consented,
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
        // Precise device details are only kept with consent.
        deviceModel: consented ? ctx.deviceModel : undefined,
        viewport: consented ? pv.viewport : undefined,
        colorScheme: consented ? pv.colorScheme : undefined,
        connection: consented ? pv.connection : undefined,
      }),
    };

    // Accepting cookies mid-page converts the anonymous view rather than counting the page twice.
    let eventId: string | null = null;
    if (consented && pv.upgradeId) {
      const upgraded = await AnalyticsEvent.findOneAndUpdate(
        { _id: pv.upgradeId, type: 'pageview', consent: false },
        { $set: eventFields },
        { new: true }
      ).select('_id');
      if (!upgraded) return noContent();
      eventId = upgraded._id.toString();
    }

    if (consented) {
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
              deviceModel: ctx.deviceModel,
              screen: pv.screen,
              viewport: pv.viewport,
              colorScheme: pv.colorScheme,
              connection: pv.connection,
              userAgent: ctx.userAgent,
            }),
          },
          $min: { consentAt: now },
          ...(ctx.ip ? { $addToSet: { ipAddresses: ctx.ip } } : {}),
          $inc: { pageviews: 1, sessions: isNewSession ? 1 : 0 },
        },
        { upsert: true }
      );
    }

    if (!eventId) eventId = (await AnalyticsEvent.create(eventFields))._id.toString();

    return finish(NextResponse.json({ id: eventId }), sessionId);
  } catch (error) {
    console.warn('Analytics collect failed:', error);
    return noContent();
  }
}
