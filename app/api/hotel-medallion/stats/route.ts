import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MedallionGuest } from '@/models/MedallionGuest';
import { hasScannerSession } from '@/lib/hotel-medallion-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await hasScannerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const [registered, checkedIn, recent] = await Promise.all([
      MedallionGuest.countDocuments(),
      MedallionGuest.countDocuments({ checkedInAt: { $ne: null } }),
      MedallionGuest.find({ checkedInAt: { $ne: null } })
        .sort({ checkedInAt: -1 })
        .limit(8)
        .select('firstName lastName code checkedInAt')
        .lean(),
    ]);

    return NextResponse.json({
      registered,
      checkedIn,
      recent: recent.map((g) => ({
        name: `${g.firstName} ${g.lastName}`,
        code: g.code,
        checkedInAt: g.checkedInAt,
      })),
    });
  } catch (error) {
    console.error('Hotel Medallion stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
