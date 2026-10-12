import { connectDB } from '@/lib/mongodb';
import { HomecomingSubmission } from '@/models/HomecomingSubmission';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendHomecomingEmails } from '@/lib/email';

export const runtime = 'nodejs';

const OWN_WEDDING = 'My own wedding';
const PARTNER_OFFERS = 'Send me partner offers';

const Schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    contactMethod: z.enum(['WhatsApp', 'Email', 'Phone call'], {
      errorMap: () => ({ message: 'Please choose how we can reach you' }),
    }),
    contactValue: z.string().trim().min(1, 'Please share your contact detail'),
    residence: z.string().min(1, "Please let us know where you're travelling from"),
    residenceOther: z.string().optional(),
    lastHome: z.string().min(1, 'Please let us know when you were last home'),
    arrival: z.string().min(1, "Please let us know when you're planning to arrive"),
    stayLength: z.string().min(1, "Please let us know how long you're staying"),
    companions: z.string().min(1, "Please let us know who's coming with you"),
    reason: z.array(z.string()).min(1, 'Please tell us why you are coming'),
    reasonOther: z.string().optional(),
    weddingHelp: z.string().optional(),
    accommodation: z.string().min(1, "Please let us know where you'll be staying"),
    budget: z.string().optional(),
    needs: z.array(z.string()).min(1, "Please tell us what you'd like handled"),
    needsOther: z.string().optional(),
    excitedFor: z.array(z.string()).min(1, "Please tell us what you're excited to experience"),
    excitedForOther: z.string().optional(),
    perks: z.string().min(1, "Please let us know if you'd like perks and discounts"),
    partnerConsent: z.boolean().optional().default(false),
    heardFrom: z.string().min(1, 'Please let us know how you heard about RÌNWÁ'),
    heardFromOther: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (d.contactMethod === 'Email' && !z.string().email().safeParse(d.contactValue).success) {
      fail('contactValue', 'Please enter a valid email address');
    }
    if (d.residence === 'Other' && !d.residenceOther?.trim()) {
      fail('residenceOther', "Please tell us where you're travelling from");
    }
    if (d.reason.includes(OWN_WEDDING) && !d.weddingHelp) {
      fail('weddingHelp', "Please let us know if you'd like help with your wedding plans");
    }
    if (d.accommodation !== 'With family or friends' && !d.budget) {
      fail('budget', 'Please pick a rough accommodation budget');
    }
    if (d.perks === PARTNER_OFFERS && !d.partnerConsent) {
      fail('partnerConsent', 'Please agree to share your details with partners to receive their offers');
    }
    if (d.heardFrom === 'Other' && !d.heardFromOther?.trim()) {
      fail('heardFromOther', 'Please tell us where you heard about RÌNWÁ');
    }
  })
  // Drop answers to conditional questions that weren't shown.
  .transform(d => ({
    ...d,
    weddingHelp: d.reason.includes(OWN_WEDDING) ? d.weddingHelp : undefined,
    budget: d.accommodation !== 'With family or friends' ? d.budget : undefined,
    partnerConsent: d.perks === PARTNER_OFFERS && d.partnerConsent,
  }));

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
      console.warn('Diaspora check-in saved but emails failed:', emailResult.warnings);
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
