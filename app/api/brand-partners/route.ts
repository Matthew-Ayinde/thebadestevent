import { connectDB } from '@/lib/mongodb';
import { BrandPartner } from '@/models/BrandPartner';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BrandPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  logoUrl: z.string().url('Invalid logo URL'),
  region: z.enum(['Lagos', 'Canada', 'Hospitality', 'Other']),
  link: z.string().url('Invalid URL').optional().or(z.literal('')),
  order: z.number().min(0, 'Order must be positive').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');

    await connectDB();
    const query = region ? { region, isActive: true } : { isActive: true };
    const partners = await BrandPartner.find(query).sort({ order: 1 });

    return NextResponse.json(partners, { status: 200 });
  } catch (error) {
    console.error('Error fetching brand partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand partners', code: 'FETCH_ERROR' },
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
    const validated = BrandPartnerSchema.parse(body);

    await connectDB();
    const partner = await BrandPartner.create(validated);

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error creating brand partner:', error);
    return NextResponse.json(
      { error: 'Failed to create brand partner', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
