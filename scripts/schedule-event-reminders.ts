// Schedules the day-of reminder for every guest of one event, delivered by Resend
// REMINDER_HOURS before it starts. Guests already scheduled are skipped, so it is safe
// to re-run for late sign-ups. Dry run by default; pass --send to actually schedule.
// Usage: node --env-file=.env.local --import tsx scripts/schedule-event-reminders.ts --event <slug> [--send]
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { EventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import { sendInvitation, toEventView } from '@/lib/event-site-server';

const send = process.argv.includes('--send');
const slug = process.argv[process.argv.indexOf('--event') + 1];
const REMINDER_HOURS = 12;

async function main() {
  if (!process.argv.includes('--event') || !slug) throw new Error('Pass --event <slug>');
  await connectDB();
  const doc = await EventSite.findOne({ slug }).lean();
  if (!doc) throw new Error(`No event page at /${slug}`);
  const event = toEventView(doc);
  if (new Date(event.endsAt).getTime() < Date.now()) throw new Error(`${event.title} has already ended`);

  const sendAt = new Date(new Date(event.startsAt).getTime() - REMINDER_HOURS * 60 * 60 * 1000);
  // Past the reminder mark, send right away instead of scheduling into the past.
  const scheduledAt = sendAt.getTime() > Date.now() + 60_000 ? sendAt.toISOString() : undefined;

  const guests = await EventGuest.find({ eventId: event.id, reminderSentAt: null }).sort({ createdAt: 1 });
  console.log(
    `${event.title}: ${guests.length} guest(s) without a reminder — ${scheduledAt ? `scheduled for ${scheduledAt}` : 'sending now'}${send ? '' : ' (dry run)'}`
  );

  let sent = 0;
  for (const guest of guests) {
    if (!send) {
      console.log(`  would remind → ${guest.email}`);
      continue;
    }
    const result = await sendInvitation(event, guest, { reminder: true, scheduledAt });
    if (result.sent) await EventGuest.updateOne({ _id: guest._id }, { reminderSentAt: new Date() });
    console.log(`  ${result.sent ? 'queued' : 'FAILED'} → ${guest.email}${result.error ? ` (${result.error})` : ''}`);
    if (result.sent) sent++;
    else if (sent === 0) {
      console.log('First send failed — stopping so the same error is not repeated for everyone.');
      break;
    }
    // Resend's default rate limit is 2 requests/second.
    await new Promise((r) => setTimeout(r, 600));
  }

  if (send) console.log(`Done: ${sent} queued.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
