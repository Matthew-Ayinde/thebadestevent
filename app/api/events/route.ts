import { connectDB } from '@/lib/mongodb';
import { Event } from '@/models/Event';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  city: z.enum(['Lagos', 'Toronto', 'Vancouver', 'Remote']),
  weekday: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  location: z.string().min(1, 'Location is required'),
  rsvpLink: z.string().url('Invalid RSVP link URL'),
  imageUrl: z.string().url('Invalid image URL'),
  eventType: z.enum(['Dining', 'Community', 'Nightlife', 'Creative', 'Wellness']),
  isFeatured: z.boolean().optional(),
  isPast: z.boolean().optional(),
  order: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const weekday = searchParams.get('weekday');
    const isPast = searchParams.get('isPast');

    await connectDB();
    const query: any = {};

    if (city) query.city = city;
    if (weekday) query.weekday = weekday;
    if (isPast !== null) query.isPast = isPast === 'true';

    const events = await Event.find(query).sort({ order: 1, date: -1 });
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = EventSchema.parse(body);

    await connectDB();
    const event = await Event.create(validated);

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
