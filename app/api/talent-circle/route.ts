import { connectDB } from '@/lib/mongodb';
import { identifyVisitor } from '@/lib/analytics-server';
import { TalentCircleMember } from '@/models/TalentCircleMember';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { TalentCircleSchema, type TalentCircleInput } from '@/lib/careers';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export const runtime = 'nodejs';

function notificationText(m: TalentCircleInput, returning: boolean) {
  const lines = [
    `${m.fullName} ${returning ? 'updated their details in' : 'joined'} the RÌNWÁ talent circle.`,
    '',
    `Email: ${m.email}`,
    `WhatsApp: ${m.whatsapp}`,
    `City: ${m.city}`,
    `Craft: ${m.crafts.join(', ')}`,
    `Current or most recent role: ${m.currentRole || '—'}`,
    `Years in hospitality: ${m.experience}`,
    `Looking for: ${m.lookingFor.join(', ')}`,
    `Could start: ${m.startWhen}`,
    `Work: ${m.link || '—'}`,
    '',
    'A moment they made unforgettable:',
    m.moment || '—',
    '',
    'Their dream move:',
    m.dreamMove || '—',
  ];
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(RATE_LIMITS.formSubmit, `talent:${rateLimitKey(request.headers)}`);
    if (!limited.ok) return tooManyRequests(limited, 'Too many submissions. Please wait a few minutes and try again.');

    const body = await request.json();
    // Honeypot: real visitors never see this field. Pretend it worked so bots don't retry.
    if (typeof body?.website === 'string' && body.website.trim()) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const member = TalentCircleSchema.parse(body);
    const { consent: _consent, ...details } = member;

    await connectDB();
    const previous = await TalentCircleMember.findOneAndUpdate(
      { email: member.email },
      { $set: { ...details, consentAt: new Date(), isRead: false } },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    ).lean();

    identifyVisitor(request, { source: 'talent_circle', email: member.email, name: member.fullName, phone: member.whatsapp });

    const settings = await Settings.findOne().select('partnershipEmail').lean<{ partnershipEmail?: string }>();
    const to = process.env.CAREERS_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';
    const emailResult = await sendEmail({
      to,
      subject: `Talent circle · ${member.fullName} (${member.crafts.join(', ')})`,
      text: notificationText(member, !!previous),
    });
    if (!emailResult.sent) console.warn('Talent circle sign-up saved but the notification email failed:', emailResult.warnings);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message, code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    console.error('Error saving talent circle sign-up:', error);
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again.', code: 'CREATE_ERROR' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const craft = searchParams.get('craft');

    await connectDB();
    const filter = craft ? { crafts: craft } : {};
    const total = await TalentCircleMember.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const members = await TalentCircleMember.find(filter)
      .sort({ updatedAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ members, total, page: currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching talent circle:', error);
    return NextResponse.json({ error: 'Failed to fetch talent circle', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
