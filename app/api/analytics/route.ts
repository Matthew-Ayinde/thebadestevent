import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { getOverview, parseRange, type Granularity } from '@/lib/analytics-query';

export const runtime = 'nodejs';

const UNITS: Granularity[] = ['day', 'week', 'month'];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = parseRange(searchParams);
    if (!range) return NextResponse.json({ error: 'Invalid date range', code: 'VALIDATION_ERROR' }, { status: 400 });
    const unitParam = searchParams.get('unit') as Granularity;
    const unit = UNITS.includes(unitParam) ? unitParam : 'day';

    await connectDB();
    return NextResponse.json(await getOverview(range, unit), { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
