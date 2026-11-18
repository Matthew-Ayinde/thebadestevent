import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EventGuest } from '@/models/EventGuest';
import { loadEventSite, hasScannerSession, parseScanPayload } from '@/lib/event-site-server';
import type { CheckInResult } from '@/lib/event-site';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEventSite((await params).slug);
  if (!event || !(await hasScannerSession(event.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const lookup = typeof body?.payload === 'string' ? parseScanPayload(body.payload) : null;
    if (!lookup) return NextResponse.json({ result: 'invalid' } satisfies CheckInResult);

    await connectDB();
    // Scoped to this event: a pass for another event is "not on the guest list" here.
    const filter = { ...lookup, eventId: event.id };

    // Atomic first-entry transition: only one scan can ever flip checkedInAt from null.
    const admitted = await EventGuest.findOneAndUpdate(
      { ...filter, checkedInAt: null },
      { $set: { checkedInAt: new Date() } },
      { new: true }
    );
    const guest = admitted ?? (await EventGuest.findOne(filter));
    if (!guest) return NextResponse.json({ result: 'invalid' } satisfies CheckInResult);

    return NextResponse.json({
      result: admitted ? 'admitted' : 'already',
      guest: {
        name: `${guest.firstName} ${guest.lastName}`,
        code: guest.code,
        checkedInAt: (guest.checkedInAt ?? new Date()).toISOString(),
      },
    } satisfies CheckInResult);
  } catch (error) {
    console.error(`Check-in error (${event.slug}):`, error);
    return NextResponse.json({ error: 'Check-in failed. Try again.' }, { status: 500 });
  }
}
