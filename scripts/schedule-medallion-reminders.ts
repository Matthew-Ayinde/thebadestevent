// Schedules the reminder for every guest, delivered by Resend exactly REMINDER_HOURS before the event.
// Guests already scheduled are skipped, so it is safe to re-run for late sign-ups.
// Dry run by default; pass --send to actually schedule.
// Usage: node --env-file=.env.local --import tsx scripts/schedule-medallion-reminders.ts [--send]
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { MedallionGuest } from '@/models/MedallionGuest';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';
import { sendMedallionInvitation } from '@/lib/hotel-medallion-server';

const send = process.argv.includes('--send');
const REMINDER_HOURS = 12;

async function main() {
  const sendAt = new Date(new Date(MEDALLION_EVENT.startsAt).getTime() - REMINDER_HOURS * 60 * 60 * 1000);
  // Past the reminder mark, send right away instead of scheduling into the past.
  const scheduledAt = sendAt.getTime() > Date.now() + 60_000 ? sendAt.toISOString() : undefined;

  await connectDB();
  const guests = await MedallionGuest.find({ reminderSentAt: null }).sort({ createdAt: 1 });
  console.log(
    `${guests.length} guest(s) without a reminder — ${scheduledAt ? `scheduled for ${scheduledAt}` : 'sending now'}${send ? '' : ' (dry run)'}`
  );

  let sent = 0;
  for (const guest of guests) {
    if (!send) {
      console.log(`  would remind → ${guest.email}`);
      continue;
    }
    const result = await sendMedallionInvitation(guest, { reminder: true, scheduledAt });
    if (result.sent) await MedallionGuest.updateOne({ _id: guest._id }, { reminderSentAt: new Date() });
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
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
