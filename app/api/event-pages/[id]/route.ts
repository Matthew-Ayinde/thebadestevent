import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { deleteCloudinaryAssets } from '@/lib/cloudinary';
import { EventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import { EventSiteInput } from '@/lib/event-site-input';
import { isAdminSession, toEventView } from '@/lib/event-site-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Brands reuse logos across events — only remove an upload once no event page references it. */
async function deleteUnreferencedImages(urls: (string | undefined | null)[]) {
  const candidates = [...new Set(urls.filter((u): u is string => !!u))];
  const stillUsed = await Promise.all(
    candidates.map((url) => EventSite.exists({ $or: [{ logoUrl: url }, { coverImageUrl: url }] }))
  );
  const unused = candidates.filter((_, i) => !stillUsed[i]);
  if (unused.length) await deleteCloudinaryAssets(unused);
}

async function guard(params: Ctx['params']) {
  if (!(await isAdminSession())) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return { response: NextResponse.json({ error: 'Invalid ID' }, { status: 400 }) };
  return { id };
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const g = await guard(params);
  if (g.response) return g.response;
  await connectDB();
  const doc = await EventSite.findById(g.id).select('+scannerPasscodeHash').lean();
  if (!doc) return NextResponse.json({ error: 'Event page not found' }, { status: 404 });
  const registered = await EventGuest.countDocuments({ eventId: g.id });
  return NextResponse.json({ ...toEventView(doc), registered });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const g = await guard(params);
  if (g.response) return g.response;

  try {
    const { fields, scannerPasscode, clearScannerPasscode } = EventSiteInput.parse(await request.json());
    await connectDB();
    const previous = await EventSite.findById(g.id).lean();
    if (!previous) return NextResponse.json({ error: 'Event page not found' }, { status: 404 });

    if (fields.slug !== previous.slug) {
      // Tickets and calendar entries already emailed point at the old URL.
      if (await EventGuest.exists({ eventId: g.id })) {
        return NextResponse.json(
          { error: `The URL can’t change once guests have RSVP’d — their tickets link to /${previous.slug}` },
          { status: 409 }
        );
      }
      if (await EventSite.exists({ slug: fields.slug, _id: { $ne: g.id } })) {
        return NextResponse.json({ error: `/${fields.slug} is already used by another event` }, { status: 409 });
      }
    }

    const update: Record<string, unknown> = { ...fields };
    if (clearScannerPasscode) update.scannerPasscodeHash = null;
    else if (scannerPasscode) update.scannerPasscodeHash = await bcryptjs.hash(scannerPasscode, 10);

    const doc = await EventSite.findByIdAndUpdate(g.id, update, { new: true }).select('+scannerPasscodeHash').lean();
    if (!doc) return NextResponse.json({ error: 'Event page not found' }, { status: 404 });

    await deleteUnreferencedImages([previous.logoUrl, previous.coverImageUrl]);
    return NextResponse.json(toEventView(doc));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'That URL is already used by another event' }, { status: 409 });
    }
    console.error('Event page update error:', error);
    return NextResponse.json({ error: 'Failed to update event page' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const g = await guard(params);
  if (g.response) return g.response;

  try {
    await connectDB();
    // Guests hold live tickets for this page; deleting would strand them. Unpublishing hides only the
    // public page — tickets, calendar files and the scanner load regardless of publish state.
    const guests = await EventGuest.countDocuments({ eventId: g.id });
    if (guests > 0) {
      return NextResponse.json(
        {
          error: `${guests} guest(s) have RSVP’d to this event, so it can’t be deleted. Unpublish it instead — the page is hidden but their tickets and the door scanner keep working.`,
        },
        { status: 409 }
      );
    }
    const doc = await EventSite.findByIdAndDelete(g.id).lean();
    if (!doc) return NextResponse.json({ error: 'Event page not found' }, { status: 404 });
    await deleteUnreferencedImages([doc.logoUrl, doc.coverImageUrl]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event page delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event page' }, { status: 500 });
  }
}
