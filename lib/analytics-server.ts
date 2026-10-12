import { randomUUID } from 'crypto';
import { after, type NextRequest, type NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';

export const VISITOR_COOKIE = 'rw_vid';
export const SESSION_COOKIE = 'rw_sid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_MAX_AGE = 60 * 30; // 30 min of inactivity ends a session (GA convention)

/* ---------------------------------- Request context ---------------------------------- */

export interface RequestContext {
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  userAgent?: string;
  device: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  isBot: boolean;
}

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|quora link|whatsapp\/|telegrambot|discordbot|vercel|curl\/|wget|python-requests|axios|node-fetch|go-http-client|httpclient|scrapy|phantomjs|puppeteer|playwright|selenium/i;

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

export function countryName(code?: string) {
  if (!code || code.length !== 2) return undefined;
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function header(request: NextRequest, name: string) {
  const v = request.headers.get(name);
  if (!v) return undefined;
  try {
    return decodeURIComponent(v).trim() || undefined;
  } catch {
    return v.trim() || undefined;
  }
}

function num(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseUserAgent(ua: string) {
  const v = (re: RegExp) => ua.match(re)?.[1]?.replace(/_/g, '.');

  let browser = 'Other';
  let browserVersion: string | undefined;
  const browsers: [string, RegExp][] = [
    ['Instagram', /Instagram ([\d.]+)/],
    ['Facebook', /FBAV\/([\d.]+)/],
    ['TikTok', /(?:BytedanceWebview|musical_ly)[/_]([\d.]+)/],
    ['LinkedIn', /LinkedInApp\/([\d.]+)/],
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of browsers) {
    const m = ua.match(re);
    if (m) {
      browser = name;
      browserVersion = m[1].split('.').slice(0, 2).join('.');
      break;
    }
  }

  let os = 'Other';
  let osVersion: string | undefined;
  if (/Windows NT/.test(ua)) {
    os = 'Windows';
    osVersion = v(/Windows NT ([\d.]+)/);
  } else if (/iPad/.test(ua)) {
    os = 'iPadOS';
    osVersion = v(/OS ([\d_]+)/);
  } else if (/iPhone|iPod/.test(ua)) {
    os = 'iOS';
    osVersion = v(/OS ([\d_]+)/);
  } else if (/Android/.test(ua)) {
    os = 'Android';
    osVersion = v(/Android ([\d.]+)/);
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    osVersion = v(/Mac OS X ([\d_]+)/);
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  const device = /iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? 'Tablet'
    : /Mobi|iPhone|iPod|Windows Phone/i.test(ua)
      ? 'Mobile'
      : 'Desktop';

  return { browser, browserVersion, os, osVersion, device };
}

/** Everything we can learn about a visitor from the request itself. Geo comes from the edge
 *  (Vercel's IP geolocation headers, with Cloudflare as a fallback); it's absent in local dev. */
export function getRequestContext(request: NextRequest): RequestContext {
  const userAgent = request.headers.get('user-agent') ?? '';
  const countryCode = header(request, 'x-vercel-ip-country') ?? header(request, 'cf-ipcountry');
  const validCountry = countryCode && /^[A-Z]{2}$/i.test(countryCode) && countryCode !== 'XX' ? countryCode.toUpperCase() : undefined;

  return {
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      undefined,
    countryCode: validCountry,
    country: countryName(validCountry),
    region: header(request, 'x-vercel-ip-country-region') ?? header(request, 'cf-region'),
    city: header(request, 'x-vercel-ip-city') ?? header(request, 'cf-ipcity'),
    postalCode: header(request, 'x-vercel-ip-postal-code') ?? header(request, 'cf-postal-code'),
    latitude: num(header(request, 'x-vercel-ip-latitude') ?? header(request, 'cf-iplatitude')),
    longitude: num(header(request, 'x-vercel-ip-longitude') ?? header(request, 'cf-iplongitude')),
    timezone: header(request, 'x-vercel-ip-timezone') ?? header(request, 'cf-timezone'),
    userAgent: userAgent.slice(0, 512),
    isBot: !userAgent || BOT_UA.test(userAgent),
    ...parseUserAgent(userAgent),
  };
}

/* ------------------------------------ Referrers -------------------------------------- */

const SOURCE_RULES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)yahoo\./, 'Yahoo'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(facebook\.com|fb\.me|fb\.com)$/, 'Facebook'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'],
  [/(^|\.)(mail\.google\.com|outlook\.|mail\.yahoo\.)/, 'Email'],
];

export function referrerHostOf(referrer: string | undefined, ownHost: string | null) {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.replace(/^(www|m|l|lm)\./, '').toLowerCase();
    const own = ownHost?.split(':')[0].replace(/^www\./, '').toLowerCase();
    if (!host || host === own) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

export function sourceLabel(utmSource?: string, referrerHost?: string) {
  if (utmSource) return utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  if (!referrerHost) return 'Direct';
  for (const [re, label] of SOURCE_RULES) if (re.test(referrerHost)) return label;
  return referrerHost;
}

/* ------------------------------------- Cookies --------------------------------------- */

export function readIds(request: NextRequest) {
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);
  return { visitorId: valid(visitorId), sessionId: valid(sessionId) };
}

export function newId() {
  return randomUUID();
}

export function writeIds(response: NextResponse, visitorId: string, sessionId: string) {
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
  response.cookies.set(VISITOR_COOKIE, visitorId, { ...base, maxAge: VISITOR_MAX_AGE });
  // Re-issued on every hit, so the session slides forward while the visitor stays active.
  response.cookies.set(SESSION_COOKIE, sessionId, { ...base, maxAge: SESSION_MAX_AGE });
}

/** Drops undefined/empty keys so a request without geo headers never wipes known values. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;
}

/* ------------------------------------- Identify -------------------------------------- */

export type ConversionSource = 'questionnaire' | 'meeting_request' | 'job_application' | 'medallion_rsvp' | 'contact';

export const CONVERSION_LABELS: Record<ConversionSource, string> = {
  questionnaire: 'Questionnaire',
  meeting_request: 'Meeting request',
  job_application: 'Job application',
  medallion_rsvp: 'Medallion RSVP',
  contact: 'Contact form',
};

interface IdentifyInput {
  source: ConversionSource;
  email: string;
  name?: string;
  phone?: string;
}

/**
 * Links a form submission to the browser that made it: attaches the self-reported name/email to the
 * visitor profile and records a conversion event. Runs after the response is sent and never throws,
 * so analytics can't slow down or break a form submission.
 */
export function identifyVisitor(request: NextRequest, input: IdentifyInput) {
  const { visitorId, sessionId } = readIds(request);
  if (!visitorId) return;
  const ctx = getRequestContext(request);
  const path = (() => {
    try {
      return new URL(request.headers.get('referer') ?? '').pathname;
    } catch {
      return '/';
    }
  })();

  after(async () => {
    try {
      await connectDB();
      const email = input.email.trim().toLowerCase();
      const name = input.name?.trim() || undefined;
      const phone = input.phone?.trim() || undefined;
      const now = new Date();

      const visitor = await AnalyticsVisitor.findOneAndUpdate(
        { visitorId },
        {
          $set: defined({ email, name, phone, identifiedAt: now, lastSeenAt: now }),
          $push: { identities: { $each: [defined({ email, name, phone, source: input.source, at: now })], $slice: -20 } },
          $inc: { conversions: 1 },
        },
        { new: true }
      );
      if (!visitor) return;

      await AnalyticsEvent.create({
        type: 'conversion',
        name: input.source,
        visitorId,
        sessionId: sessionId ?? 'unknown',
        path,
        source: 'Direct',
        ...defined({
          country: visitor.country ?? ctx.country,
          countryCode: visitor.countryCode ?? ctx.countryCode,
          region: visitor.region ?? ctx.region,
          city: visitor.city ?? ctx.city,
          device: ctx.device,
          browser: ctx.browser,
          os: ctx.os,
        }),
      });
    } catch (error) {
      console.warn('Analytics identify failed:', error);
    }
  });
}
