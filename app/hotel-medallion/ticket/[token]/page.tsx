import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { connectDB } from '@/lib/mongodb';
import { MedallionGuest } from '@/models/MedallionGuest';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';
import { ticketQrSvg, ticketUrl } from '@/lib/hotel-medallion-server';
import { AccentRule, MedallionWordmark, PrContact, VenueAddress, VenueMap } from '@/components/hotel-medallion/MedallionBrand';
import { TicketActions } from '@/components/hotel-medallion/TicketActions';
import { AddToCalendar } from '@/components/hotel-medallion/AddToCalendar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your pass',
  robots: { index: false, follow: false },
};

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  await connectDB();
  const guest = await MedallionGuest.findOne({ token }).select('firstName lastName code checkedInAt').lean();
  if (!guest) notFound();

  const e = MEDALLION_EVENT;
  const name = `${guest.firstName} ${guest.lastName}`;
  const when = e.timeLabel ? `${e.dateLabel} · ${e.timeLabel}` : e.dateLabel;
  const qrSvg = await ticketQrSvg(token);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:py-14">
      <MedallionWordmark compact />

      <article className="mt-8 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/80 shadow-[0_30px_80px_rgba(2,6,20,0.6)]">
        <div className="px-6 pt-7 text-center sm:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-(--hm-accent)">You’re on the list</p>
          <h1 className="mt-3 font-serif text-3xl text-(--hm-cream)">{name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-(--hm-mist)">{e.invitationLine}</p>
          <AccentRule className="mt-6" />
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div className="mx-auto w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-[0_0_0_6px_rgba(0,174,241,0.15)]">
            <div
              role="img"
              aria-label={`Entry QR code for ${name}`}
              className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <p className="mt-4 text-center font-mono text-sm tracking-[0.28em] text-(--hm-mist)">{guest.code}</p>
          <p className="mt-2 text-center text-xs text-(--hm-dim)">
            Present this code at the entrance. It admits one guest.
          </p>
        </div>

        <dl className="space-y-3 border-t border-dashed border-(--hm-line) px-6 py-6 text-sm text-(--hm-mist) sm:px-8">
          <div className="flex items-center gap-3">
            <dt className="sr-only">Date</dt>
            <CalendarDays className="size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd>{when}</dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="sr-only">Venue</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd><VenueAddress /></dd>
          </div>
        </dl>
      </article>

      <TicketActions token={token} code={guest.code} name={name} />

      <AddToCalendar token={token} ticketUrl={ticketUrl(token)} className="mt-8" />

      <p className="mt-6 text-center text-xs text-(--hm-dim)">
        A copy of this pass has also been sent to your email.
      </p>

      <VenueMap className="mt-10" />

      <footer className="mt-8">
        <PrContact />
      </footer>
    </main>
  );
}
