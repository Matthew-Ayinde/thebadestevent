import { connectDB } from '@/lib/mongodb';
import { HomecomingSubmission } from '@/models/HomecomingSubmission';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendHomecomingEmails } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactMethod: z.string().min(1, 'Please choose how we can reach you'),
  contactValue: z.string().min(1, 'Please share your contact detail'),
  visitorType: z.string().min(1, 'Please let us know if this is your first time'),
  timeframe: z.string().min(1, 'Please pick a rough timeframe'),
  familyAware: z.string().min(1, 'Please answer this question'),
  reason: z.string().min(1, 'Please tell us why you are coming'),
  reasonOther: z.string().optional(),
  challenges: z.array(z.string()).optional(),
  challengesOther: z.string().optional(),
  wantsHelp: z.string().min(1, 'Please answer this question'),
  excitedFor: z.array(z.string()).optional(),
  excitedForOther: z.string().optional(),
  heardOfDWL: z.string().min(1, 'Please answer this question'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = Schema.parse(body);

    await connectDB();
    const submission = await HomecomingSubmission.create(validated);

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail =
      process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';

    const emailResult = await sendHomecomingEmails({ submission: validated, adminEmail });

    if (!emailResult.sent) {
      console.warn('Homecoming check-in saved but emails failed:', emailResult.warnings);
    }

    return NextResponse.json(
      {
        success: true,
        id: submission._id,
        emailDelivered: emailResult.sent,
        emailWarnings: emailResult.warnings,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    console.error('Homecoming submission error:', error);
    return NextResponse.json({ error: 'Failed to submit check-in' }, { status: 500 });
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
    const total = await HomecomingSubmission.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    const submissions = await HomecomingSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((currentPage - 1) * limit);

    return NextResponse.json(
      { submissions, total, limit, page: currentPage, totalPages },
      { status: 200 }
    );
  } catch (error) {
    console.error('Homecoming fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
  }
}
