// Re-sends Hotel Medallion invitations to every guest whose invite was never delivered.
// Dry run by default; pass --send to actually email.
// Usage: node --env-file=.env.local --import tsx scripts/resend-medallion-invites.ts [--send]
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { MedallionGuest } from '@/models/MedallionGuest';
import { sendMedallionInvitation } from '@/lib/hotel-medallion-server';

const send = process.argv.includes('--send');

async function main() {
  await connectDB();
  const guests = await MedallionGuest.find({ emailSentAt: null }).sort({ createdAt: 1 });
  console.log(`${guests.length} guest(s) without a delivered invite${send ? '' : ' (dry run)'}`);

  let sent = 0;
  for (const guest of guests) {
    if (!send) {
      console.log(`  would send → ${guest.email}`);
      continue;
    }
    const result = await sendMedallionInvitation(guest);
    await MedallionGuest.updateOne(
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
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
