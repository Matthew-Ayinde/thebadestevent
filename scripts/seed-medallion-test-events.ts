// Seeds published Hotel Medallion test events so /hotel-medallion can be previewed with real data.
// Safe to re-run: events are upserted by slug. All test slugs start with `test-`.
// Usage:
//   node --env-file=.env.local --import tsx scripts/seed-medallion-test-events.ts           # seed / refresh
//   node --env-file=.env.local --import tsx scripts/seed-medallion-test-events.ts --remove  # delete them
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { MedallionEvent } from '@/models/MedallionEvent';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';
import { fromLagosLocal } from '@/lib/hotel-medallion-events';

const TEST_EVENTS = [
  {
    slug: 'test-jazz-and-small-plates',
    title: 'Jazz & Small Plates',
    tagline: 'A slow evening of live jazz, chef’s small plates and signature cocktails.',
    description: [
      'Join us in the Medallion lounge for an intimate night of live jazz from a Lagos quartet, paired with a rotating menu of small plates from our kitchen.',
      'Arrive from 7 PM for a welcome cocktail. Seating is limited and offered on a first-come basis, so we recommend reserving early.',
      'Complimentary valet parking is available for all guests.',
    ].join('\n\n'),
    startsAt: fromLagosLocal('2026-12-05T19:00'),
    endsAt: fromLagosLocal('2026-12-05T23:00'),
    venueName: MEDALLION_EVENT.hotel,
    venueAddress: MEDALLION_EVENT.venueAddress,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80',
    rsvpUrl: '',
    dressCode: 'Smart elegant',
    isPublished: true,
  },
  {
    slug: 'test-new-years-eve-rooftop',
    title: 'New Year’s Eve on the Rooftop',
    tagline: 'Count down to 2027 above Lekki.',
    description: 'Live DJ, champagne at midnight and fireworks views from the rooftop terrace.',
    startsAt: fromLagosLocal('2026-12-31T21:00'),
    endsAt: fromLagosLocal('2027-01-01T02:00'),
    venueName: MEDALLION_EVENT.hotel,
    venueAddress: MEDALLION_EVENT.venueAddress,
    imageUrl: '',
    rsvpUrl: '',
    dressCode: 'All white',
    isPublished: true,
  },
];

async function main() {
  await connectDB();
  console.log(`Database: ${mongoose.connection.name}`);

  if (process.argv.includes('--remove')) {
    const { deletedCount } = await MedallionEvent.deleteMany({ slug: { $in: TEST_EVENTS.map((e) => e.slug) } });
    console.log(`Removed ${deletedCount} test event(s).`);
    return;
  }

  for (const event of TEST_EVENTS) {
    await MedallionEvent.updateOne({ slug: event.slug }, { $set: event }, { upsert: true });
    console.log(`Seeded → /hotel-medallion/events/${event.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
