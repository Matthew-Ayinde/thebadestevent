import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MedallionGuest } from '@/models/MedallionGuest';
import { hasScannerSession, parseScanPayload } from '@/lib/hotel-medallion-server';
import type { CheckInResult } from '@/lib/hotel-medallion';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await hasScannerSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const lookup = typeof body?.payload === 'string' ? parseScanPayload(body.payload) : null;
    if (!lookup) return NextResponse.json({ result: 'invalid' } satisfies CheckInResult);

    await connectDB();

    // Atomic first-entry transition: only one scan can ever flip checkedInAt from null.
    const admitted = await MedallionGuest.findOneAndUpdate(
      { ...lookup, checkedInAt: null },
      { $set: { checkedInAt: new Date() } },
      { new: true }
    );
    const guest = admitted ?? (await MedallionGuest.findOne(lookup));
    if (!guest) return NextResponse.json({ result: 'invalid' } satisfies CheckInResult);

    return NextResponse.json({
      result: admitted ? 'admitted' : 'already',
      guest: {
        name: `${guest.firstName} ${guest.lastName}`,
        code: guest.code,
        checkedInAt: (guest.checkedInAt ?? new Date()).toISOString(),
      },
    } satisfies CheckInResult);
  } catch (error) {
    console.error('Hotel Medallion check-in error:', error);
    return NextResponse.json({ error: 'Check-in failed. Try again.' }, { status: 500 });
  }
}
