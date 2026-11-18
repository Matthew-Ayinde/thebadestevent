import { NextRequest } from 'next/server';
import { eventIcs } from '@/lib/hotel-medallion-events';
import { getPublishedMedallionEvent } from '@/lib/hotel-medallion-events-server';
import { MEDALLION_BASE_PATH } from '@/lib/hotel-medallion';

export const runtime = 'nodejs';

// Served from a real URL (not a blob) so iPhones open the native "Add to Calendar" sheet.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('e') ?? '';
  const event = await getPublishedMedallionEvent(slug);
  if (!event) return new Response('Event not found', { status: 404 });

  const pageUrl = `${request.nextUrl.origin}${MEDALLION_BASE_PATH}/events/${event.slug}`;
  return new Response(eventIcs(event, pageUrl), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="hotel-medallion-${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
