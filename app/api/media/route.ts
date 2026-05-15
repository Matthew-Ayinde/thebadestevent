import { connectDB } from '@/lib/mongodb';
import { MediaItem } from '@/models/MediaItem';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';

const MediaItemSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  caption: z.string().optional(),
  eventId: z.string().optional(),
  order: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    await connectDB();
    const query: any = { isActive: true };
    if (eventId && Types.ObjectId.isValid(eventId)) {
      query.eventId = eventId;
    }

    const items = await MediaItem.find(query).sort({ order: 1 });
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching media items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media items', code: 'FETCH_ERROR' },
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
    const validated = MediaItemSchema.parse(body);

    await connectDB();
    const item = await MediaItem.create(validated);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error creating media item:', error);
    return NextResponse.json(
      { error: 'Failed to create media item', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
