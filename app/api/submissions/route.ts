import { connectDB } from '@/lib/mongodb';
import { ContactSubmission } from '@/models/ContactSubmission';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendInquiryEmails } from '@/lib/email';

export const runtime = 'nodejs';

const ContactSubmissionSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().min(1, 'Company is required'),
  projectDate: z.string().min(1, 'Project date is required'),
  estimatedBudget: z.number().min(0, 'Budget must be positive'),
  description: z.string().min(1, 'Description is required'),
  industries: z.array(z.string().min(1)).optional(),
  industry: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  goals: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ContactSubmissionSchema.parse(body);
    const industries = validated.industries?.length
      ? validated.industries
      : Array.isArray(validated.industry)
        ? validated.industry
        : validated.industry
          ? [validated.industry]
          : [];

    if (industries.length === 0) {
      return NextResponse.json(
        { error: 'At least one industry is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await connectDB();
    const submission = await ContactSubmission.create({
      ...validated,
      industries,
    });

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail = settings?.partnershipEmail || process.env.ADMIN_EMAIL || 'rinwahospitality@gmail.com';
    const emailResult = await sendInquiryEmails({
      submission: {
        ...validated,
        industries,
      },
      adminEmail,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Submission received',
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
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit form', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    await connectDB();
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await ContactSubmission.countDocuments();

    return NextResponse.json(
      { submissions, total, limit, skip },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}
