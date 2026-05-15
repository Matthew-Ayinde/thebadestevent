import { connectDB } from '@/lib/mongodb';
import { HeroSlide } from '@/models/HeroSlide';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const HeroSlideSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  videoUrl: z.string().url('Invalid video URL').optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order: z.number().min(0, 'Order must be a positive number'),
});

export async function GET() {
  try {
    await connectDB();
    const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1 });
    return NextResponse.json(slides, { status: 200 });
  } catch (error) {
    console.error('Error fetching hero slides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero slides', code: 'FETCH_ERROR' },
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
    const validated = HeroSlideSchema.parse(body);

    await connectDB();
    const slide = await HeroSlide.create(validated);

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error creating hero slide:', error);
    return NextResponse.json(
      { error: 'Failed to create hero slide', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
