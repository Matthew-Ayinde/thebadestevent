import { connectDB } from '@/lib/mongodb';
import { identifyVisitor } from '@/lib/analytics-server';
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
  location: z.string().min(1, 'Location is required'),
  projectDate: z.string().min(1, 'Project date is required'),
  estimatedBudget: z.number().min(0, 'Budget must be positive'),
  currency: z.enum(['NGN', 'USD', 'CAD', 'GBP', 'EUR']).default('NGN'),
  description: z.string().min(1, 'Description is required'),
  industries: z.array(z.string().min(1)).optional(),
  industry: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  goals: z.array(z.string()).optional(),
  feelings: z.array(z.string().min(1)).optional(),
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
      feelings: validated.feelings ?? [],
    });

    identifyVisitor(request, { source: 'contact', email: validated.email, name: validated.fullName, phone: validated.phone });

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail = process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';
    const emailResult = await sendInquiryEmails({
      submission: {
        ...validated,
        industries,
        feelings: validated.feelings ?? [],
      },
      adminEmail,
    });

    if (!emailResult.sent) {
      console.warn('Inquiry saved but one or more emails failed to send:', emailResult.warnings);
    }

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
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const skip = searchParams.has('skip')
      ? Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0)
      : (page - 1) * limit;

    await connectDB();
    const total = await ContactSubmission.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const currentSkip = searchParams.has('skip') ? skip : (currentPage - 1) * limit;

    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(currentSkip);

    return NextResponse.json(
      {
        submissions,
        total,
        limit,
        page: currentPage,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        skip: currentSkip,
      },
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
