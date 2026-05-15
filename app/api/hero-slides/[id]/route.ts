import { connectDB } from '@/lib/mongodb';
import { HeroSlide } from '@/models/HeroSlide';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';

const UpdateHeroSlideSchema = z.object({
  imageUrl: z.string().url('Invalid image URL').optional(),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  order: z.number().min(0, 'Order must be a positive number').optional(),
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
    const validated = UpdateHeroSlideSchema.parse(body);

    await connectDB();
    const slide = await HeroSlide.findByIdAndUpdate(id, validated, { new: true });

    if (!slide) {
      return NextResponse.json(
        { error: 'Hero slide not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(slide, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error updating hero slide:', error);
    return NextResponse.json(
      { error: 'Failed to update hero slide', code: 'UPDATE_ERROR' },
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
    const slide = await HeroSlide.findByIdAndDelete(id);

    if (!slide) {
      return NextResponse.json(
        { error: 'Hero slide not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting hero slide:', error);
    return NextResponse.json(
      { error: 'Failed to delete hero slide', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
