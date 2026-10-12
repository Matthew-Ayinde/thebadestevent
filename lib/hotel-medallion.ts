// Single source of truth for the Hotel Medallion relaunch microsite.
// Safe to import from client components — no secrets here.

export const MEDALLION_EVENT = {
  hotel: 'Hotel Medallion',
  title: 'Relaunch — Wine & Wings Cocktail Party',
  invitationLine: 'You are specially invited to Hotel Medallion’s Relaunch - Wine & Wings cocktail party',
  dateLabel: 'October 30th, 2026',
  timeLabel: '5:00 PM - 10:00 PM',
  // Exact times for "Add to calendar" — keep in sync with timeLabel. Lagos is UTC+1 all year.
  startsAt: '2026-10-30T17:00:00+01:00',
  endsAt: '2026-10-30T22:00:00+01:00',
  venueAddressLines: ['Plot 61, Babatunde Anjous Avenue', 'Off Admiralty Way, Lekki Phase 1', 'Lagos, Nigeria'],
  venueAddress: 'Plot 61, Babatunde Anjous Avenue, Off Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  // What Google Maps searches for — matches the hotel's own listing so the pin lands on the building.
  mapsQuery: 'Hotel Medallion, Plot 61 Babatunde Anjous Avenue, Lekki Phase 1, Lagos, Nigeria',
  logoPath: '/hotel-medallion/logo.png',
  prContactName: 'RINWA',
  prContactEmail: 'info@rinwahospitality.com',
} as const;

// Opens turn-by-turn directions (the Maps app on phones) from wherever the guest is.
export const MEDALLION_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MEDALLION_EVENT.mapsQuery)}`;

// Keyless Google Maps embed for the in-page map.
export const MEDALLION_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(MEDALLION_EVENT.mapsQuery)}&z=16&output=embed`;

export const MEDALLION_BASE_PATH = '/hotel-medallion';

// QR payloads are `HM1:<token>`. The scanner also accepts a full ticket URL or a bare short code.
export const MEDALLION_QR_PREFIX = 'HM1:';

export function medallionQrPayload(token: string) {
  return `${MEDALLION_QR_PREFIX}${token}`;
}

export type CheckInResult =
  | { result: 'admitted' | 'already'; guest: { name: string; code: string; checkedInAt: string } }
  | { result: 'invalid' };

// ─── Add to calendar ─────────────────────────────────────────────────────────

const calendarTitle = `${MEDALLION_EVENT.hotel} ${MEDALLION_EVENT.title}`;
const calendarLocation = `${MEDALLION_EVENT.hotel}, ${MEDALLION_EVENT.venueAddress}`;

/** `2026-10-30T17:00:00+01:00` → `20261030T160000Z` */
export function calendarUtcStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function medallionCalendarDetails(ticketUrl?: string) {
  return [
    MEDALLION_EVENT.invitationLine,
    ticketUrl ? `Your pass (show this QR code at the entrance): ${ticketUrl}` : '',
    `Directions: ${MEDALLION_DIRECTIONS_URL}`,
    `For PR inquiries, contact ${MEDALLION_EVENT.prContactName} ${MEDALLION_EVENT.prContactEmail}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function googleCalendarUrl(ticketUrl?: string) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarTitle,
    dates: `${calendarUtcStamp(MEDALLION_EVENT.startsAt)}/${calendarUtcStamp(MEDALLION_EVENT.endsAt)}`,
    details: medallionCalendarDetails(ticketUrl),
    location: calendarLocation,
    ctz: 'Africa/Lagos',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(ticketUrl?: string) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: calendarTitle,
    startdt: new Date(MEDALLION_EVENT.startsAt).toISOString(),
    enddt: new Date(MEDALLION_EVENT.endsAt).toISOString(),
    body: medallionCalendarDetails(ticketUrl),
    location: calendarLocation,
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 caps content lines at 75 octets; continuation lines start with a space.
function icsFold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
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

export function medallionIcs(ticketUrl?: string) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hotel Medallion//Relaunch RSVP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // Stable UID so adding it twice updates the same event instead of duplicating it.
    'UID:hotel-medallion-relaunch-2026@rinwahospitality.com',
    `DTSTAMP:${calendarUtcStamp(new Date().toISOString())}`,
    `DTSTART:${calendarUtcStamp(MEDALLION_EVENT.startsAt)}`,
    `DTEND:${calendarUtcStamp(MEDALLION_EVENT.endsAt)}`,
    `SUMMARY:${icsEscape(calendarTitle)}`,
    `LOCATION:${icsEscape(calendarLocation)}`,
    `DESCRIPTION:${icsEscape(medallionCalendarDetails(ticketUrl))}`,
    ...(ticketUrl ? [`URL:${ticketUrl}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(calendarTitle)}`,
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
