import { connectDB } from '@/lib/mongodb';
import { MeetingRequest } from '@/models/MeetingRequest';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sendMeetingRequestEmail } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  fullName: z.string().trim().min(2, 'Please share your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  reason: z.string().trim().min(10, 'Tell us a little more about the meeting').max(1500),
  // Honeypot — real users never see or fill this.
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);

    // Quietly accept bot submissions without storing or notifying, so the honeypot isn't revealed.
    if (parsed.success && parsed.data.website) {
      return NextResponse.json({ success: true, id: randomUUID(), token: randomUUID() }, { status: 201 });
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { fullName, email, reason } = parsed.data;
    const accessToken = randomUUID();

    await connectDB();
    const meeting = await MeetingRequest.create({ fullName, email, reason, accessToken });

    const settings = await Settings.findOne().select('partnershipEmail');
    const adminEmail =
      process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';

    const emailResult = await sendMeetingRequestEmail({ request: { fullName, email, reason }, adminEmail });
    if (!emailResult.sent) {
      console.warn('Meeting request saved but email failed:', emailResult.warnings);
    }

    return NextResponse.json({ success: true, id: meeting._id, token: accessToken }, { status: 201 });
  } catch (error) {
    console.error('Meeting request error:', error);
    return NextResponse.json({ error: 'Failed to save your request' }, { status: 500 });
  }
}

const FILTERS = ['all', 'upcoming', 'past', 'pending', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

function filterQuery(filter: Filter, now: Date) {
  switch (filter) {
    case 'upcoming':  return { status: 'booked', startTime: { $gte: now } };
    case 'past':      return { status: 'booked', startTime: { $lt: now } };
    case 'pending':   return { status: 'pending' };
    case 'cancelled': return { status: 'cancelled' };
    default:          return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const rawFilter = searchParams.get('filter') as Filter;
    const filter: Filter = FILTERS.includes(rawFilter) ? rawFilter : 'all';

    await connectDB();
    const now = new Date();
    const query = filterQuery(filter, now);

    const [total, counts] = await Promise.all([
      MeetingRequest.countDocuments(query),
      Promise.all(FILTERS.map(f => MeetingRequest.countDocuments(filterQuery(f, now)))),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    // Upcoming reads best soonest-first; everything else newest-first.
    const sort: Record<string, 1 | -1> =
      filter === 'upcoming' ? { startTime: 1 } : filter === 'past' ? { startTime: -1 } : { createdAt: -1 };

    const meetings = await MeetingRequest.find(query)
      .sort(sort)
      .skip((currentPage - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      {
        meetings,
        total,
        limit,
        page: currentPage,
        totalPages,
        counts: Object.fromEntries(FILTERS.map((f, i) => [f, counts[i]])),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Meeting requests fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}
