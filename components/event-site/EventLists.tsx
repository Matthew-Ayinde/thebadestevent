import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, MapPin, Sparkles } from 'lucide-react';
import {
  eventDateParts,
  eventPath,
  eventStatus,
  formatEventDate,
  formatEventTime,
  relativeDayLabel,
  type EventSiteView,
} from '@/lib/event-site';
import { EventLogo } from '@/components/event-site/EventBrand';

/** Calendar-leaf date badge: weekday / day / month. */
export function EventDateBadge({ event, className = '' }: { event: EventSiteView; className?: string }) {
  const { day, month, weekday } = eventDateParts(event);
  return (
    <div
      className={`flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-(--hm-line) bg-(--hm-ink)/80 text-center backdrop-blur-sm ${className}`}
      aria-hidden
    >
      <span className="w-full bg-(--hm-accent) py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-(--hm-on-accent)">
        {weekday}
      </span>
      <span className="pt-1 font-serif text-2xl leading-none text-(--hm-cream)">{day}</span>
      <span className="pb-1.5 pt-0.5 text-[0.6rem] tracking-[0.24em] text-(--hm-mist)">{month}</span>
    </div>
  );
}

/** "In 3 weeks" / "Happening now" / "Concluded" pill. */
export function EventStatusChip({ event, now }: { event: EventSiteView; now: Date }) {
  const status = eventStatus(event, now);
  if (status === 'past') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--hm-line) bg-(--hm-ink)/70 px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-(--hm-dim)">
        Concluded
      </span>
    );
  }
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-(--hm-ok)/40 bg-(--hm-ok)/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-(--hm-ok)">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--hm-ok) opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-(--hm-ok)" />
        </span>
        Happening now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-(--hm-accent)/40 bg-(--hm-ink)/60 px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-(--hm-accent-soft) backdrop-blur-sm">
      {relativeDayLabel(event, now)}
    </span>
  );
}

/** Cover image, or a branded placeholder when none was uploaded. */
export function EventArtwork({ event, className = '' }: { event: EventSiteView; className?: string }) {
  if (event.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URLs may be on any host
      <img src={event.coverImageUrl} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--hm-accent)_25%,transparent),transparent_55%),linear-gradient(135deg,var(--hm-royal),var(--hm-ink))] ${className}`}
    >
      <EventLogo event={event} size={72} className="opacity-40" />
    </div>
  );
}

function FeaturedEventCard({ event, now }: { event: EventSiteView; now: Date }) {
  return (
    <Link
      href={eventPath(event)}
      className="group block overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70 shadow-[0_30px_80px_rgba(2,6,20,0.35)] transition hover:border-(--hm-accent)/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--hm-accent)/30"
    >
      <div className="relative aspect-16/10 overflow-hidden">
        <EventArtwork event={event} className="transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-linear-to-t from-(--hm-navy) via-(--hm-navy)/30 to-transparent" />
        <EventDateBadge event={event} className="absolute left-4 top-4" />
        <div className="absolute right-4 top-4">
          <EventStatusChip event={event} now={now} />
        </div>
      </div>
      <div className="relative -mt-12 px-6 pb-6 sm:px-7">
        <p className="text-[0.68rem] uppercase tracking-[0.32em] text-(--hm-accent)">Next from {event.brandName}</p>
        <h3 className="mt-2 font-serif text-2xl leading-tight text-(--hm-cream) sm:text-3xl">{event.title}</h3>
        {event.tagline && <p className="mt-2 text-sm leading-relaxed text-(--hm-mist)">{event.tagline}</p>}
        <dl className="mt-5 grid gap-2.5 text-sm text-(--hm-mist)">
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Date</dt>
            <CalendarDays className="size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd>{formatEventDate(event)}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Time</dt>
            <Clock className="size-4 shrink-0 text-(--hm-accent)" aria-hidden />
            <dd>{formatEventTime(event)}</dd>
          </div>
          {event.venueName && (
            <div className="flex items-start gap-2.5">
              <dt className="sr-only">Venue</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-(--hm-accent)" aria-hidden />
              <dd>{event.venueName}</dd>
            </div>
          )}
        </dl>
        <span className="mt-6 flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-5 py-3 text-sm font-semibold text-(--hm-on-accent) transition group-hover:bg-(--hm-accent-soft)">
          View event
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function CompactEventRow({ event, now, past = false }: { event: EventSiteView; now: Date; past?: boolean }) {
  return (
    <li>
      <Link
        href={eventPath(event)}
        className={`group flex items-center gap-4 rounded-2xl border border-(--hm-line) p-3 pr-4 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--hm-accent)/30 ${
          past ? 'bg-(--hm-ink)/40 opacity-80 hover:opacity-100' : 'bg-(--hm-navy)/50 hover:border-(--hm-accent)/50 hover:bg-(--hm-navy)/80'
        }`}
      >
        <EventDateBadge event={event} className={past ? 'grayscale' : ''} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg text-(--hm-cream)">{event.title}</p>
          <p className="mt-0.5 truncate text-xs text-(--hm-dim)">
            {past ? `${formatEventDate(event)} · Concluded` : `${formatEventTime(event)} · ${relativeDayLabel(event, now)}`}
          </p>
        </div>
        <ArrowRight className={`size-4 shrink-0 transition group-hover:translate-x-0.5 ${past ? 'text-(--hm-dim)' : 'text-(--hm-accent)'}`} aria-hidden />
      </Link>
    </li>
  );
}

/** "What's next" — featured next event, the rest as a compact list, or a graceful empty state. */
export function UpcomingEvents({
  host,
  events,
  now,
  className = '',
  emptyState = true,
}: {
  host: EventSiteView;
  events: EventSiteView[];
  now: Date;
  className?: string;
  emptyState?: boolean;
}) {
  if (!events.length && !emptyState) return null;
  const [next, ...rest] = events;

  return (
    <section id="whats-next" aria-labelledby="whats-next-heading" className={`scroll-mt-8 ${className}`}>
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-(--hm-accent)">What’s next</p>
        <h2 id="whats-next-heading" className="mt-2 font-serif text-3xl text-(--hm-cream)">
          More from {host.brandName}
        </h2>
      </div>

      {next ? (
        <div className="mt-8 space-y-4">
          <FeaturedEventCard event={next} now={now} />
          {rest.length > 0 && (
            <>
              <p className="pt-4 text-center text-xs uppercase tracking-[0.3em] text-(--hm-mist)">Also coming up</p>
              <ul className="space-y-3">
                {rest.map((e) => (
                  <CompactEventRow key={e.id} event={e} now={now} />
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-(--hm-line) bg-(--hm-navy)/40 px-6 py-10 text-center">
          <Sparkles className="mx-auto size-6 text-(--hm-accent)" aria-hidden />
          <p className="mt-4 font-serif text-xl text-(--hm-cream)">New evenings are being planned</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-(--hm-dim)">
            Our next gatherings will be announced here first.{host.contactEmail ? ' Want an early invitation?' : ''}
          </p>
          {host.contactEmail && (
            <a
              href={`mailto:${host.contactEmail}?subject=${encodeURIComponent(`Notify me — upcoming ${host.brandName} events`)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-(--hm-accent)/50 px-5 py-2.5 text-sm font-medium text-(--hm-accent-soft) transition hover:bg-(--hm-accent)/10"
            >
              Ask to be notified
              <ArrowRight className="size-4" aria-hidden />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

/** "Past evenings" archive — muted rows so they never compete with what's coming up. */
export function PastEvents({ events, now, className = '' }: { events: EventSiteView[]; now: Date; className?: string }) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="past-events-heading" className={className}>
      <h2 id="past-events-heading" className="text-center text-xs uppercase tracking-[0.3em] text-(--hm-mist)">
        Past evenings
      </h2>
      <ul className="mt-4 space-y-3">
        {events.map((e) => (
          <CompactEventRow key={e.id} event={e} now={now} past />
        ))}
      </ul>
    </section>
  );
}
