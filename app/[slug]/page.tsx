import { notFound } from 'next/navigation';
import { ArrowUpRight, CalendarDays, MapPin, Shirt } from 'lucide-react';
import {
  eventHours,
  eventStampDate,
  eventStatus,
  formatEventDate,
  formatEventTime,
  formatEventWhen,
  type EventSiteView,
} from '@/lib/event-site';
import { getAttendance, getEventSite, getMoreFromBrand, pageUrl } from '@/lib/event-site-server';
import { AccentRule, ContactLine, EventWordmark, VenueAddress, VenueMap } from '@/components/event-site/EventBrand';
import { EventStatusChip, PastEvents, UpcomingEvents } from '@/components/event-site/EventLists';
import { AddToCalendar } from '@/components/event-site/AddToCalendar';
import { RsvpForm } from '@/components/event-site/RsvpForm';

type Props = { params: Promise<{ slug: string }> };

export default async function EventPage({ params }: Props) {
  const event = await getEventSite((await params).slug);
  if (!event) notFound();

  const now = new Date();
  const over = eventStatus(event, now) === 'past';
  const [more, attendance] = await Promise.all([
    getMoreFromBrand(event),
    over && event.rsvpMode === 'builtin' ? getAttendance(event.id) : Promise.resolve(null),
  ]);

  return over ? (
    <EventConcluded event={event} more={more} attendance={attendance} now={now} />
  ) : (
    <EventUpcoming event={event} more={more} now={now} />
  );
}

function Paragraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed text-(--hm-mist)">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

// ─── Before / during the event ───────────────────────────────────────────────

function EventUpcoming({
  event,
  more,
  now,
}: {
  event: EventSiteView;
  more: Awaited<ReturnType<typeof getMoreFromBrand>>;
  now: Date;
}) {
  const live = eventStatus(event, now) === 'live';
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-16">
      <header className="text-center">
        <EventWordmark event={event} />
        <AccentRule className="mt-8" />
        {live && (
          <div className="mt-8">
            <EventStatusChip event={event} now={now} />
          </div>
        )}
        {event.eyebrow && <p className="mt-8 text-xs uppercase tracking-[0.32em] text-(--hm-mist)">{event.eyebrow}</p>}
        <h1 className={`${event.eyebrow ? 'mt-3' : 'mt-8'} font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl`}>
          <span className="block italic text-(--hm-accent-soft)">{event.headline}</span>
        </h1>
        {event.tagline && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-(--hm-mist)">{event.tagline}</p>}

        <dl className="mt-8 flex flex-col items-center gap-3 text-sm text-(--hm-mist)">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarDays className="size-4 text-(--hm-accent)" aria-hidden />
            <dd>{formatEventWhen(event)}</dd>
          </div>
          {(event.venueName || event.venueAddressLines.length > 0) && (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Venue</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-accent)" aria-hidden />
              <dd className="max-w-sm"><VenueAddress event={event} /></dd>
            </div>
          )}
          {event.dressCode && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Dress code</dt>
              <Shirt className="size-4 text-(--hm-accent)" aria-hidden />
              <dd>{event.dressCode}</dd>
            </div>
          )}
        </dl>
      </header>

      {event.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URLs may be on any host
        <img
          src={event.coverImageUrl}
          alt=""
          className="mt-10 aspect-16/10 w-full rounded-3xl border border-(--hm-line) object-cover shadow-[0_30px_80px_rgba(2,6,20,0.35)]"
        />
      )}

      {event.rsvpMode === 'builtin' && (
        <section
          aria-labelledby="rsvp-heading"
          className="mt-10 rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70 p-6 shadow-[0_30px_80px_rgba(2,6,20,0.35)] backdrop-blur-sm sm:p-8"
        >
          <h2 id="rsvp-heading" className="font-serif text-2xl text-(--hm-cream)">Reserve your place</h2>
          <p className="mt-1.5 text-sm text-(--hm-dim)">
            Your personal QR pass will appear on the next screen and be emailed to you.
          </p>
          <RsvpForm slug={event.slug} />
        </section>
      )}

      {event.rsvpMode === 'external' && event.rsvpUrl && (
        <a
          href={event.rsvpUrl}
          {...(event.rsvpUrl.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="mt-10 flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-(--hm-on-accent) transition hover:bg-(--hm-accent-soft) active:scale-[0.98]"
        >
          Reserve your place
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      )}

      {event.description && (
        <section aria-labelledby="about-heading" className="mt-12">
          <h2 id="about-heading" className="text-center text-xs uppercase tracking-[0.3em] text-(--hm-mist)">About the event</h2>
          <div className="mt-4">
            <Paragraphs text={event.description} />
          </div>
        </section>
      )}

      {/* Built-in RSVPs get calendar links on their ticket, with the pass attached. */}
      {event.rsvpMode !== 'builtin' && <AddToCalendar event={event} pageUrl={pageUrl(event)} className="mt-12" />}

      <VenueMap event={event} className="mt-10" />

      <UpcomingEvents host={event} events={more.upcoming} now={now} emptyState={false} className="mt-16" />

      <footer className="mt-10">
        <ContactLine event={event} />
      </footer>
    </main>
  );
}

// ─── After the event: recap + what's next ────────────────────────────────────

function EventConcluded({
  event,
  more,
  attendance,
  now,
}: {
  event: EventSiteView;
  more: Awaited<ReturnType<typeof getMoreFromBrand>>;
  attendance: Awaited<ReturnType<typeof getAttendance>>;
  now: Date;
}) {
  const stats = [
    attendance && attendance.attended > 0 && { value: attendance.attended.toLocaleString('en-US'), label: 'Guests welcomed' },
    attendance && attendance.registered > 0 && { value: attendance.registered.toLocaleString('en-US'), label: 'RSVPs received' },
    { value: String(eventHours(event)), label: 'Hours of celebration' },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-16">
      <header className="text-center">
        <EventWordmark event={event} />
        <AccentRule className="mt-8" />
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-(--hm-line) bg-(--hm-ink)/60 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.3em] text-(--hm-mist)">
          <span className="size-1.5 rounded-full bg-(--hm-dim)" aria-hidden />
          This event has concluded
        </p>
        <h1 className="mt-5 font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl">
          Thank you for an
          <span className="block italic text-(--hm-accent-soft)">unforgettable evening</span>
        </h1>
        <div className="mx-auto mt-4 max-w-md">
          {event.recapMessage ? (
            <Paragraphs text={event.recapMessage} />
          ) : (
            <p className="text-sm leading-relaxed text-(--hm-mist)">
              {event.title} has come to a close. To everyone who joined us: thank you for making the night ours.
            </p>
          )}
        </div>
      </header>

      {/* The keepsake: a spent ticket stub with a "concluded" stamp. */}
      <article
        aria-labelledby="recap-heading"
        className="relative mt-10 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70 shadow-[0_30px_80px_rgba(2,6,20,0.35)]"
      >
        <div className="px-6 pb-6 pt-7 sm:px-8">
          <p className="text-[0.68rem] uppercase tracking-[0.32em] text-(--hm-accent)">{event.brandName}</p>
          <h2 id="recap-heading" className="mt-2 pr-24 font-serif text-2xl text-(--hm-cream)">{event.headline}</h2>
          <dl className="mt-5 space-y-3 text-sm text-(--hm-mist)">
            <div className="flex items-center gap-3">
              <dt className="sr-only">Held on</dt>
              <CalendarDays className="size-4 shrink-0 text-(--hm-dim)" aria-hidden />
              <dd>
                {formatEventDate(event)}
                <span className="block text-xs text-(--hm-dim)">{formatEventTime(event)}</span>
              </dd>
            </div>
            {event.venueName && (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Venue</dt>
                <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-dim)" aria-hidden />
                <dd>{event.venueName}</dd>
              </div>
            )}
          </dl>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-6 flex size-24 -rotate-12 flex-col items-center justify-center rounded-full border-2 border-double border-(--hm-accent)/50 text-center text-(--hm-accent)/80"
        >
          <span className="text-[0.55rem] uppercase tracking-[0.24em]">Held</span>
          <span className="font-serif text-lg leading-none">{eventStampDate(event)}</span>
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

      {event.rsvpMode === 'builtin' && (
        <p className="mt-4 text-center text-xs text-(--hm-dim)">
          RSVPs have closed. Guest passes remain viewable as a keepsake.
        </p>
      )}

      <UpcomingEvents host={event} events={more.upcoming} now={now} className="mt-16" />

      <PastEvents events={more.past} now={now} className="mt-14" />

      <VenueMap event={event} className="mt-14" heading="Visit us" />

      <footer className="mt-10">
        <ContactLine event={event} />
      </footer>
    </main>
  );
}
