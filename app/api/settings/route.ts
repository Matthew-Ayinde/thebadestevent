import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  partnershipEmail: z.string().email('Invalid email').optional(),
  tagline: z.string().optional(),
  siteUrl: z.string().url('Invalid URL').optional(),
  analyticsId: z.string().optional(),
});

export async function GET() {
  try {
    await connectDB();
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        partnershipEmail: 'rinwahospitality@gmail.com',
        tagline: 'Come here, you\'ve arrived home',
        siteUrl: 'https://rinwa.com',
      });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = UpdateSettingsSchema.parse(body);

    await connectDB();
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create(validated);
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, validated, { new: true });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}
