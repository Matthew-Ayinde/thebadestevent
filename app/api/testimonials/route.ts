import { connectDB } from '@/lib/mongodb';
import { Testimonial } from '@/models/Testimonial';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const TestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  details: z.string().min(1, 'Details are required'),
  initials: z.string().min(1, 'Initials required').max(2),
  order: z.number().optional(),
});

export async function GET() {
  try {
    await connectDB();
    const items = await Testimonial.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(Array.isArray(items) ? items : []);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = TestimonialSchema.parse(body);

    await connectDB();
    const created = await Testimonial.create(validated);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating testimonial:', error);
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }
}
