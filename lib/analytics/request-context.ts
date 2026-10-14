import type { NextRequest } from 'next/server';

export const VISITOR_COOKIE = 'rw_vid';

export interface GeoInfo {
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface DeviceInfo {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceModel?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isBot: boolean;
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|phantomjs|puppeteer|playwright|selenium|pingdom|uptime|monitor|python-requests|curl\/|wget/i;

const countryNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

function decode(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).trim() || undefined;
  } catch {
    return value.trim() || undefined;
  }
}

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Location comes from the hosting edge (Vercel, or Cloudflare with
// "visitor location headers" enabled). Locally there are no such headers,
// so everything resolves to undefined and shows as "Unknown".
export function readGeo(request: NextRequest): GeoInfo {
  const h = request.headers;
  const rawCode = h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || undefined;
  const countryCode = rawCode && rawCode !== 'XX' && rawCode !== 'T1' ? rawCode.toUpperCase() : undefined;
  let country: string | undefined;
  if (countryCode) {
    try {
      country = countryNames?.of(countryCode) ?? countryCode;
    } catch {
      country = countryCode;
    }
  }

  return {
    countryCode,
    country,
    region: decode(h.get('x-vercel-ip-country-region') || h.get('cf-region')),
    city: decode(h.get('x-vercel-ip-city') || h.get('cf-ipcity')),
    latitude: toNumber(h.get('x-vercel-ip-latitude') || h.get('cf-iplatitude')),
    longitude: toNumber(h.get('x-vercel-ip-longitude') || h.get('cf-iplongitude')),
    timezone: decode(h.get('x-vercel-ip-timezone') || h.get('cf-timezone')),
  };
}

function match(ua: string, pattern: RegExp): string | undefined {
  return ua.match(pattern)?.[1];
}

export function parseUserAgent(ua: string): DeviceInfo {
  const isBot = !ua || BOT_PATTERN.test(ua);

  // In-app browsers first: they embed Chrome/Safari tokens too.
  let browser = 'Other';
  let browserVersion: string | undefined;
  const checks: [string, RegExp][] = [
    ['Instagram', /Instagram\s([\d.]+)/],
    ['Facebook', /FB(?:AV|_IAB)\/([\d.]+)/],
    ['TikTok', /(?:musical_ly|TikTok)[_/ ]([\d.]+)/i],
    ['Snapchat', /Snapchat\/([\d.]+)/],
    ['LinkedIn', /LinkedInApp(?:\/([\d.]+))?/],
    ['WhatsApp', /WhatsApp\/([\d.]+)/],
    ['X', /Twitter(?:Android)?\/?([\d.]+)?/],
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of checks) {
    if (pattern.test(ua)) {
      browser = name;
      browserVersion = match(ua, pattern)?.split('.')[0];
      break;
    }
  }

  let os = 'Other';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/iPad/.test(ua)) os = 'iPadOS';
  else if (/iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let osVersion: string | undefined;
  if (os === 'iOS' || os === 'iPadOS') osVersion = match(ua, /OS (\d+(?:_\d+)?)/)?.replace('_', '.');
  else if (os === 'Android') osVersion = match(ua, /Android (\d+(?:\.\d+)?)/);
  else if (os === 'macOS') osVersion = match(ua, /Mac OS X (\d+[_.]\d+)/)?.replace('_', '.');
  else if (os === 'Windows') {
    const nt = match(ua, /Windows NT ([\d.]+)/);
    // Browsers freeze "Windows NT 10.0" for both Windows 10 and 11.
    osVersion = nt === '10.0' ? '10/11' : nt;
  }

  let deviceModel: string | undefined;
  if (/iPhone/.test(ua)) deviceModel = 'iPhone';
  else if (/iPad/.test(ua)) deviceModel = 'iPad';
  else if (os === 'Android') {
    const model = match(ua, /Android [\d.]+;(?: [a-z]{2}[-_][a-zA-Z]{2};)? ([^;)]+?)(?: Build\/|\))/)?.trim();
    // Chrome's reduced user agent replaces the model with "K".
    if (model && model !== 'K' && model !== 'wv') deviceModel = model.slice(0, 60);
  }

  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  if (/iPad|Tablet/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) deviceType = 'tablet';
  else if (/Mobi|iPhone|iPod|Android/i.test(ua)) deviceType = 'mobile';

  return { browser, browserVersion, os, osVersion, deviceModel, deviceType, isBot };
}

/**
 * Refines the user-agent guess with Client Hints (requested site-wide via the
 * Accept-CH header in next.config.ts). Chromium browsers hide the Android model
 * and the Windows 10/11 distinction from the user agent but share them here.
 */
export function applyClientHints(request: NextRequest, device: DeviceInfo): DeviceInfo {
  const unquote = (v: string | null) => v?.replace(/^"|"$/g, '').trim() || undefined;
  const model = unquote(request.headers.get('sec-ch-ua-model'));
  const platformVersion = unquote(request.headers.get('sec-ch-ua-platform-version'));
  const refined = { ...device };
  if (model && model.length <= 60) refined.deviceModel = model;
  if (platformVersion) {
    const major = Number(platformVersion.split('.')[0]);
    if (device.os === 'Windows' && Number.isFinite(major) && major > 0) refined.osVersion = major >= 13 ? '11' : '10';
    else if (device.os === 'Android' || device.os === 'macOS') refined.osVersion = platformVersion.split('.').slice(0, 2).join('.');
  }
  return refined;
}

export function readVisitorId(request: NextRequest): string | undefined {
  const value = request.cookies.get(VISITOR_COOKIE)?.value;
  return value && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : undefined;
}
