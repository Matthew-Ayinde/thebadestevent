import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { connectDB } from '@/lib/mongodb';
import { EventGuest } from '@/models/EventGuest';
import { eventPath, eventStatus, formatEventWhen, qrInk } from '@/lib/event-site';
import { TOKEN_RE, loadEventSite, pageUrl, ticketQrSvg, ticketUrl } from '@/lib/event-site-server';
import { AccentRule, ContactLine, EventWordmark, VenueAddress, VenueMap } from '@/components/event-site/EventBrand';
import { TicketActions } from '@/components/event-site/TicketActions';
import { AddToCalendar } from '@/components/event-site/AddToCalendar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your pass',
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ slug: string; token: string }> };

export default async function TicketPage({ params }: Props) {
  const { slug, token } = await params;
  if (!TOKEN_RE.test(token)) notFound();
  const event = await loadEventSite(slug);
  if (!event) notFound();

  await connectDB();
  const guest = await EventGuest.findOne({ token, eventId: event.id }).select('firstName lastName code checkedInAt').lean();
  if (!guest) notFound();

  const name = `${guest.firstName} ${guest.lastName}`;
  const qrSvg = await ticketQrSvg(token, qrInk(event));
  // After the event the pass becomes a keepsake: no entry instructions, no calendar prompts.
  const over = eventStatus(event) === 'past';
  const attended = Boolean(guest.checkedInAt);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:py-14">
      <EventWordmark event={event} compact />

      <article className="mt-8 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/80 shadow-[0_30px_80px_rgba(2,6,20,0.35)]">
        <div className="px-6 pt-7 text-center sm:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-(--hm-accent)">
            {over ? (attended ? 'Thank you for joining us' : 'This event has concluded') : 'You’re on the list'}
          </p>
          <h1 className="mt-3 font-serif text-3xl text-(--hm-cream)">{name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-(--hm-mist)">{event.invitationLine || event.title}</p>
          <AccentRule className="mt-6" />
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div
            className={`mx-auto w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-[0_0_0_6px_color-mix(in_srgb,var(--hm-accent)_15%,transparent)] ${over ? 'opacity-40 grayscale' : ''}`}
          >
            <div
              role="img"
              aria-label={`Entry QR code for ${name}`}
              className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <p className="mt-4 text-center font-mono text-sm tracking-[0.28em] text-(--hm-mist)">{guest.code}</p>
          <p className="mt-2 text-center text-xs text-(--hm-dim)">
            {over
              ? 'This pass is no longer valid for entry. Keep it as a memento of the night.'
              : 'Present this code at the entrance. It admits one guest.'}
          </p>
        </div>

        <dl className="space-y-3 border-t border-dashed border-(--hm-line) px-6 py-6 text-sm text-(--hm-mist) sm:px-8">
          <div className="flex items-center gap-3">
            <dt className="sr-only">Date</dt>
            <CalendarDays className="size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd>{formatEventWhen(event)}</dd>
          </div>
          {(event.venueName || event.venueAddressLines.length > 0) && (
            <div className="flex items-start gap-3">
              <dt className="sr-only">Venue</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-accent)" aria-hidden />
              <dd><VenueAddress event={event} /></dd>
            </div>
          )}
        </dl>
      </article>

      {over ? (
        event.isPublished ? (
          <Link
            href={`${eventPath(event)}#whats-next`}
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-6 py-4 text-sm font-semibold text-(--hm-on-accent) transition hover:bg-(--hm-accent-soft) active:scale-[0.98]"
          >
            See what’s next from {event.brandName}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null
      ) : (
        <>
          <TicketActions event={event} token={token} code={guest.code} name={name} />
          <AddToCalendar event={event} pageUrl={pageUrl(event)} token={token} ticketUrl={ticketUrl(event, token)} className="mt-8" />
          <p className="mt-6 text-center text-xs text-(--hm-dim)">A copy of this pass has also been sent to your email.</p>
          <VenueMap event={event} className="mt-10" />
        </>
      )}

      <footer className="mt-8">
        <ContactLine event={event} />
      </footer>
    </main>
  );
}
