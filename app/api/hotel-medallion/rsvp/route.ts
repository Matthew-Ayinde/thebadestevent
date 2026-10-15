import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { identifyVisitor } from '@/lib/analytics-server';
import { MedallionGuest, type IMedallionGuest } from '@/models/MedallionGuest';
import { generateTicketCode, generateTicketToken, sendMedallionInvitation } from '@/lib/hotel-medallion-server';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export const runtime = 'nodejs';

const Schema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name').max(60),
  lastName: z.string().trim().min(1, 'Please enter your last name').max(60),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(200),
  // Honeypot — real users never see or fill this.
  website: z.string().optional(),
});

// Re-sends to an already-registered address are throttled so the form can't be used to spam an inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function isDuplicateKey(error: unknown, field?: string): boolean {
  const e = error as { code?: number; keyPattern?: Record<string, unknown> };
  return e?.code === 11000 && (!field || Boolean(e.keyPattern?.[field]));
}

async function deliverInvitation(guest: IMedallionGuest) {
  const result = await sendMedallionInvitation(guest);
  if (!result.sent) console.warn('Hotel Medallion invitation email failed:', result.error);
  await MedallionGuest.updateOne(
    { _id: guest._id },
    result.sent ? { emailSentAt: new Date(), emailError: null } : { emailError: result.error ?? 'Unknown error' }
  );
  return result.sent;
}

async function resendToExisting(email: string) {
  const existing = await MedallionGuest.findOne({ email });
  if (existing && (!existing.emailSentAt || Date.now() - existing.emailSentAt.getTime() > RESEND_COOLDOWN_MS)) {
    await deliverInvitation(existing);
  }
  // Never return the existing ticket here — anyone can type someone else's email.
  return NextResponse.json({ status: 'exists' }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(RATE_LIMITS.rsvpSubmit, rateLimitKey(request.headers));
    if (!limited.ok) return tooManyRequests(limited, 'Too many submissions. Please wait a few minutes and try again.');

    const parsed = Schema.safeParse(await request.json());

    if (parsed.success && parsed.data.website) {
      return NextResponse.json({ status: 'exists' }, { status: 200 });
    }
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { firstName, lastName, email } = parsed.data;
    identifyVisitor(request, { source: 'medallion_rsvp', email, name: `${firstName} ${lastName}` });
    await connectDB();

    if (await MedallionGuest.exists({ email })) return resendToExisting(email);

    let guest: IMedallionGuest | null = null;
    for (let attempt = 0; attempt < 3 && !guest; attempt++) {
      try {
        guest = await MedallionGuest.create({
          firstName,
          lastName,
          email,
          token: generateTicketToken(),
          code: generateTicketCode(),
        });
      } catch (error) {
        if (isDuplicateKey(error, 'email')) return resendToExisting(email);
        if (!isDuplicateKey(error)) throw error;
        // Token/code collision — astronomically rare; just roll again.
      }
    }
    if (!guest) throw new Error('Could not allocate a unique ticket code');

    const emailSent = await deliverInvitation(guest);
    return NextResponse.json({ status: 'created', token: guest.token, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Hotel Medallion RSVP error:', error);
    return NextResponse.json({ error: 'We couldn’t save your RSVP. Please try again.' }, { status: 500 });
  }
}
