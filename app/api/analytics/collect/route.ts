import { createHmac } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsClick } from '@/models/AnalyticsClick';
import { AnalyticsFormEvent } from '@/models/AnalyticsFormEvent';
import { FORM_ACTIONS, FORM_IDS } from '@/lib/analytics/forms';
import { applyClientHints, parseUserAgent, readGeo } from '@/lib/analytics/request-context';
import { getClientIp, rateLimitKey } from '@/lib/client-ip';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const id = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);
const text = (max: number) => z.string().max(max).optional();

// visitorId/sessionId are only present when the visitor accepted analytics cookies.
const PageviewSchema = z.object({
  type: z.literal('pageview'),
  pageviewId: id,
  upgrade: z.boolean().default(false),
  visitorId: id.optional(),
  sessionId: id.optional(),
  isNewSession: z.boolean().default(false),
  path: z.string().min(1).max(500),
  title: text(300),
  referrer: text(1000),
  utmSource: text(200),
  utmMedium: text(200),
  utmCampaign: text(200),
  utmTerm: text(200),
  utmContent: text(200),
  timezone: text(80),
  language: text(35),
  screen: text(20),
  viewport: text(20),
  colorScheme: z.enum(['light', 'dark']).optional(),
  connection: text(10),
});

const EngagementSchema = z.object({
  type: z.literal('engagement'),
  pageviewId: id,
  visitorId: id.optional(),
  durationMs: z.number().min(0).max(4 * 60 * 60 * 1000),
  maxScroll: z.number().min(0).max(100),
});

const ClickSchema = z.object({
  type: z.literal('click'),
  pageviewId: id.optional(),
  visitorId: id.optional(),
  sessionId: id.optional(),
  path: z.string().min(1).max(500),
  kind: z.enum(['whatsapp', 'phone', 'email', 'social', 'outbound', 'cta']),
  target: z.string().min(1).max(200),
  label: text(120),
});

const FormSchema = z.object({
  type: z.literal('form'),
  form: z.enum(FORM_IDS),
  attemptId: id,
  visitorId: id.optional(),
  action: z.enum(FORM_ACTIONS),
  step: z.number().int().min(0).max(20),
  message: text(160),
});

const PayloadSchema = z.discriminatedUnion('type', [PageviewSchema, EngagementSchema, ClickSchema, FormSchema]);

// Collapse link-shim and mobile hosts so each network shows up as one source.
const REFERRER_ALIASES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'instagram.com'],
  [/(^|\.)facebook\.com$|^fb\.me$/, 'facebook.com'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'x.com'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'linkedin.com'],
  [/(^|\.)tiktok\.com$/, 'tiktok.com'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube.com'],
  [/^google\.[a-z.]+$/, 'google.com'],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, 'whatsapp.com'],
];

function referrerHost(referrer: string | undefined, ownHost: string | null) {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (ownHost && host === ownHost.replace(/^www\./, '').split(':')[0]) return undefined;
    return REFERRER_ALIASES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
  } catch {
    return undefined;
  }
}

/**
 * Cookieless visitor id for people who haven't accepted analytics cookies:
 * a keyed hash of the day, IP and browser. The IP is never stored, and the
 * daily key rotation means the same person can't be followed across days.
 */
function anonymousId(request: NextRequest) {
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.NEXTAUTH_SECRET || 'rinwa-analytics';
  const material = [day, getClientIp(request.headers) ?? '', request.headers.get('user-agent') ?? ''].join('|');
  return `anon-${createHmac('sha256', `${secret}:${day}`).update(material).digest('hex').slice(0, 32)}`;
}

function defined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    const device = applyClientHints(request, parseUserAgent(request.headers.get('user-agent') || ''));
    if (device.isBot) return noContent();

    const limited = await rateLimit(RATE_LIMITS.collect, rateLimitKey(request.headers));
    if (!limited.ok) {
      return new NextResponse(null, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    // sendBeacon may post as text/plain, so parse the raw body.
    const raw = await request.text();
    if (raw.length > 10_000) return new NextResponse(null, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return new NextResponse(null, { status: 400 });
    }
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) return new NextResponse(null, { status: 400 });
    const data = parsed.data;

    const consented = !!data.visitorId;
    const visitorId = data.visitorId ?? anonymousId(request);

    await connectDB();

    if (data.type === 'engagement') {
      await AnalyticsEvent.updateOne(
        { pageviewId: data.pageviewId, visitorId },
        { $max: { durationMs: Math.round(data.durationMs), maxScroll: Math.round(data.maxScroll) } }
      );
      return noContent();
    }

    const geo = readGeo(request);

    if (data.type === 'form') {
      await AnalyticsFormEvent.create({
        form: data.form,
        attemptId: data.attemptId,
        visitorId,
        consent: consented,
        action: data.action,
        step: data.step,
        message: data.message,
        countryCode: geo.countryCode,
        deviceType: device.deviceType,
      });
      return noContent();
    }

    if (data.type === 'click') {
      await AnalyticsClick.create({
        pageviewId: data.pageviewId,
        visitorId,
        sessionId: data.sessionId ?? visitorId,
        consent: consented,
        path: data.path,
        kind: data.kind,
        target: data.target,
        label: data.label,
        countryCode: geo.countryCode,
        country: geo.country,
        city: geo.city,
        deviceType: device.deviceType,
      });
      return noContent();
    }

    // Personal details (IP, exact device) are only kept with cookie consent.
    const ip = consented ? getClientIp(request.headers) : undefined;
    const now = new Date();
    const refHost = referrerHost(data.referrer, request.headers.get('host'));
    let sessionId = data.sessionId;
    let isNewSession = data.isNewSession;
    if (!sessionId) {
      // Cookieless visitors: continue the session if they were active in the
      // last 30 minutes, otherwise start a new one.
      const recent = await AnalyticsEvent.findOne({
        visitorId,
        createdAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .select('sessionId')
        .lean<{ sessionId: string }>();
      sessionId = recent?.sessionId ?? `${visitorId}-${now.getTime().toString(36)}`;
      isNewSession = !recent;
    }

    const event = defined({
      pageviewId: data.pageviewId,
      visitorId,
      sessionId,
      isNewSession,
      consent: consented,
      ip,
      path: data.path,
      title: data.title,
      referrer: refHost ? data.referrer : undefined,
      referrerHost: refHost,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmTerm: data.utmTerm,
      utmContent: data.utmContent,
      ...geo,
      timezone: data.timezone || geo.timezone,
      language: data.language,
      browser: device.browser,
      browserVersion: device.browserVersion,
      os: device.os,
      osVersion: consented ? device.osVersion : undefined,
      deviceModel: consented ? device.deviceModel : undefined,
      deviceType: device.deviceType,
      screen: data.screen,
      viewport: data.viewport,
      colorScheme: data.colorScheme,
      connection: data.connection,
    });

    if (data.upgrade && consented) {
      // The visitor accepted cookies while on this page: convert the anonymous
      // page view rather than counting the page twice.
      const upgraded = await AnalyticsEvent.updateOne(
        { pageviewId: data.pageviewId, consent: false },
        { $set: event }
      );
      if (upgraded.matchedCount === 0 && (await AnalyticsEvent.exists({ pageviewId: data.pageviewId }))) {
        return noContent();
      }
      if (upgraded.matchedCount === 0) await AnalyticsEvent.create(event);
    } else {
      try {
        await AnalyticsEvent.create(event);
      } catch (error: any) {
        // Duplicate pageviewId (e.g. a retried request): already recorded.
        if (error?.code === 11000) return noContent();
        throw error;
      }
    }

    if (!consented) return noContent();

    const latest = defined({
      countryCode: geo.countryCode,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: event.timezone,
      language: data.language,
      browser: device.browser,
      os: device.os,
      osVersion: device.osVersion,
      deviceModel: device.deviceModel,
      deviceType: device.deviceType,
      screen: data.screen,
      viewport: data.viewport,
      colorScheme: data.colorScheme,
      connection: data.connection,
      ip,
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    });

    await AnalyticsVisitor.updateOne(
      { visitorId },
      {
        $set: { lastSeen: now, ...latest },
        $min: { firstSeen: now, consentAt: now },
        $inc: { pageviews: 1, sessions: isNewSession ? 1 : 0 },
        ...(ip ? { $addToSet: { ipAddresses: ip } } : {}),
        $setOnInsert: defined({
          identitySources: [],
          firstReferrer: event.referrer,
          firstReferrerHost: refHost,
          firstUtmSource: data.utmSource,
          firstUtmCampaign: data.utmCampaign,
          firstLandingPath: data.path,
        }),
      },
      { upsert: true }
    );

    return noContent();
  } catch (error) {
    console.error('Analytics collect error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
