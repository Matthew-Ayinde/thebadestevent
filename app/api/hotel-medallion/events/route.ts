import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { MedallionEvent } from '@/models/MedallionEvent';
import { slugify } from '@/lib/hotel-medallion-events';
import { toEventView } from '@/lib/hotel-medallion-events-server';
import { MedallionEventInput, isMedallionAdmin } from '@/lib/hotel-medallion-events-input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin list — every event, drafts included, latest start first. */
export async function GET() {
  if (!(await isMedallionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const docs = await MedallionEvent.find().sort({ startsAt: -1 }).lean();
    return NextResponse.json(docs.map(toEventView));
  } catch (error) {
    console.error('Hotel Medallion events list error:', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || 'event';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await MedallionEvent.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(request: NextRequest) {
  if (!(await isMedallionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = MedallionEventInput.parse(await request.json());
    await connectDB();
    const doc = await MedallionEvent.create({ ...data, slug: await uniqueSlug(data.title) });
    return NextResponse.json(toEventView(doc), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('Hotel Medallion event create error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
