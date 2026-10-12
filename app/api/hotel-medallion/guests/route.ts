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
    const guests = await MedallionGuest.find()
      .sort({ createdAt: -1 })
      .select('firstName lastName email code createdAt checkedInAt emailSentAt emailError')
      .lean();

    return NextResponse.json({
      guests: guests.map((g) => ({
        id: String(g._id),
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        code: g.code,
        registeredAt: g.createdAt,
        checkedInAt: g.checkedInAt ?? null,
        // Lets staff spot guests whose invitation never arrived.
        emailDelivered: Boolean(g.emailSentAt),
      })),
    });
  } catch (error) {
    console.error('Hotel Medallion guest list error:', error);
    return NextResponse.json({ error: 'Failed to load guests' }, { status: 500 });
  }
}
