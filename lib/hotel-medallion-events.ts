// Shared helpers for admin-managed Hotel Medallion events (upcoming programme).
// Client-safe: no DB access or secrets here.

import { MEDALLION_EVENT } from '@/lib/hotel-medallion';

export const MEDALLION_TIMEZONE = 'Africa/Lagos';
// Lagos has no DST, so a fixed offset is exact all year.
const LAGOS_OFFSET = '+01:00';

/** Plain, serialisable shape passed from server components to the UI. */
export type MedallionEventView = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  venueName: string;
  venueAddress: string;
  imageUrl: string;
  rsvpUrl: string;
  dressCode: string;
  isPublished: boolean;
};

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** `2026-12-12T19:00` (wall-clock Lagos time from a datetime-local input) → Date. */
export function fromLagosLocal(local: string) {
  return new Date(`${local}${local.length === 16 ? ':00' : ''}${LAGOS_OFFSET}`);
}

/** Date/ISO → `2026-12-12T19:00` in Lagos wall-clock time, for datetime-local inputs. */
export function toLagosLocal(value: string | Date) {
  const shifted = new Date(new Date(value).getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: MEDALLION_TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: MEDALLION_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
});
const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: MEDALLION_TIMEZONE,
  day: '2-digit',
  month: 'short',
  weekday: 'short',
});

export function formatEventDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

export function formatEventTime(startIso: string, endIso: string) {
  return `${timeFmt.format(new Date(startIso))} – ${timeFmt.format(new Date(endIso))}`;
}

/** Day / month / weekday pieces for the calendar-leaf date badge. */
export function eventDateParts(iso: string) {
  const parts = partsFmt.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: get('day'), month: get('month').toUpperCase(), weekday: get('weekday') };
}

/** Whole calendar days (Lagos) between now and the event start. */
export function daysUntil(iso: string, now: Date = new Date()) {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: MEDALLION_TIMEZONE }).format(d);
  const a = Date.parse(key(now));
  const b = Date.parse(key(new Date(iso)));
  return Math.round((b - a) / 86_400_000);
}

export function relativeDayLabel(iso: string, now: Date = new Date()) {
  const d = daysUntil(iso, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 7) return `In ${d} days`;
  if (d < 14) return 'Next week';
  if (d < 60) return `In ${Math.round(d / 7)} weeks`;
  return `In ${Math.round(d / 30)} months`;
}

export function eventStatus(e: Pick<MedallionEventView, 'startsAt' | 'endsAt'>, now: Date = new Date()) {
  const t = now.getTime();
  if (t >= new Date(e.endsAt).getTime()) return 'past' as const;
  if (t >= new Date(e.startsAt).getTime()) return 'live' as const;
  return 'upcoming' as const;
}

export function isDefaultVenue(e: Pick<MedallionEventView, 'venueAddress'>) {
  return !e.venueAddress || e.venueAddress === MEDALLION_EVENT.venueAddress;
}

export function eventDirectionsUrl(e: Pick<MedallionEventView, 'venueName' | 'venueAddress'>) {
  const q = isDefaultVenue(e) ? MEDALLION_EVENT.mapsQuery : `${e.venueName}, ${e.venueAddress}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function eventMapEmbedUrl(e: Pick<MedallionEventView, 'venueName' | 'venueAddress'>) {
  const q = isDefaultVenue(e) ? MEDALLION_EVENT.mapsQuery : `${e.venueName}, ${e.venueAddress}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

// ─── Add to calendar ─────────────────────────────────────────────────────────

const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function calendarDetails(e: MedallionEventView, pageUrl: string) {
  return [e.tagline, e.description, `Details: ${pageUrl}`, `Directions: ${eventDirectionsUrl(e)}`]
    .filter(Boolean)
    .join('\n\n');
}

export function eventGoogleCalendarUrl(e: MedallionEventView, pageUrl: string) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${e.title} · ${MEDALLION_EVENT.hotel}`,
    dates: `${utcStamp(e.startsAt)}/${utcStamp(e.endsAt)}`,
    details: calendarDetails(e, pageUrl),
    location: `${e.venueName}, ${e.venueAddress}`,
    ctz: MEDALLION_TIMEZONE,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function eventOutlookCalendarUrl(e: MedallionEventView, pageUrl: string) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `${e.title} · ${MEDALLION_EVENT.hotel}`,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: new Date(e.endsAt).toISOString(),
    body: calendarDetails(e, pageUrl),
    location: `${e.venueName}, ${e.venueAddress}`,
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

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

export function eventIcs(e: MedallionEventView, pageUrl: string) {
  const summary = `${e.title} · ${MEDALLION_EVENT.hotel}`;
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hotel Medallion//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:hotel-medallion-${e.id}@rinwahospitality.com`,
      `DTSTAMP:${utcStamp(new Date().toISOString())}`,
      `DTSTART:${utcStamp(e.startsAt)}`,
      `DTEND:${utcStamp(e.endsAt)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape(`${e.venueName}, ${e.venueAddress}`)}`,
      `DESCRIPTION:${icsEscape(calendarDetails(e, pageUrl))}`,
      `URL:${pageUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(summary)}`,
      'TRIGGER:-PT2H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(icsFold)
      .join('\r\n') + '\r\n'
  );
}
