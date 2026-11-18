import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EventGuest } from '@/models/EventGuest';
import { loadEventSite, hasScannerSession } from '@/lib/event-site-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEventSite((await params).slug);
  if (!event || !(await hasScannerSession(event.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const guests = await EventGuest.find({ eventId: event.id })
      .sort({ createdAt: -1 })
      .limit(20000)
      .select('firstName lastName email code createdAt checkedInAt emailSentAt')
      .lean();

    return NextResponse.json({
      guests: guests.map((g) => ({
        id: String(g._id),
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        code: g.code,
        registeredAt: g.createdAt,
        checkedInAt: g.checkedInAt ?? null,
        // Lets staff spot guests whose invitation never arrived.
        emailDelivered: Boolean(g.emailSentAt),
      })),
    });
  } catch (error) {
    console.error(`Guest list error (${event.slug}):`, error);
    return NextResponse.json({ error: 'Failed to load guests' }, { status: 500 });
  }
}
