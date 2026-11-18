import { NextRequest, NextResponse } from 'next/server';

// Legacy URL baked into Hotel Medallion invitation emails already sent — forwards to the event-page endpoint.
export function GET(request: NextRequest) {
  const target = new URL('/api/e/hotel-medallion/calendar', request.url);
  const token = request.nextUrl.searchParams.get('t');
  if (token) target.searchParams.set('t', token);
  return NextResponse.redirect(target, 308);
}
