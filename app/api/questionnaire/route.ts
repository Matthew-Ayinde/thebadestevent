import { connectDB } from '@/lib/mongodb';
import { QuestionnaireSubmission } from '@/models/QuestionnaireSubmission';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendQuestionnaireEmails } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().min(1, 'Company is required'),
  eventName: z.string().optional(),
  eventPurpose: z.string().optional(),
  objectives: z.string().optional(),
  eventDate: z.string().optional(),
  hostCity: z.string().optional(),
  venueLocation: z.string().optional(),
  eventHashtags: z.array(z.string()).optional(),
  eventFormat: z.string().optional(),
  attendeeCount: z.string().optional(),
  targetAudience: z.string().optional(),
  responsibilities: z.string().optional(),
  managingScope: z.string().optional(),
  existingVendors: z.string().optional(),
  existingVendorDetails: z.string().optional(),
  internalTeam: z.string().optional(),
  internalTeamDetails: z.string().optional(),
  venueSecured: z.string().optional(),
  venuePreferences: z.string().optional(),
  requiredSpaces: z.array(z.string()).optional(),
  productionNeeds: z.array(z.string()).optional(),
  specialProduction: z.string().optional(),
  registrationMethod: z.string().optional(),
  ticketingSupport: z.string().optional(),
  vipGuests: z.string().optional(),
  vipDetails: z.string().optional(),
  accessibilityRequired: z.string().optional(),
  accessibilityDetails: z.string().optional(),
  guestTouchpoints: z.string().optional(),
  speakerCount: z.string().optional(),
  travelCoordination: z.string().optional(),
  speakerManagement: z.string().optional(),
  staffingRequired: z.string().optional(),
  volunteersNeeded: z.string().optional(),
  staffingRecruitment: z.string().optional(),
  cateringProvided: z.string().optional(),
  serviceStyle: z.array(z.string()).optional(),
  dietaryRequirements: z.string().optional(),
  attendeeCommunications: z.string().optional(),
  marketingManagement: z.string().optional(),
  eventMaterials: z.array(z.string()).optional(),
  transportationRequired: z.string().optional(),
  hotelBlocks: z.string().optional(),
  airportTransfers: z.string().optional(),
  sponsorsInvolved: z.string().optional(),
  sponsorDeliverables: z.string().optional(),
  exhibitorActivations: z.string().optional(),
  eventInsurance: z.string().optional(),
  permitsRequired: z.string().optional(),
  securityRequired: z.string().optional(),
  contingencyPlans: z.string().optional(),
  budgetRange: z.string().optional(),
  budgetConstraints: z.string().optional(),
  decisionMakers: z.string().optional(),
  procurementProcess: z.string().optional(),
  planningStart: z.string().optional(),
  majorMilestones: z.string().optional(),
  postEventReporting: z.string().optional(),
  successDefinition: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = Schema.parse(body);

    await connectDB();
    const submission = await QuestionnaireSubmission.create(validated);

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail =
      process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';

    const emailResult = await sendQuestionnaireEmails({ submission: validated, adminEmail });

    if (!emailResult.sent) {
      console.warn('Questionnaire saved but emails failed:', emailResult.warnings);
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
    console.error('Questionnaire submission error:', error);
    return NextResponse.json({ error: 'Failed to submit questionnaire' }, { status: 500 });
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
    const total = await QuestionnaireSubmission.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    const submissions = await QuestionnaireSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((currentPage - 1) * limit);

    return NextResponse.json(
      { submissions, total, limit, page: currentPage, totalPages },
      { status: 200 }
    );
  } catch (error) {
    console.error('Questionnaire fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch questionnaire submissions' }, { status: 500 });
  }
}
