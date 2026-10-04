import { connectDB } from '@/lib/mongodb';
import { MeetingRequest } from '@/models/MeetingRequest';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

// How far back a website request can be matched to a Cal.com booking by email.
const MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

function str(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toDate(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Cal.com webhook — the source of truth for bookings.
 * Subscribe to Booking Created, Rescheduled and Cancelled in Cal.com → Settings → Developer → Webhooks,
 * pointing at {SITE_URL}/api/webhooks/cal with the same secret as CAL_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Cal webhook received but CAL_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-cal-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const trigger: string = body?.triggerEvent ?? '';
  const p = body?.payload ?? {};

  if (!['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED'].includes(trigger)) {
    // Includes Cal.com's "Ping test" — acknowledge so the webhook stays healthy.
    return NextResponse.json({ received: true, ignored: trigger || 'unknown' }, { status: 200 });
  }

  try {
    await connectDB();

    const attendee = Array.isArray(p.attendees) ? p.attendees[0] ?? {} : {};
    const email = str(attendee.email)?.toLowerCase();
    const uid = str(p.uid);
    const previousUids = [str(p.rescheduleUid), str(p.fromReschedule), str(p.rescheduledFromUid)].filter(Boolean) as string[];
    const notes = str(p.responses?.notes?.value) ?? str(p.additionalNotes) ?? str(p.description);

    // 1. Match a record we already linked to this booking (or the booking it was rescheduled from).
    const uids = [uid, ...previousUids].filter(Boolean) as string[];
    let meeting = uids.length ? await MeetingRequest.findOne({ bookingUid: { $in: uids } }) : null;

    // 2. Otherwise, match the latest website request from the same person that hasn't been booked yet.
    if (!meeting && email && trigger !== 'BOOKING_CANCELLED') {
      meeting = await MeetingRequest.findOne({
        email,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - MATCH_WINDOW_MS) },
      }).sort({ createdAt: -1 });
    }

    if (trigger === 'BOOKING_CANCELLED') {
      if (meeting) {
        meeting.status = 'cancelled';
        meeting.cancellationReason = str(p.cancellationReason);
        await meeting.save();
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const bookingFields = {
      status: 'booked' as const,
      bookingUid: uid,
      eventTitle: str(p.eventTitle) ?? str(p.title),
      startTime: toDate(p.startTime),
      endTime: toDate(p.endTime),
      timeZone: str(attendee.timeZone),
      location: str(p.location),
      meetingUrl: str(p.metadata?.videoCallUrl) ?? str(p.videoCallData?.url),
      cancellationReason: undefined,
    };

    if (meeting) {
      meeting.set(bookingFields);
      if (!meeting.reason && notes) meeting.reason = notes;
      await meeting.save();
    } else {
      // Booked directly on Cal.com without going through the website flow.
      await MeetingRequest.create({
        ...bookingFields,
        fullName: str(attendee.name) ?? email ?? 'Unknown guest',
        email: email ?? 'unknown@unknown',
        reason: notes ?? '',
        source: 'cal',
        accessToken: randomUUID(),
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Cal webhook error:', error);
    // Non-2xx makes Cal.com retry delivery.
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
