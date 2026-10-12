import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import { MEDALLION_BASE_PATH, MEDALLION_DIRECTIONS_URL, MEDALLION_EVENT, MEDALLION_QR_PREFIX, medallionQrPayload } from '@/lib/hotel-medallion';

// ─── Ticket identifiers ──────────────────────────────────────────────────────

export function generateTicketToken() {
  return randomBytes(16).toString('base64url');
}

// No 0/O/1/I/L so codes survive being read aloud or typed at the door.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateTicketCode() {
  const pick = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `HM-${pick()}-${pick()}`;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const CODE_RE = /^HM-?([2-9A-HJKMNP-Z]{4})-?([2-9A-HJKMNP-Z]{4})$/;

/** Accepts a QR payload (`HM1:<token>`), a ticket URL, or a typed short code. */
export function parseScanPayload(raw: string): { token: string } | { code: string } | null {
  const value = raw.trim();
  if (value.startsWith(MEDALLION_QR_PREFIX)) {
    const token = value.slice(MEDALLION_QR_PREFIX.length);
    return TOKEN_RE.test(token) ? { token } : null;
  }
  const urlMatch = value.match(/\/hotel-medallion\/ticket\/([A-Za-z0-9_-]{22})(?:[/?#]|$)/);
  if (urlMatch) return { token: urlMatch[1] };
  const codeMatch = value.toUpperCase().replace(/\s+/g, '').match(CODE_RE);
  if (codeMatch) return { code: `HM-${codeMatch[1]}-${codeMatch[2]}` };
  return null;
}

// ─── Door-staff session ──────────────────────────────────────────────────────

export const SCANNER_COOKIE = 'hm_scanner';
const SCANNER_SESSION_MS = 12 * 60 * 60 * 1000;

function scannerSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  const passcode = process.env.MEDALLION_SCANNER_PASSCODE;
  if (!secret || !passcode) return null;
  // Folding the passcode in means rotating it signs every door device out.
  return `${secret}:${passcode}`;
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isScannerConfigured() {
  return scannerSecret() !== null;
}

export function checkScannerPasscode(input: string) {
  const passcode = process.env.MEDALLION_SCANNER_PASSCODE;
  if (!passcode) return false;
  // Compare digests so the length of the real passcode isn't leaked by timing.
  const digest = (v: string) => createHmac('sha256', 'hm-passcode').update(v).digest('hex');
  return safeEqual(digest(input), digest(passcode));
}

export function createScannerSession() {
  const secret = scannerSecret();
  if (!secret) throw new Error('Scanner is not configured');
  const expires = Date.now() + SCANNER_SESSION_MS;
  return { value: `${expires}.${sign(String(expires), secret)}`, maxAge: SCANNER_SESSION_MS / 1000 };
}

export async function hasScannerSession() {
  const secret = scannerSecret();
  if (!secret) return false;
  const raw = (await cookies()).get(SCANNER_COOKIE)?.value;
  if (!raw) return false;
  const [expires, signature] = raw.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires, secret));
}

// ─── QR + email ──────────────────────────────────────────────────────────────

export function ticketQrSvg(token: string) {
  return QRCode.toString(medallionQrPayload(token), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#0a1a3f', light: '#ffffff' },
  });
}

function ticketQrPng(token: string) {
  return QRCode.toBuffer(medallionQrPayload(token), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
    color: { dark: '#0a1a3f', light: '#ffffff' },
  });
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function ticketUrl(token: string) {
  return `${siteUrl()}${MEDALLION_BASE_PATH}/ticket/${token}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type InvitationGuest = { firstName: string; lastName: string; email: string; token: string; code: string };

function buildInvitationHtml(guest: InvitationGuest) {
  const e = MEDALLION_EVENT;
  const name = escapeHtml(`${guest.firstName} ${guest.lastName}`);
  const when = escapeHtml(e.timeLabel ? `${e.dateLabel} · ${e.timeLabel}` : e.dateLabel);
  const link = escapeHtml(ticketUrl(guest.token));

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Your invitation</title></head>
<body style="margin:0;padding:0;background:#06102a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06102a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a1a3f;border:1px solid #23396e;border-radius:20px;">
        <tr><td align="center" style="padding:40px 32px 8px;">
          <img src="${escapeHtml(siteUrl() + e.logoPath)}" width="72" height="72" alt="${escapeHtml(e.hotel)}" style="display:block;width:72px;height:72px;border:0;margin:0 auto 16px;">
          <div style="font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:#00aef1;font-family:Arial,Helvetica,sans-serif;">Hotel</div>
          <div style="font-size:30px;letter-spacing:0.16em;text-transform:uppercase;color:#f3efe4;margin-top:6px;">Medallion</div>
          <div style="width:48px;height:1px;background:#00aef1;margin:20px auto 0;"></div>
        </td></tr>
        <tr><td align="center" style="padding:24px 36px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:#a9b8dc;font-family:Arial,Helvetica,sans-serif;">Dear ${name},</p>
          <p style="margin:0;font-size:22px;line-height:1.45;color:#f3efe4;">${escapeHtml(e.invitationLine)}</p>
        </td></tr>
        <tr><td align="center" style="padding:22px 36px 0;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:15px;font-weight:bold;letter-spacing:0.06em;color:#00aef1;">${when}</p>
          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;"><a href="${escapeHtml(MEDALLION_DIRECTIONS_URL)}" style="color:#c9d3ec;text-decoration:underline;text-decoration-color:#2f6fa8;">${e.venueAddressLines.map(escapeHtml).join('<br>')}</a></p>
          <p style="margin:10px 0 0;font-size:13px;"><a href="${escapeHtml(MEDALLION_DIRECTIONS_URL)}" style="color:#00aef1;font-weight:bold;text-decoration:none;">Get directions &rarr;</a></p>
        </td></tr>
        <tr><td align="center" style="padding:28px 36px 0;">
          <table cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
            <tr><td style="padding:14px;">
              <img src="cid:medallion-qr" width="220" height="220" alt="Your entry QR code" style="display:block;width:220px;height:220px;border:0;">
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:12px;letter-spacing:0.24em;color:#a9b8dc;font-family:'Courier New',monospace;">${escapeHtml(guest.code)}</p>
          <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#8193bd;font-family:Arial,Helvetica,sans-serif;">Present this QR code at the entrance. It admits one guest.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 36px 0;">
          <a href="${link}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#00aef1;color:#0a1a3f;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.08em;text-decoration:none;">View your ticket</a>
        </td></tr>
        <tr><td align="center" style="padding:32px 36px 36px;">
          <div style="height:1px;background:#23396e;margin-bottom:20px;"></div>
          <p style="margin:0;font-size:12px;line-height:1.7;color:#8193bd;font-family:Arial,Helvetica,sans-serif;">For PR inquiries, contact ${escapeHtml(e.prContactName)} <a href="mailto:${escapeHtml(e.prContactEmail)}" style="color:#00aef1;text-decoration:none;">${escapeHtml(e.prContactEmail)}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildInvitationText(guest: InvitationGuest) {
  const e = MEDALLION_EVENT;
  return [
    `Dear ${guest.firstName} ${guest.lastName},`,
    '',
    e.invitationLine,
    e.timeLabel ? `${e.dateLabel} · ${e.timeLabel}` : e.dateLabel,
    e.venueAddress,
    `Directions: ${MEDALLION_DIRECTIONS_URL}`,
    '',
    `Your entry code: ${guest.code}`,
    `Your QR ticket: ${ticketUrl(guest.token)}`,
    '',
    `For PR inquiries, contact ${e.prContactName} ${e.prContactEmail}`,
  ].join('\n');
}

/** Sends the invitation to the guest only — never copied to an admin inbox. */
export async function sendMedallionInvitation(guest: InvitationGuest): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MEDALLION_EMAIL_FROM || process.env.RESEND_FROM;
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY is not configured' };
  if (!from) return { sent: false, error: 'RESEND_FROM is not configured' };

  try {
    const qr = await ticketQrPng(guest.token);
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: guest.email,
      replyTo: MEDALLION_EVENT.prContactEmail,
      subject: `Your invitation — ${MEDALLION_EVENT.hotel} Relaunch, ${MEDALLION_EVENT.dateLabel}`,
      html: buildInvitationHtml(guest),
      text: buildInvitationText(guest),
      attachments: [
        { filename: `hotel-medallion-${guest.code}.png`, content: qr, contentId: 'medallion-qr' },
      ],
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}
