import { NextRequest, NextResponse } from 'next/server';
import {
  SCANNER_COOKIE,
  checkScannerPasscode,
  createScannerSession,
  isScannerConfigured,
} from '@/lib/hotel-medallion-server';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isScannerConfigured()) {
    return NextResponse.json({ error: 'Scanner access is not configured on the server.' }, { status: 503 });
  }

  // The door passcode is short; cap guesses per IP.
  const limited = await rateLimit(RATE_LIMITS.scannerLogin, rateLimitKey(request.headers));
  if (!limited.ok) return tooManyRequests(limited, 'Too many attempts. Please wait 15 minutes and try again.');

  const body = await request.json().catch(() => ({}));
  const passcode = typeof body?.passcode === 'string' ? body.passcode : '';

  if (!checkScannerPasscode(passcode)) {
    // Slow down guessing without needing a rate-limit store.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const session = createScannerSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SCANNER_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SCANNER_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
