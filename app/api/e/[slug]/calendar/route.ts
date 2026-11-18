import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EventGuest } from '@/models/EventGuest';
import { eventIcs } from '@/lib/event-site';
import { TOKEN_RE, loadEventSite, pageUrl, ticketUrl } from '@/lib/event-site-server';

export const runtime = 'nodejs';

// Served from a real URL (not a blob) so iPhones open the native "Add to Calendar" sheet.
// With ?t=<token> the entry links to that guest's pass.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEventSite((await params).slug);
  if (!event) return new Response('Event not found', { status: 404 });

  const token = request.nextUrl.searchParams.get('t');
  let guestTicketUrl: string | undefined;
  if (token && TOKEN_RE.test(token)) {
    await connectDB().catch(() => null);
    const isGuest = await EventGuest.exists({ token, eventId: event.id }).catch(() => null);
    if (isGuest) guestTicketUrl = ticketUrl(event, token);
  }

  return new Response(eventIcs(event, { pageUrl: pageUrl(event), ticketUrl: guestTicketUrl }), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
