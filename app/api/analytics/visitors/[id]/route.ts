import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await params;

    await connectDB();
    const visitor = await AnalyticsVisitor.findOne({ visitorId: id }).lean<any>();
    if (!visitor) return NextResponse.json({ error: 'Visitor not found', code: 'NOT_FOUND' }, { status: 404 });

    const [events, otherDevices] = await Promise.all([
      AnalyticsEvent.find({ visitorId: id }).sort({ createdAt: -1 }).limit(500).lean(),
      // The same person on another browser or device, matched on the email they gave us.
      visitor.email
        ? AnalyticsVisitor.find({ email: visitor.email, visitorId: { $ne: id } })
            .select('visitorId device browser os city country lastSeenAt pageviews')
            .sort({ lastSeenAt: -1 })
            .limit(10)
            .lean()
        : Promise.resolve([]),
    ]);

    return NextResponse.json({ visitor, events, otherDevices }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json({ error: 'Failed to fetch visitor', code: 'FETCH_ERROR' }, { status: 500 });
  }
}

/** Erases a visitor and their full activity history (e.g. on a data-deletion request). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await params;

    await connectDB();
    const [visitor] = await Promise.all([
      AnalyticsVisitor.deleteOne({ visitorId: id }),
      AnalyticsEvent.deleteMany({ visitorId: id }),
    ]);
    if (!visitor.deletedCount) return NextResponse.json({ error: 'Visitor not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return NextResponse.json({ error: 'Failed to delete visitor', code: 'DELETE_ERROR' }, { status: 500 });
  }
}
