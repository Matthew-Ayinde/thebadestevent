import type { Metadata } from 'next';
import { CalendarDays, MapPin } from 'lucide-react';
import { MEDALLION_EVENT, isMedallionRelaunchOver } from '@/lib/hotel-medallion';
import { MEDALLION_TIMEZONE, formatEventDate, formatEventTime } from '@/lib/hotel-medallion-events';
import { getPastMedallionEvents, getRelaunchAttendance, getUpcomingMedallionEvents } from '@/lib/hotel-medallion-events-server';
import { AccentRule, MedallionWordmark, PrContact, VenueAddress, VenueMap } from '@/components/hotel-medallion/MedallionBrand';
import { PastEvents, UpcomingEvents } from '@/components/hotel-medallion/MedallionEvents';
import { RsvpForm } from '@/components/hotel-medallion/RsvpForm';

// Depends on the clock (RSVP → recap switch) and on admin-published events.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if (!isMedallionRelaunchOver()) return {};
  const description = `Thank you for celebrating ${MEDALLION_EVENT.hotel}’s Relaunch. See what’s coming up next.`;
  return {
    title: { absolute: `${MEDALLION_EVENT.hotel} — Events` },
    description,
    openGraph: { title: `${MEDALLION_EVENT.hotel} — What’s next`, description, url: '/hotel-medallion' },
  };
}

export default async function HotelMedallionPage() {
  const now = new Date();
  const over = isMedallionRelaunchOver(now);
  const [events, attendance, pastEvents] = await Promise.all([
    getUpcomingMedallionEvents(),
    over ? getRelaunchAttendance() : Promise.resolve(null),
    over ? getPastMedallionEvents() : Promise.resolve([]),
  ]);

  return over ? (
    <RelaunchConcluded events={events} pastEvents={pastEvents} attendance={attendance} now={now} />
  ) : (
    <RelaunchRsvp events={events} now={now} />
  );
}

// ─── Before / during the relaunch: RSVP ──────────────────────────────────────

function RelaunchRsvp({ events, now }: { events: Awaited<ReturnType<typeof getUpcomingMedallionEvents>>; now: Date }) {
  const e = MEDALLION_EVENT;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-16">
      <header className="text-center">
        <MedallionWordmark />
        <AccentRule className="mt-8" />
        <p className="mt-8 text-xs uppercase tracking-[0.32em] text-(--hm-mist)">You are specially invited to the relaunch</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl">
          <span className="block text-(--hm-accent-soft) italic">Wings &amp; Wine Cocktail Party</span>
        </h1>

        <dl className="mt-8 flex flex-col items-center gap-3 text-sm text-(--hm-mist)">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarDays className="size-4 text-(--hm-accent)" aria-hidden />
            <dd>{e.timeLabel ? `${e.dateLabel} · ${e.timeLabel}` : e.dateLabel}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Venue</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd className="max-w-sm"><VenueAddress /></dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="rsvp-heading"
        className="mt-10 rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70 p-6 shadow-[0_30px_80px_rgba(2,6,20,0.6)] backdrop-blur-sm sm:p-8"
      >
        <h2 id="rsvp-heading" className="font-serif text-2xl text-(--hm-cream)">Reserve your place</h2>
        <p className="mt-1.5 text-sm text-(--hm-dim)">
          Your personal QR pass will appear on the next screen and be emailed to you.
        </p>
        <RsvpForm />
      </section>

      <VenueMap className="mt-10" />

      <UpcomingEvents events={events} now={now} emptyState={false} className="mt-16" />

      <footer className="mt-10">
        <PrContact />
      </footer>
    </main>
  );
}

// ─── After the relaunch: recap + what's next ─────────────────────────────────

function RelaunchConcluded({
  events,
  pastEvents,
  attendance,
  now,
}: {
  events: Awaited<ReturnType<typeof getUpcomingMedallionEvents>>;
  pastEvents: Awaited<ReturnType<typeof getPastMedallionEvents>>;
  attendance: Awaited<ReturnType<typeof getRelaunchAttendance>>;
  now: Date;
}) {
  const e = MEDALLION_EVENT;
  const stampDate = new Intl.DateTimeFormat('en-GB', { timeZone: MEDALLION_TIMEZONE, day: '2-digit', month: '2-digit' })
    .format(new Date(e.startsAt))
    .replace('/', '.');
  const hours = Math.round((new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime()) / 3_600_000);
  const stats = [
    attendance && attendance.attended > 0 && { value: attendance.attended.toLocaleString('en-US'), label: 'Guests welcomed' },
    attendance && attendance.registered > 0 && { value: attendance.registered.toLocaleString('en-US'), label: 'RSVPs received' },
    { value: String(hours), label: 'Hours of celebration' },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-16">
      <header className="text-center">
        <MedallionWordmark />
        <AccentRule className="mt-8" />
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-(--hm-line) bg-(--hm-ink)/60 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.3em] text-(--hm-mist)">
          <span className="size-1.5 rounded-full bg-(--hm-dim)" aria-hidden />
          This event has concluded
        </p>
        <h1 className="mt-5 font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl">
          Thank you for an
          <span className="block text-(--hm-accent-soft) italic">unforgettable evening</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-(--hm-mist)">
          {e.hotel}’s Relaunch — Wings &amp; Wine Cocktail Party has come to a close. To everyone who raised a glass with
          us: thank you for making the night ours.
        </p>
      </header>

      {/* The keepsake: a spent ticket stub with a "concluded" stamp. */}
      <article
        aria-labelledby="recap-heading"
        className="relative mt-10 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70 shadow-[0_30px_80px_rgba(2,6,20,0.6)]"
      >
        <div className="px-6 pb-6 pt-7 sm:px-8">
          <p className="text-[0.68rem] uppercase tracking-[0.32em] text-(--hm-accent)">The Relaunch</p>
          <h2 id="recap-heading" className="mt-2 pr-24 font-serif text-2xl text-(--hm-cream)">
            Wings &amp; Wine Cocktail Party
          </h2>
          <dl className="mt-5 space-y-3 text-sm text-(--hm-mist)">
            <div className="flex items-center gap-3">
              <dt className="sr-only">Held on</dt>
              <CalendarDays className="size-4 shrink-0 text-(--hm-dim)" aria-hidden />
              <dd>
                {formatEventDate(e.startsAt)}
                <span className="block text-xs text-(--hm-dim)">{formatEventTime(e.startsAt, e.endsAt)}</span>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="sr-only">Venue</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-dim)" aria-hidden />
              <dd>{e.hotel}, Lekki Phase 1, Lagos</dd>
            </div>
          </dl>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-6 flex size-24 -rotate-12 flex-col items-center justify-center rounded-full border-2 border-double border-(--hm-accent)/50 text-center text-(--hm-accent)/80"
        >
          <span className="text-[0.55rem] uppercase tracking-[0.24em]">Held</span>
          <span className="font-serif text-lg leading-none">{stampDate}</span>
          <span className="text-[0.55rem] uppercase tracking-[0.24em]">Concluded</span>
        </div>

        <dl
          className="grid border-t border-dashed border-(--hm-line)"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s, i) => (
            <div key={s.label} className={`px-3 py-5 text-center ${i > 0 ? 'border-l border-(--hm-line)' : ''}`}>
              <dt className="text-[0.62rem] uppercase leading-snug tracking-[0.18em] text-(--hm-dim)">{s.label}</dt>
              <dd className="mt-1.5 font-serif text-2xl text-(--hm-cream)">{s.value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <p className="mt-4 text-center text-xs text-(--hm-dim)">
        RSVPs for the relaunch have closed. Guest passes remain viewable as a keepsake.
      </p>

      <UpcomingEvents events={events} now={now} className="mt-16" />

      <PastEvents events={pastEvents} className="mt-14" />

      <VenueMap className="mt-14" heading="Visit us" />

      <footer className="mt-10">
        <PrContact />
      </footer>
    </main>
  );
}
