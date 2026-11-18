import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { EventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import { EventSiteInput } from '@/lib/event-site-input';
import { isAdminSession, toEventView } from '@/lib/event-site-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin list — every event page with RSVP / check-in counts, latest start first. */
export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const [docs, counts] = await Promise.all([
      EventSite.find().select('+scannerPasscodeHash').sort({ startsAt: -1 }).limit(500).lean(),
      EventGuest.aggregate<{ _id: unknown; registered: number; checkedIn: number }>([
        {
          $group: {
            _id: '$eventId',
            registered: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $ifNull: ['$checkedInAt', false] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const byEvent = new Map(counts.map((c) => [String(c._id), c]));
    return NextResponse.json(
      docs.map((d) => ({
        ...toEventView(d),
        registered: byEvent.get(String(d._id))?.registered ?? 0,
        checkedIn: byEvent.get(String(d._id))?.checkedIn ?? 0,
      }))
    );
  } catch (error) {
    console.error('Event pages list error:', error);
    return NextResponse.json({ error: 'Failed to load event pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { fields, scannerPasscode } = EventSiteInput.parse(await request.json());
    await connectDB();
    if (await EventSite.exists({ slug: fields.slug })) {
      return NextResponse.json({ error: `/${fields.slug} is already used by another event` }, { status: 409 });
    }
    const doc = await EventSite.create({
      ...fields,
      scannerPasscodeHash: scannerPasscode ? await bcryptjs.hash(scannerPasscode, 10) : null,
    });
    return NextResponse.json(toEventView(doc.toObject()), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'That URL is already used by another event' }, { status: 409 });
    }
    console.error('Event page create error:', error);
    return NextResponse.json({ error: 'Failed to create event page' }, { status: 500 });
  }
}
