// Shared, client-safe core for admin-managed event pages served at /{slug}.
// No DB access or secrets here — safe to import from client components.

import type { CSSProperties } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export const RSVP_MODES = ['builtin', 'external', 'none'] as const;
export type RsvpMode = (typeof RSVP_MODES)[number];

export const HEADING_FONTS = {
  // Empty css = inherit the site-wide serif (Cormorant), which the root layout already loads.
  cormorant: { label: 'Cormorant Garamond (classic serif)', css: '' },
  playfair: { label: 'Playfair Display (editorial serif)', css: 'var(--font-playfair)' },
  dmserif: { label: 'DM Serif Display (bold serif)', css: 'var(--font-dmserif)' },
  fraunces: { label: 'Fraunces (soft serif)', css: 'var(--font-fraunces)' },
  geist: { label: 'Geist (modern sans)', css: 'var(--font-geist-sans)' },
} as const;
export type HeadingFont = keyof typeof HEADING_FONTS;

export const BACKDROPS = { glow: 'Soft glow', solid: 'Solid colour' } as const;
export type Backdrop = keyof typeof BACKDROPS;

export type EventTheme = {
  background: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
  headingFont: HeadingFont;
  backdrop: Backdrop;
};

/** Plain, serialisable event page passed from server to UI. Never contains secrets. */
export type EventSiteView = {
  id: string;
  slug: string;
  isPublished: boolean;
  brandName: string;
  brandEyebrow: string;
  brandWordmark: string;
  logoUrl: string;
  title: string;
  eyebrow: string;
  headline: string;
  tagline: string;
  invitationLine: string;
  description: string;
  recapMessage: string;
  coverImageUrl: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  timezone: string;
  venueName: string;
  venueAddressLines: string[];
  mapsQuery: string;
  dressCode: string;
  contactName: string;
  contactEmail: string;
  rsvpMode: RsvpMode;
  rsvpUrl: string;
  codePrefix: string;
  scannerEnabled: boolean;
  theme: EventTheme;
};

export type CheckInResult =
  | { result: 'admitted' | 'already'; guest: { name: string; code: string; checkedInAt: string } }
  | { result: 'invalid' };

// ─── Slugs ───────────────────────────────────────────────────────────────────

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

/** Top-level paths owned by the app or /public — an event can never take these over. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'careers', 'privacy', 'images', 'public', 'static', 'assets', 'login', 'logout',
  'favicon.ico', 'icon.svg', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest',
  'file.svg', 'globe.svg', 'next.svg', 'vercel.svg', 'window.svg', '_next', 'events', 'e',
]);

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'Use lowercase letters, numbers and dashes (e.g. summer-soiree-2027)';
  if (RESERVED_SLUGS.has(slug)) return `“${slug}” is used by the site — pick another URL`;
  return null;
}

export function eventPath(e: Pick<EventSiteView, 'slug'>, sub = '') {
  return `/${e.slug}${sub}`;
}

// ─── Time zones ──────────────────────────────────────────────────────────────

export const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Africa/Accra', label: 'Accra' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg' },
  { value: 'Africa/Nairobi', label: 'Nairobi' },
  { value: 'Asia/Dubai', label: 'Dubai' },
] as const;

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Milliseconds the zone is ahead of UTC at that instant (handles DST). */
function zoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** `2026-12-12T19:00` wall-clock in `timeZone` → the real instant. */
export function zonedLocalToDate(local: string, timeZone: string) {
  const naive = Date.parse(`${local.slice(0, 16)}:00Z`);
  const first = naive - zoneOffsetMs(new Date(naive), timeZone);
  const second = naive - zoneOffsetMs(new Date(first), timeZone);
  return new Date(second);
}

/** Instant → `2026-12-12T19:00` wall-clock in `timeZone`, for datetime-local inputs. */
export function dateToZonedLocal(value: string | Date, timeZone: string) {
  const d = new Date(value);
  return new Date(d.getTime() + zoneOffsetMs(d, timeZone)).toISOString().slice(0, 16);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

type When = Pick<EventSiteView, 'startsAt' | 'endsAt' | 'timezone'>;

export function formatEventDate(e: Pick<When, 'startsAt' | 'timezone'>) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: e.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(e.startsAt));
}

export function formatEventTime(e: When) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: e.timezone, hour: 'numeric', minute: '2-digit' });
  return `${fmt.format(new Date(e.startsAt))} – ${fmt.format(new Date(e.endsAt))}`;
}

export function formatEventWhen(e: When) {
  return `${formatEventDate(e)} · ${formatEventTime(e)}`;
}

export function eventDateParts(e: Pick<When, 'startsAt' | 'timezone'>) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: e.timezone,
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).formatToParts(new Date(e.startsAt));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: get('day'), month: get('month').toUpperCase(), weekday: get('weekday') };
}

/** `30.10` — the day.month stamp on recap cards. */
export function eventStampDate(e: Pick<When, 'startsAt' | 'timezone'>) {
  const { day } = eventDateParts(e);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: e.timezone, month: '2-digit' }).format(new Date(e.startsAt));
  return `${day}.${month}`;
}

export function daysUntil(e: Pick<When, 'startsAt' | 'timezone'>, now: Date = new Date()) {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: e.timezone }).format(d);
  return Math.round((Date.parse(key(new Date(e.startsAt))) - Date.parse(key(now))) / 86_400_000);
}

export function relativeDayLabel(e: Pick<When, 'startsAt' | 'timezone'>, now: Date = new Date()) {
  const d = daysUntil(e, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 7) return `In ${d} days`;
  if (d < 14) return 'Next week';
  if (d < 60) return `In ${Math.round(d / 7)} weeks`;
  return `In ${Math.round(d / 30)} months`;
}

export type EventStatus = 'upcoming' | 'live' | 'past';

export function eventStatus(e: Pick<When, 'startsAt' | 'endsAt'>, now: Date = new Date()): EventStatus {
  const t = now.getTime();
  if (t >= new Date(e.endsAt).getTime()) return 'past';
  if (t >= new Date(e.startsAt).getTime()) return 'live';
  return 'upcoming';
}

export function eventHours(e: Pick<When, 'startsAt' | 'endsAt'>) {
  return Math.max(1, Math.round((new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime()) / 3_600_000));
}

// ─── Venue ───────────────────────────────────────────────────────────────────

function mapsQuery(e: Pick<EventSiteView, 'mapsQuery' | 'venueName' | 'venueAddressLines'>) {
  return e.mapsQuery || [e.venueName, ...e.venueAddressLines].filter(Boolean).join(', ');
}

export function directionsUrl(e: Pick<EventSiteView, 'mapsQuery' | 'venueName' | 'venueAddressLines'>) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery(e))}`;
}

export function mapEmbedUrl(e: Pick<EventSiteView, 'mapsQuery' | 'venueName' | 'venueAddressLines'>) {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery(e))}&z=16&output=embed`;
}

export function venueOneLine(e: Pick<EventSiteView, 'venueName' | 'venueAddressLines'>) {
  return [e.venueName, ...e.venueAddressLines].filter(Boolean).join(', ');
}

// ─── QR payloads ─────────────────────────────────────────────────────────────

// `EV1:<token>`; `HM1:` is still accepted for passes issued before event pages existed.
export const QR_PREFIX = 'EV1:';
export const LEGACY_QR_PREFIXES = ['HM1:'];

export function qrPayload(token: string) {
  return `${QR_PREFIX}${token}`;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: EventTheme = {
  background: '#06102a',
  surface: '#0a1a3f',
  border: '#23396e',
  accent: '#00aef1',
  text: '#f3efe4',
  muted: '#b3c0e0',
  headingFont: 'cormorant',
  backdrop: 'glow',
};

export const THEME_PRESETS: { name: string; theme: Omit<EventTheme, 'headingFont' | 'backdrop'> }[] = [
  { name: 'Midnight', theme: { background: '#06102a', surface: '#0a1a3f', border: '#23396e', accent: '#00aef1', text: '#f3efe4', muted: '#b3c0e0' } },
  { name: 'Noir gold', theme: { background: '#0b0a08', surface: '#17140f', border: '#3a3122', accent: '#d4a64a', text: '#f6efe1', muted: '#c8bba3' } },
  { name: 'Emerald', theme: { background: '#04140f', surface: '#0a241b', border: '#1f4a3a', accent: '#3ddc97', text: '#eef7f1', muted: '#a8c9b8' } },
  { name: 'Bordeaux', theme: { background: '#16060b', surface: '#260c14', border: '#4d1d2c', accent: '#e8a0b4', text: '#fbeef1', muted: '#d2aab5' } },
  { name: 'Ivory', theme: { background: '#f6f1e8', surface: '#ffffff', border: '#e2d8c6', accent: '#8a5a2b', text: '#1f1a14', muted: '#5f5548' } },
];

export const HEX_RE = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: number[]) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a: string, b: string, weightOfB: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return hex(x.map((v, i) => v + (y[i] - v) * weightOfB));
}

function luminance(color: string) {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function isLightColor(color: string) {
  return luminance(color) > 0.4;
}

/** Full token set (the `--hm-*` CSS variables) derived from the six admin-chosen colours. */
export function themeTokens(input: Partial<EventTheme> | undefined) {
  const t = { ...DEFAULT_THEME, ...input };
  const light = isLightColor(t.background);
  const ink = light ? mix(t.background, '#000000', 0.06) : mix(t.background, '#000000', 0.45);
  const onAccent = contrastRatio(t.accent, '#ffffff') >= contrastRatio(t.accent, '#0b0b0f') ? '#ffffff' : '#0b0b0f';
  return {
    light,
    ink,
    deep: t.background,
    navy: t.surface,
    royal: mix(t.surface, light ? '#000000' : '#ffffff', 0.08),
    line: t.border,
    accent: t.accent,
    accentSoft: light ? mix(t.accent, '#000000', 0.2) : mix(t.accent, '#ffffff', 0.5),
    onAccent,
    cream: t.text,
    mist: t.muted,
    dim: mix(t.muted, t.background, 0.3),
    headingFont: HEADING_FONTS[t.headingFont]?.css ?? '',
    backdrop: t.backdrop,
  };
}

/** QR modules must stay dark on white to scan: use the theme colour only if it is dark enough. */
export function qrInk(e: Pick<EventSiteView, 'theme'>) {
  const t = themeTokens(e.theme);
  return t.light ? '#111111' : t.navy;
}

/** Inline CSS variables for the event page wrapper. */
export function themeStyle(theme: Partial<EventTheme> | undefined): CSSProperties {
  const k = themeTokens(theme);
  return {
    '--hm-ink': k.ink,
    '--hm-deep': k.deep,
    '--hm-navy': k.navy,
    '--hm-royal': k.royal,
    '--hm-line': k.line,
    '--hm-accent': k.accent,
    '--hm-accent-soft': k.accentSoft,
    '--hm-on-accent': k.onAccent,
    '--hm-cream': k.cream,
    '--hm-mist': k.mist,
    '--hm-dim': k.dim,
    ...(k.headingFont ? { '--font-serif': k.headingFont } : {}),
    colorScheme: k.light ? 'light' : 'dark',
  } as CSSProperties;
}

// ─── Add to calendar ─────────────────────────────────────────────────────────

const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function calendarTitle(e: EventSiteView) {
  return e.title.toLowerCase().includes(e.brandName.toLowerCase()) ? e.title : `${e.brandName} — ${e.title}`;
}

export function calendarDetails(e: EventSiteView, links: { pageUrl: string; ticketUrl?: string }) {
  return [
    e.invitationLine || e.tagline,
    links.ticketUrl ? `Your pass (show this QR code at the entrance): ${links.ticketUrl}` : `Details: ${links.pageUrl}`,
    `Directions: ${directionsUrl(e)}`,
    e.contactEmail ? `Enquiries: ${e.contactName} ${e.contactEmail}`.trim() : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function googleCalendarUrl(e: EventSiteView, links: { pageUrl: string; ticketUrl?: string }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarTitle(e),
    dates: `${utcStamp(e.startsAt)}/${utcStamp(e.endsAt)}`,
    details: calendarDetails(e, links),
    location: venueOneLine(e),
    ctz: e.timezone,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(e: EventSiteView, links: { pageUrl: string; ticketUrl?: string }) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: calendarTitle(e),
    startdt: new Date(e.startsAt).toISOString(),
    enddt: new Date(e.endsAt).toISOString(),
    body: calendarDetails(e, links),
    location: venueOneLine(e),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 caps content lines at 75 octets; continuation lines start with a space.
function icsFold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    if (size + len > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function eventIcs(e: EventSiteView, links: { pageUrl: string; ticketUrl?: string }) {
  const title = calendarTitle(e);
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RINWA//Event pages//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      // Stable UID so adding it twice updates the same entry instead of duplicating it.
      `UID:event-${e.id}@rinwahospitality.com`,
      `DTSTAMP:${utcStamp(new Date().toISOString())}`,
      `DTSTART:${utcStamp(e.startsAt)}`,
      `DTEND:${utcStamp(e.endsAt)}`,
      `SUMMARY:${icsEscape(title)}`,
      `LOCATION:${icsEscape(venueOneLine(e))}`,
      `DESCRIPTION:${icsEscape(calendarDetails(e, links))}`,
      `URL:${links.ticketUrl ?? links.pageUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(title)}`,
      'TRIGGER:-PT2H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(icsFold)
      .join('\r\n') + '\r\n'
  );
}
