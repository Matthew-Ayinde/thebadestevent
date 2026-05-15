import { connectDB } from '@/lib/mongodb';
import { Event } from '@/models/Event';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';

const UpdateEventSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  city: z.enum(['Lagos', 'Toronto', 'Vancouver', 'Remote']).optional(),
  weekday: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  date: z.string().min(1, 'Date is required').optional(),
  time: z.string().min(1, 'Time is required').optional(),
  location: z.string().min(1, 'Location is required').optional(),
  rsvpLink: z.string().url('Invalid RSVP link URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  eventType: z.enum(['Dining', 'Community', 'Nightlife', 'Creative', 'Wellness']).optional(),
  isFeatured: z.boolean().optional(),
  isPast: z.boolean().optional(),
  order: z.number().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = UpdateEventSchema.parse(body);

    await connectDB();
    const event = await Event.findByIdAndUpdate(id, validated, { new: true });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectDB();
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
