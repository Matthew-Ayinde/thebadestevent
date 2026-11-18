// Server-only (DB, crypto, email). Also imported by the ops scripts under /scripts.
import { cache } from 'react';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import bcryptjs from 'bcryptjs';
import QRCode from 'qrcode';
import type { Document as MongooseDocument } from 'mongoose';
import { Resend } from 'resend';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { EventSite, type IEventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import {
  DEFAULT_THEME,
  LEGACY_QR_PREFIXES,
  QR_PREFIX,
  SLUG_RE,
  directionsUrl,
  eventPath,
  formatEventWhen,
  googleCalendarUrl,
  outlookCalendarUrl,
  qrInk,
  qrPayload,
  themeTokens,
  type EventSiteView,
} from '@/lib/event-site';
import { escapeHtml } from '@/lib/email';
import { MEDALLION_EMAIL_LOGO_PNG_BASE64 } from '@/lib/hotel-medallion-email-logo';

// ─── Loading ─────────────────────────────────────────────────────────────────

type EventDoc = Partial<Omit<IEventSite, keyof MongooseDocument>> & { _id: unknown };

export function toEventView(doc: EventDoc, scannerEnabled = false): EventSiteView {
  const theme = { ...DEFAULT_THEME, ...(doc.theme ?? {}) };
  return {
    id: String(doc._id),
    slug: doc.slug ?? '',
    isPublished: Boolean(doc.isPublished),
    brandName: doc.brandName ?? '',
    brandEyebrow: doc.brandEyebrow ?? '',
    brandWordmark: doc.brandWordmark || doc.brandName || '',
    logoUrl: doc.logoUrl ?? '',
    title: doc.title ?? '',
    eyebrow: doc.eyebrow ?? '',
    headline: doc.headline || doc.title || '',
    tagline: doc.tagline ?? '',
    invitationLine: doc.invitationLine ?? '',
    description: doc.description ?? '',
    recapMessage: doc.recapMessage ?? '',
    coverImageUrl: doc.coverImageUrl ?? '',
    startsAt: new Date(doc.startsAt ?? Date.now()).toISOString(),
    endsAt: new Date(doc.endsAt ?? Date.now()).toISOString(),
    timezone: doc.timezone || 'Africa/Lagos',
    venueName: doc.venueName ?? '',
    venueAddressLines: doc.venueAddressLines ?? [],
    mapsQuery: doc.mapsQuery ?? '',
    dressCode: doc.dressCode ?? '',
    contactName: doc.contactName ?? '',
    contactEmail: doc.contactEmail ?? '',
    rsvpMode: doc.rsvpMode ?? 'builtin',
    rsvpUrl: doc.rsvpUrl ?? '',
    codePrefix: doc.codePrefix || 'EV',
    scannerEnabled: scannerEnabled || Boolean(doc.scannerPasscodeHash),
    theme: {
      background: theme.background,
      surface: theme.surface,
      border: theme.border,
      accent: theme.accent,
      text: theme.text,
      muted: theme.muted,
      headingFont: theme.headingFont,
      backdrop: theme.backdrop,
    },
  };
}

export async function isAdminSession() {
  try {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session.user as { role?: string }).role === 'admin');
  } catch {
    return false;
  }
}

/**
 * The event behind /{slug}, published or not. Use for things guests already hold — tickets,
 * calendar files, the door scanner — which must keep working after an event is unpublished.
 * Cached per request so layout, page and metadata share one query. Database errors propagate
 * (500) rather than reading as "not found" — a blip at the door must not 404 the scanner.
 */
export const loadEventSite = cache(async (slug: string): Promise<EventSiteView | null> => {
  if (!SLUG_RE.test(slug)) return null;
  await connectDB();
  const doc = await EventSite.findOne({ slug }).select('+scannerPasscodeHash').lean<EventDoc | null>();
  return doc ? toEventView(doc) : null;
});

/** The public face of /{slug}: published events for everyone, drafts only for a signed-in admin (preview). */
export const getEventSite = cache(async (slug: string): Promise<EventSiteView | null> => {
  const event = await loadEventSite(slug);
  if (!event) return null;
  if (!event.isPublished && !(await isAdminSession())) return null;
  return event;
});

/** Other events from the same brand, for "What's next" / "Past evenings". Never throws. */
export async function getMoreFromBrand(event: EventSiteView) {
  try {
    await connectDB();
    const base = { isPublished: true, brandName: event.brandName, slug: { $ne: event.slug } };
    const now = new Date();
    const [upcoming, past] = await Promise.all([
      EventSite.find({ ...base, endsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(6).lean<EventDoc[]>(),
      EventSite.find({ ...base, endsAt: { $lte: now } }).sort({ startsAt: -1 }).limit(6).lean<EventDoc[]>(),
    ]);
    return { upcoming: upcoming.map((d) => toEventView(d)), past: past.map((d) => toEventView(d)) };
  } catch (error) {
    console.error('Event page: failed to load related events', error);
    return { upcoming: [], past: [] };
  }
}

/** Attendance for the recap. `null` when the DB is unreachable. */
export async function getAttendance(eventId: string): Promise<{ registered: number; attended: number } | null> {
  try {
    await connectDB();
    const [registered, attended] = await Promise.all([
      EventGuest.countDocuments({ eventId }),
      EventGuest.countDocuments({ eventId, checkedInAt: { $ne: null } }),
    ]);
    return { registered, attended };
  } catch (error) {
    console.error('Event page: failed to load attendance', error);
    return null;
  }
}

// ─── Ticket identifiers ──────────────────────────────────────────────────────

export function generateTicketToken() {
  return randomBytes(16).toString('base64url');
}

// No 0/O/1/I/L so codes survive being read aloud or typed at the door.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateTicketCode(prefix: string) {
  const pick = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `${prefix}-${pick()}-${pick()}`;
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const CODE_RE = /^([A-Z0-9]{1,4})-?([2-9A-HJKMNP-Z]{4})-?([2-9A-HJKMNP-Z]{4})$/;

/** Accepts a QR payload (`EV1:`/`HM1:<token>`), a ticket URL, or a typed short code. */
export function parseScanPayload(raw: string): { token: string } | { code: string } | null {
  const value = raw.trim();
  for (const prefix of [QR_PREFIX, ...LEGACY_QR_PREFIXES]) {
    if (value.startsWith(prefix)) {
      const token = value.slice(prefix.length);
      return TOKEN_RE.test(token) ? { token } : null;
    }
  }
  const urlMatch = value.match(/\/[a-z0-9-]+\/ticket\/([A-Za-z0-9_-]{22})(?:[/?#]|$)/);
  if (urlMatch) return { token: urlMatch[1] };
  const codeMatch = value.toUpperCase().replace(/\s+/g, '').match(CODE_RE);
  if (codeMatch) return { code: `${codeMatch[1]}-${codeMatch[2]}-${codeMatch[3]}` };
  return null;
}

// ─── Door-staff session (one per event) ──────────────────────────────────────

const SCANNER_SESSION_MS = 12 * 60 * 60 * 1000;

export function scannerCookieName(eventId: string) {
  return `es_scan_${eventId}`;
}

async function scannerSecret(eventId: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  await connectDB();
  const doc = await EventSite.findById(eventId).select('+scannerPasscodeHash').lean<EventDoc | null>();
  if (!doc?.scannerPasscodeHash) return null;
  // Folding the hash in means changing the passcode signs every door device out.
  return `${secret}:${eventId}:${doc.scannerPasscodeHash}`;
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function checkScannerPasscode(eventId: string, input: string) {
  await connectDB();
  const doc = await EventSite.findById(eventId).select('+scannerPasscodeHash').lean<EventDoc | null>();
  if (!doc?.scannerPasscodeHash || !input) return false;
  return bcryptjs.compare(input, doc.scannerPasscodeHash);
}

export async function createScannerSession(eventId: string) {
  const secret = await scannerSecret(eventId);
  if (!secret) throw new Error('Scanner is not configured');
  const expires = Date.now() + SCANNER_SESSION_MS;
  return { value: `${expires}.${sign(String(expires), secret)}`, maxAge: SCANNER_SESSION_MS / 1000 };
}

export async function hasScannerSession(eventId: string) {
  const raw = (await cookies()).get(scannerCookieName(eventId))?.value;
  if (!raw) return false;
  const [expires, signature] = raw.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const secret = await scannerSecret(eventId);
  return Boolean(secret) && safeEqual(signature, sign(expires, secret!));
}

// ─── URLs, QR, email ─────────────────────────────────────────────────────────

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function pageUrl(event: Pick<EventSiteView, 'slug'>) {
  return `${siteUrl()}${eventPath(event)}`;
}

export function ticketUrl(event: Pick<EventSiteView, 'slug'>, token: string) {
  return `${siteUrl()}${eventPath(event, `/ticket/${token}`)}`;
}

export function ticketQrSvg(token: string, dark: string) {
  return QRCode.toString(qrPayload(token), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark, light: '#ffffff' },
  });
}

function ticketQrPng(token: string, dark: string) {
  return QRCode.toBuffer(qrPayload(token), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
    color: { dark, light: '#ffffff' },
  });
}

function calendarLinks(event: EventSiteView, token: string) {
  const links = { pageUrl: pageUrl(event), ticketUrl: ticketUrl(event, token) };
  return [
    { label: 'Apple / iPhone', href: `${siteUrl()}/api/e/${event.slug}/calendar?t=${encodeURIComponent(token)}` },
    { label: 'Google', href: googleCalendarUrl(event, links) },
    { label: 'Outlook', href: outlookCalendarUrl(event, links) },
  ];
}

const LEGACY_MEDALLION_LOGO = '/hotel-medallion/logo.png';

function absoluteUrl(url: string) {
  return url.startsWith('/') ? `${siteUrl()}${url}` : url;
}

export type InvitationGuest = { firstName: string; lastName: string; email: string; token: string; code: string };

function reminderLine(event: EventSiteView) {
  return `A reminder: ${event.title} is today. We look forward to welcoming you.`;
}

function invitationLine(event: EventSiteView) {
  return event.invitationLine || `You are invited to ${event.title} by ${event.brandName}.`;
}

function buildInvitationHtml(event: EventSiteView, guest: InvitationGuest, reminder: boolean, logoSrc: string) {
  const k = themeTokens(event.theme);
  const name = escapeHtml(`${guest.firstName} ${guest.lastName}`);
  const when = escapeHtml(formatEventWhen(event));
  const link = escapeHtml(ticketUrl(event, guest.token));
  const directions = escapeHtml(directionsUrl(event));
  const address = [event.venueName, ...event.venueAddressLines].filter(Boolean).map(escapeHtml).join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${k.light ? 'light' : 'dark'}"><title>Your invitation</title></head>
<body style="margin:0;padding:0;background:${k.deep};font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${k.deep};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${k.navy};border:1px solid ${k.line};border-radius:20px;">
        <tr><td align="center" style="padding:40px 32px 8px;">
          ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" width="72" height="72" alt="${escapeHtml(event.brandName)}" style="display:block;width:72px;height:72px;border:0;margin:0 auto 16px;object-fit:contain;">` : ''}
          ${event.brandEyebrow ? `<div style="font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${k.accent};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(event.brandEyebrow)}</div>` : ''}
          <div style="font-size:30px;letter-spacing:0.16em;text-transform:uppercase;color:${k.cream};margin-top:6px;">${escapeHtml(event.brandWordmark)}</div>
          <div style="width:48px;height:1px;background:${k.accent};margin:20px auto 0;"></div>
        </td></tr>
        <tr><td align="center" style="padding:24px 36px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:${k.mist};font-family:Arial,Helvetica,sans-serif;">Dear ${name},</p>
          <p style="margin:0;font-size:22px;line-height:1.45;color:${k.cream};">${escapeHtml(reminder ? reminderLine(event) : invitationLine(event))}</p>
        </td></tr>
        <tr><td align="center" style="padding:22px 36px 0;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:15px;font-weight:bold;letter-spacing:0.06em;color:${k.accent};">${when}</p>
          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;"><a href="${directions}" style="color:${k.mist};text-decoration:underline;">${address}</a></p>
          <p style="margin:10px 0 0;font-size:13px;"><a href="${directions}" style="color:${k.accent};font-weight:bold;text-decoration:none;">Get directions &rarr;</a></p>
        </td></tr>
        <tr><td align="center" style="padding:28px 36px 0;">
          <table cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
            <tr><td style="padding:14px;">
              <img src="cid:event-qr" width="220" height="220" alt="Your entry QR code" style="display:block;width:220px;height:220px;border:0;">
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:12px;letter-spacing:0.24em;color:${k.mist};font-family:'Courier New',monospace;">${escapeHtml(guest.code)}</p>
          <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:${k.dim};font-family:Arial,Helvetica,sans-serif;">Present this QR code at the entrance. It admits one guest.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 36px 0;">
          <a href="${link}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:${k.accent};color:${k.onAccent};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.08em;text-decoration:none;">View your ticket</a>
        </td></tr>
        <tr><td align="center" style="padding:22px 36px 0;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:${k.mist};">Add to your calendar</p>
          <p style="margin:0;font-size:13px;line-height:1.8;">${calendarLinks(event, guest.token)
            .map((c) => `<a href="${escapeHtml(c.href)}" style="color:${k.accent};font-weight:bold;text-decoration:none;">${escapeHtml(c.label)}</a>`)
            .join(`<span style="color:${k.line};">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`)}</p>
        </td></tr>
        <tr><td align="center" style="padding:32px 36px 36px;">
          <div style="height:1px;background:${k.line};margin-bottom:20px;"></div>
          ${event.contactEmail ? `<p style="margin:0;font-size:12px;line-height:1.7;color:${k.dim};font-family:Arial,Helvetica,sans-serif;">For enquiries, contact ${escapeHtml(event.contactName)} <a href="mailto:${escapeHtml(event.contactEmail)}" style="color:${k.accent};text-decoration:none;">${escapeHtml(event.contactEmail)}</a></p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildInvitationText(event: EventSiteView, guest: InvitationGuest, reminder: boolean) {
  return [
    `Dear ${guest.firstName} ${guest.lastName},`,
    '',
    reminder ? reminderLine(event) : invitationLine(event),
    formatEventWhen(event),
    [event.venueName, ...event.venueAddressLines].filter(Boolean).join(', '),
    `Directions: ${directionsUrl(event)}`,
    '',
    `Your entry code: ${guest.code}`,
    `Your QR ticket: ${ticketUrl(event, guest.token)}`,
    '',
    'Add to your calendar:',
    ...calendarLinks(event, guest.token).map((c) => `${c.label}: ${c.href}`),
    ...(event.contactEmail ? ['', `For enquiries, contact ${event.contactName} ${event.contactEmail}`.trim()] : []),
  ].join('\n');
}

/** Sends the invitation (or day-of reminder) to the guest only — never copied to an admin inbox. */
export async function sendInvitation(
  event: EventSiteView,
  guest: InvitationGuest,
  options: { reminder?: boolean; scheduledAt?: string } = {}
): Promise<{ sent: boolean; error?: string }> {
  const { reminder = false, scheduledAt } = options;
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EVENT_EMAIL_FROM || process.env.MEDALLION_EMAIL_FROM || process.env.RESEND_FROM;
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY is not configured' };
  if (!sender) return { sent: false, error: 'RESEND_FROM is not configured' };
  // Keep the configured (verified) address but show the event's brand as the sender name.
  const address = sender.match(/<([^>]+)>/)?.[1] ?? sender.trim();
  // Quoted so brand names with commas, colons, dots etc. still form a valid From header.
  const displayName = event.brandName.replace(/["\\<>\r\n]/g, '').trim();
  const from = displayName ? `"${displayName}" <${address}>` : address;

  try {
    const qr = await ticketQrPng(guest.token, qrInk(event));
    // The original Medallion logo ships embedded so it shows even when mail clients block remote images.
    const embedLogo = event.logoUrl === LEGACY_MEDALLION_LOGO;
    const logoSrc = embedLogo ? 'cid:event-logo' : event.logoUrl ? absoluteUrl(event.logoUrl) : '';
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: guest.email,
      ...(event.contactEmail ? { replyTo: event.contactEmail } : {}),
      subject: reminder
        ? `Today — ${event.title}, ${formatEventWhen(event).split(' · ')[1] ?? ''}`.trim()
        : `Your invitation — ${event.title}, ${formatEventWhen(event).split(' · ')[0]}`,
      html: buildInvitationHtml(event, guest, reminder, logoSrc),
      text: buildInvitationText(event, guest, reminder),
      scheduledAt,
      attachments: [
        { filename: `${event.slug}-${guest.code}.png`, content: qr, contentId: 'event-qr' },
        ...(embedLogo
          ? [{ filename: 'logo.png', content: Buffer.from(MEDALLION_EMAIL_LOGO_PNG_BASE64, 'base64'), contentId: 'event-logo' }]
          : []),
      ],
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}
