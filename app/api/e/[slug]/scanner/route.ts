import { NextRequest, NextResponse } from 'next/server';
import {
  checkScannerPasscode,
  createScannerSession,
  loadEventSite,
  scannerCookieName,
} from '@/lib/event-site-server';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ slug: string }> };

/** Door-staff sign-in with the event's passcode. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const event = await loadEventSite((await params).slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!event.scannerEnabled || !process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'The door scanner isn’t set up for this event.' }, { status: 503 });
  }

  // Door passcodes are short; cap guesses per IP and event.
  const limited = await rateLimit(RATE_LIMITS.scannerLogin, `${event.id}:${rateLimitKey(request.headers)}`);
  if (!limited.ok) return tooManyRequests(limited, 'Too many attempts. Please wait 15 minutes and try again.');

  const body = await request.json().catch(() => ({}));
  const passcode = typeof body?.passcode === 'string' ? body.passcode.slice(0, 200) : '';

  if (!(await checkScannerPasscode(event.id, passcode))) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const session = await createScannerSession(event.id);
  const response = NextResponse.json({ success: true });
  response.cookies.set(scannerCookieName(event.id), session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge,
  });
  return response;
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const event = await loadEventSite((await params).slug);
  const response = NextResponse.json({ success: true });
  if (event) response.cookies.set(scannerCookieName(event.id), '', { path: '/', maxAge: 0 });
  return response;
}
