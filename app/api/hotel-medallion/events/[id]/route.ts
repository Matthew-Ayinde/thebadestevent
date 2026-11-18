import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { deleteCloudinaryAssets } from '@/lib/cloudinary';
import { MedallionEvent } from '@/models/MedallionEvent';
import { toEventView } from '@/lib/hotel-medallion-events-server';
import { MedallionEventInput, isMedallionAdmin } from '@/lib/hotel-medallion-events-input';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!(await isMedallionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const data = MedallionEventInput.parse(await request.json());
    await connectDB();
    // Slug is intentionally left untouched so published links survive a rename.
    const previous = await MedallionEvent.findByIdAndUpdate(id, data).lean();
    if (!previous) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (previous.imageUrl && previous.imageUrl !== data.imageUrl) await deleteCloudinaryAssets([previous.imageUrl]);
    return NextResponse.json(toEventView({ ...previous, ...data }));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('Hotel Medallion event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  if (!(await isMedallionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    await connectDB();
    const doc = await MedallionEvent.findByIdAndDelete(id).lean();
    if (!doc) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    await deleteCloudinaryAssets([doc.imageUrl]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hotel Medallion event delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
