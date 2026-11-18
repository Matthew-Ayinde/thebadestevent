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
    const [registered, checkedIn, recent] = await Promise.all([
      EventGuest.countDocuments({ eventId: event.id }),
      EventGuest.countDocuments({ eventId: event.id, checkedInAt: { $ne: null } }),
      EventGuest.find({ eventId: event.id, checkedInAt: { $ne: null } })
        .sort({ checkedInAt: -1 })
        .limit(8)
        .select('firstName lastName code checkedInAt')
        .lean(),
    ]);

    return NextResponse.json({
      registered,
      checkedIn,
      recent: recent.map((g) => ({ name: `${g.firstName} ${g.lastName}`, code: g.code, checkedInAt: g.checkedInAt })),
    });
  } catch (error) {
    console.error(`Stats error (${event.slug}):`, error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
