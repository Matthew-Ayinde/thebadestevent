import { connectDB } from '@/lib/mongodb';
import { GuestExperienceSubmission } from '@/models/GuestExperienceSubmission';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendGuestExperienceEmails } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  welcomed: z.string().min(1, 'Please let us know if you felt welcomed'),
  anticipatedMoment: z.string().min(1, 'Please answer this question'),
  anticipatedMomentDetail: z.string().optional(),
  caredForScore: z.string().min(1, 'Please pick a number from 1 to 5'),
  overlookedMoment: z.string().optional(),
  wouldReturn: z.string().min(1, 'Please answer this question'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = Schema.parse(body);

    await connectDB();
    const submission = await GuestExperienceSubmission.create(validated);

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail =
      process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';

    const emailResult = await sendGuestExperienceEmails({ submission: validated, adminEmail });

    if (!emailResult.sent) {
      console.warn('Guest experience feedback saved but admin email failed:', emailResult.warnings);
    }

    return NextResponse.json(
      { success: true, id: submission._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Guest experience submission error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    await connectDB();
    const total = await GuestExperienceSubmission.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    const submissions = await GuestExperienceSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((currentPage - 1) * limit);

    return NextResponse.json(
      { submissions, total, limit, page: currentPage, totalPages },
      { status: 200 }
    );
  } catch (error) {
    console.error('Guest experience fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
