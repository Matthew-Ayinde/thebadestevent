import { connectDB } from '@/lib/mongodb';
import { MeetingRequest } from '@/models/MeetingRequest';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';

export const runtime = 'nodejs';

const Schema = z.object({
  token: z.string().min(1),
  bookingUid: z.string().max(200).optional(),
  startTime: z.string().max(64).optional(),
  endTime: z.string().max(64).optional(),
  timeZone: z.string().max(64).optional(),
});

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Marks a meeting request as booked once the Cal.com embed confirms the booking.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid booking details' }, { status: 400 });
    }

    const { token, bookingUid, startTime, endTime, timeZone } = parsed.data;

    await connectDB();
    const result = await MeetingRequest.updateOne(
      { _id: id, accessToken: token, status: { $ne: 'cancelled' } },
      {
        status: 'booked',
        bookingUid,
        startTime: toDate(startTime),
        endTime: toDate(endTime),
        timeZone,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Meeting booking update error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await connectDB();
    const result = await MeetingRequest.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Meeting delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
