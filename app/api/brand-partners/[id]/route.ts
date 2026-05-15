import { connectDB } from '@/lib/mongodb';
import { BrandPartner } from '@/models/BrandPartner';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';

const UpdateBrandPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  region: z.enum(['Lagos', 'Canada', 'Hospitality', 'Other']).optional(),
  link: z.string().url('Invalid URL').optional().or(z.literal('')),
  order: z.number().min(0, 'Order must be positive').optional(),
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
    const validated = UpdateBrandPartnerSchema.parse(body);

    await connectDB();
    const partner = await BrandPartner.findByIdAndUpdate(id, validated, { new: true });

    if (!partner) {
      return NextResponse.json(
        { error: 'Brand partner not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(partner, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error updating brand partner:', error);
    return NextResponse.json(
      { error: 'Failed to update brand partner', code: 'UPDATE_ERROR' },
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
    const partner = await BrandPartner.findByIdAndDelete(id);

    if (!partner) {
      return NextResponse.json(
        { error: 'Brand partner not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting brand partner:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand partner', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
