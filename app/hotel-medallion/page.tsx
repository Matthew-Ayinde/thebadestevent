import { CalendarDays, MapPin } from 'lucide-react';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';
import { AccentRule, MedallionWordmark, PrContact, VenueAddress, VenueMap } from '@/components/hotel-medallion/MedallionBrand';
import { RsvpForm } from '@/components/hotel-medallion/RsvpForm';

export default function HotelMedallionRsvpPage() {
  const e = MEDALLION_EVENT;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-16">
      <header className="text-center">
        <MedallionWordmark />
        <AccentRule className="mt-8" />
        <p className="mt-8 text-xs uppercase tracking-[0.32em] text-(--hm-mist)">You are specially invited to</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl">
          The Relaunch
          <span className="block text-(--hm-accent-soft) italic">Wine &amp; Wings Cocktail Party</span>
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

      <footer className="mt-10">
        <PrContact />
      </footer>
    </main>
  );
}
