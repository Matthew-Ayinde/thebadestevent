// Re-sends invitations to every guest of one event whose invite was never delivered.
// Dry run by default; pass --send to actually email.
// Usage: node --env-file=.env.local --import tsx scripts/resend-event-invites.ts --event <slug> [--send]
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { EventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import { sendInvitation, toEventView } from '@/lib/event-site-server';

const send = process.argv.includes('--send');
const slug = process.argv[process.argv.indexOf('--event') + 1];

async function main() {
  if (!process.argv.includes('--event') || !slug) throw new Error('Pass --event <slug>');
  await connectDB();
  const doc = await EventSite.findOne({ slug }).lean();
  if (!doc) throw new Error(`No event page at /${slug}`);
  const event = toEventView(doc);

  const guests = await EventGuest.find({ eventId: event.id, emailSentAt: null }).sort({ createdAt: 1 });
  console.log(`${event.title}: ${guests.length} guest(s) without a delivered invite${send ? '' : ' (dry run)'}`);

  let sent = 0;
  for (const guest of guests) {
    if (!send) {
      console.log(`  would send → ${guest.email}`);
      continue;
    }
    const result = await sendInvitation(event, guest);
    await EventGuest.updateOne(
      { _id: guest._id },
      result.sent ? { emailSentAt: new Date(), emailError: null } : { emailError: result.error ?? 'Unknown error' }
    );
    console.log(`  ${result.sent ? 'sent' : 'FAILED'} → ${guest.email}${result.error ? ` (${result.error})` : ''}`);
    if (result.sent) sent++;
    else if (sent === 0) {
      console.log('First send failed — stopping so the same error is not repeated for everyone.');
      break;
    }
    // Resend's default rate limit is 2 requests/second.
    await new Promise((r) => setTimeout(r, 600));
  }

  if (send) console.log(`Done: ${sent} sent.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
