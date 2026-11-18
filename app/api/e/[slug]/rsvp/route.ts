import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { identifyVisitor } from '@/lib/analytics-server';
import { EventGuest, type IEventGuest } from '@/models/EventGuest';
import { eventStatus, type EventSiteView } from '@/lib/event-site';
import { generateTicketCode, generateTicketToken, getEventSite, sendInvitation } from '@/lib/event-site-server';
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

async function deliverInvitation(event: EventSiteView, guest: IEventGuest) {
  const result = await sendInvitation(event, guest);
  if (!result.sent) console.warn(`RSVP invitation email failed (${event.slug}):`, result.error);
  await EventGuest.updateOne(
    { _id: guest._id },
    result.sent ? { emailSentAt: new Date(), emailError: null } : { emailError: result.error ?? 'Unknown error' }
  );
  return result.sent;
}

async function resendToExisting(event: EventSiteView, email: string) {
  const existing = await EventGuest.findOne({ eventId: event.id, email });
  if (existing && (!existing.emailSentAt || Date.now() - existing.emailSentAt.getTime() > RESEND_COOLDOWN_MS)) {
    await deliverInvitation(event, existing);
  }
  // Never return the existing ticket here — anyone can type someone else's email.
  return NextResponse.json({ status: 'exists' }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEventSite((await params).slug);
  if (!event || event.rsvpMode !== 'builtin') {
    return NextResponse.json({ error: 'This event isn’t taking RSVPs here.' }, { status: 404 });
  }
  if (eventStatus(event) === 'past') {
    return NextResponse.json({ error: 'RSVPs for this event have closed. Thank you for your interest.' }, { status: 410 });
  }

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

    if (await EventGuest.exists({ eventId: event.id, email })) return resendToExisting(event, email);

    let guest: IEventGuest | null = null;
    for (let attempt = 0; attempt < 3 && !guest; attempt++) {
      try {
        guest = await EventGuest.create({
          eventId: event.id,
          firstName,
          lastName,
          email,
          token: generateTicketToken(),
          code: generateTicketCode(event.codePrefix),
        });
      } catch (error) {
        if (isDuplicateKey(error, 'email')) return resendToExisting(event, email);
        if (!isDuplicateKey(error)) throw error;
        // Token/code collision — astronomically rare; just roll again.
      }
    }
    if (!guest) throw new Error('Could not allocate a unique ticket code');

    const emailSent = await deliverInvitation(event, guest);
    return NextResponse.json({ status: 'created', token: guest.token, emailSent }, { status: 201 });
  } catch (error) {
    console.error(`RSVP error (${event.slug}):`, error);
    return NextResponse.json({ error: 'We couldn’t save your RSVP. Please try again.' }, { status: 500 });
  }
}
