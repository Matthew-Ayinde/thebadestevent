import { NextRequest } from 'next/server';
import { medallionIcs } from '@/lib/hotel-medallion';
import { ticketUrl } from '@/lib/hotel-medallion-server';

export const runtime = 'nodejs';

// Served from a real URL (not a client-side blob) so iPhones open the native "Add to Calendar" sheet.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  const link = token && /^[A-Za-z0-9_-]{22}$/.test(token) ? ticketUrl(token) : undefined;

  return new Response(medallionIcs(link), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hotel-medallion-relaunch.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
}
