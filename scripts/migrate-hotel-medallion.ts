// One-off move from the hardcoded /hotel-medallion microsite to admin-managed event pages.
//  1. Creates the "hotel-medallion" event page from the values that used to be hardcoded.
//  2. Carries the old MEDALLION_SCANNER_PASSCODE over as that page's door passcode.
//  3. Attaches every existing guest to it (guests are now per event).
//  4. Replaces the old one-RSVP-per-email index with one-per-email-per-event.
//  5. Converts events added via the old "Hotel Medallion events" admin page into event pages.
// Dry run by default; pass --apply to write. Safe to re-run.
// Usage: node --env-file=.env.local --import tsx scripts/migrate-hotel-medallion.ts [--apply]
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { EventSite } from '@/models/EventSite';
import { EventGuest } from '@/models/EventGuest';
import { DEFAULT_THEME, slugProblem } from '@/lib/event-site';

const apply = process.argv.includes('--apply');
const SLUG = 'hotel-medallion';

const MEDALLION_ADDRESS = ['Plot 61, Babatunde Anjous Avenue', 'Off Admiralty Way, Lekki Phase 1', 'Lagos, Nigeria'];

const BRAND = {
  brandName: 'Hotel Medallion',
  brandEyebrow: 'Hotel',
  brandWordmark: 'Medallion',
  logoUrl: '/hotel-medallion/logo.png',
  timezone: 'Africa/Lagos',
  venueName: 'Hotel Medallion',
  venueAddressLines: MEDALLION_ADDRESS,
  mapsQuery: 'Hotel Medallion, Plot 61 Babatunde Anjous Avenue, Lekki Phase 1, Lagos, Nigeria',
  contactName: 'RINWA',
  contactEmail: 'info@rinwahospitality.com',
  codePrefix: 'HM',
  theme: DEFAULT_THEME,
};

const RELAUNCH = {
  ...BRAND,
  slug: SLUG,
  isPublished: true,
  title: 'Hotel Medallion Relaunch — Wings & Wine Cocktail Party',
  eyebrow: 'You are specially invited to the relaunch',
  headline: 'Wings & Wine Cocktail Party',
  tagline: '',
  invitationLine: 'You are specially invited to Hotel Medallion’s Relaunch - Wings & Wine cocktail party',
  recapMessage:
    'Hotel Medallion’s Relaunch — Wings & Wine Cocktail Party has come to a close. To everyone who raised a glass with us: thank you for making the night ours.',
  startsAt: new Date('2026-10-30T18:00:00+01:00'),
  endsAt: new Date('2026-10-30T22:00:00+01:00'),
  rsvpMode: 'builtin' as const,
};

const log = (msg: string) => console.log(`${apply ? '' : '[dry run] '}${msg}`);

async function main() {
  await connectDB();
  const db = mongoose.connection.db!;
  console.log(`Database: ${mongoose.connection.name}`);

  // 1. The relaunch event page.
  let relaunch = await EventSite.findOne({ slug: SLUG }).select('+scannerPasscodeHash');
  if (relaunch) {
    log(`/${SLUG} event page already exists — leaving its content as is.`);
  } else {
    log(`Create /${SLUG} event page.`);
    if (apply) relaunch = await EventSite.create(RELAUNCH);
  }

  // 2. Door passcode.
  const passcode = process.env.MEDALLION_SCANNER_PASSCODE?.trim();
  if (relaunch?.scannerPasscodeHash) {
    log('Door passcode already set.');
  } else if (passcode) {
    log('Copy MEDALLION_SCANNER_PASSCODE as the door passcode.');
    if (apply && relaunch) await EventSite.updateOne({ _id: relaunch._id }, { scannerPasscodeHash: await bcryptjs.hash(passcode, 10) });
  } else {
    log('No MEDALLION_SCANNER_PASSCODE in the environment — set a door passcode in the admin console.');
  }

  // 3. Guests.
  const guests = db.collection('medallionguests');
  const orphaned = await guests.countDocuments({ eventId: { $exists: false } });
  log(`Attach ${orphaned} existing guest(s) to /${SLUG}.`);
  if (apply && orphaned && relaunch) {
    await guests.updateMany({ eventId: { $exists: false } }, { $set: { eventId: relaunch._id } });
  }

  // 4. Indexes.
  const indexes = await guests.indexes().catch(() => []);
  if (indexes.some((i) => i.name === 'email_1')) {
    log('Drop the old unique email index (an email can now RSVP to several events).');
    if (apply) await guests.dropIndex('email_1');
  }
  log('Create per-event guest indexes.');
  if (apply) {
    await EventGuest.createIndexes();
    await EventSite.createIndexes();
  }

  // 5. Events from the old "Hotel Medallion events" admin page.
  const legacy = db.collection('medallionevents');
  const legacyEvents = await legacy.find().toArray().catch(() => []);
  let skipped = 0;
  for (const e of legacyEvents) {
    const slug = String(e.slug);
    const problem = slugProblem(slug);
    if (problem) {
      log(`Skip /${slug} — ${problem}.`);
      skipped++;
      continue;
    }
    if (await EventSite.exists({ slug })) {
      log(`Skip /${slug} — an event page with that URL already exists.`);
      skipped++;
      continue;
    }
    log(`Convert “${e.title}” → /${slug}${e.isPublished ? '' : ' (draft)'}.`);
    if (apply) {
      await EventSite.create({
        ...BRAND,
        slug,
        isPublished: Boolean(e.isPublished),
        title: e.title,
        headline: e.title,
        tagline: e.tagline ?? '',
        description: e.description ?? '',
        coverImageUrl: e.imageUrl ?? '',
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        venueName: e.venueName || BRAND.venueName,
        venueAddressLines: e.venueAddress && e.venueAddress !== MEDALLION_ADDRESS.join(', ') ? [e.venueAddress] : MEDALLION_ADDRESS,
        dressCode: e.dressCode ?? '',
        // Those events only had an optional external link; with none, keep it an information page.
        rsvpMode: e.rsvpUrl ? 'external' : 'none',
        rsvpUrl: e.rsvpUrl ?? '',
      });
    }
  }
  if (legacyEvents.length && !skipped) {
    log('Drop the old medallionevents collection.');
    if (apply) await legacy.drop();
  } else if (skipped) {
    log(`Keeping the old medallionevents collection — ${skipped} event(s) weren't converted; review them first.`);
  }

  console.log(apply ? 'Migration complete.' : 'Dry run complete — re-run with --apply to write these changes.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
