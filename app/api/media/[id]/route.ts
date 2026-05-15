import { connectDB } from '@/lib/mongodb';
import { MediaItem } from '@/models/MediaItem';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';

const UpdateMediaItemSchema = z.object({
  imageUrl: z.string().url('Invalid image URL').optional(),
  caption: z.string().optional(),
  eventId: z.string().optional(),
  order: z.number().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
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
    const validated = UpdateMediaItemSchema.parse(body);

    await connectDB();
    const item = await MediaItem.findByIdAndUpdate(id, validated, { new: true });

    if (!item) {
      return NextResponse.json(
        { error: 'Media item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error updating media item:', error);
    return NextResponse.json(
      { error: 'Failed to update media item', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
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
    const item = await MediaItem.findByIdAndDelete(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Media item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting media item:', error);
    return NextResponse.json(
      { error: 'Failed to delete media item', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
