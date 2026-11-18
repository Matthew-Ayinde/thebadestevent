import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ArrowLeft, ArrowUpRight, CalendarDays, CalendarPlus, Clock, Mail, MapPin, Shirt } from 'lucide-react';
import { MEDALLION_BASE_PATH, MEDALLION_EVENT } from '@/lib/hotel-medallion';
import {
  eventDirectionsUrl,
  eventGoogleCalendarUrl,
  eventMapEmbedUrl,
  eventOutlookCalendarUrl,
  eventStatus,
  formatEventDate,
  formatEventTime,
  type MedallionEventView,
} from '@/lib/hotel-medallion-events';
import { getPublishedMedallionEvent, getUpcomingMedallionEvents } from '@/lib/hotel-medallion-events-server';
import { MedallionLogo, PrContact, VenueMap } from '@/components/hotel-medallion/MedallionBrand';
import { EventArtwork, EventDateBadge, EventStatusChip, UpcomingEvents } from '@/components/hotel-medallion/MedallionEvents';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublishedMedallionEvent((await params).slug);
  if (!event) return { title: 'Event not found', robots: { index: false } };
  const description = event.tagline || `${formatEventDate(event.startsAt)} at ${event.venueName}.`;
  return {
    title: { absolute: `${event.title} · ${MEDALLION_EVENT.hotel}` },
    description,
    alternates: { canonical: `${MEDALLION_BASE_PATH}/events/${event.slug}` },
    openGraph: {
      title: `${event.title} · ${MEDALLION_EVENT.hotel}`,
      description,
      url: `${MEDALLION_BASE_PATH}/events/${event.slug}`,
      images: event.imageUrl ? [event.imageUrl] : [],
    },
  };
}

async function absolutePageUrl(slug: string) {
  let base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!base) {
    const h = await headers();
    base = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  }
  return `${base}${MEDALLION_BASE_PATH}/events/${slug}`;
}

function rsvpAction(event: MedallionEventView) {
  if (event.rsvpUrl) {
    const isMail = event.rsvpUrl.startsWith('mailto:');
    return { href: event.rsvpUrl, label: isMail ? 'Request an invitation' : 'Reserve your place', external: !isMail };
  }
  const subject = encodeURIComponent(`Attending: ${event.title} (${formatEventDate(event.startsAt)})`);
  return { href: `mailto:${MEDALLION_EVENT.prContactEmail}?subject=${subject}`, label: 'Request an invitation', external: false };
}

export default async function MedallionEventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getPublishedMedallionEvent(slug);
  if (!event) notFound();

  const now = new Date();
  const status = eventStatus(event, now);
  const pageUrl = await absolutePageUrl(event.slug);
  const others = (await getUpcomingMedallionEvents(4)).filter((e) => e.id !== event.id).slice(0, 3);
  const cta = rsvpAction(event);
  const paragraphs = event.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const calendarOptions = [
    { label: 'Apple / iPhone', href: `/api/hotel-medallion/events/calendar?e=${encodeURIComponent(event.slug)}`, external: false },
    { label: 'Google', href: eventGoogleCalendarUrl(event, pageUrl), external: true },
    { label: 'Outlook', href: eventOutlookCalendarUrl(event, pageUrl), external: true },
  ];

  const details = [
    { icon: CalendarDays, label: 'Date', value: formatEventDate(event.startsAt) },
    { icon: Clock, label: 'Time', value: `${formatEventTime(event.startsAt, event.endsAt)} (WAT)` },
    { icon: MapPin, label: 'Venue', value: `${event.venueName} · ${event.venueAddress}` },
    ...(event.dressCode ? [{ icon: Shirt, label: 'Dress code', value: event.dressCode }] : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12">
      <nav className="flex items-center justify-between">
        <Link
          href={`${MEDALLION_BASE_PATH}#whats-next`}
          className="inline-flex items-center gap-2 rounded-full border border-(--hm-line) bg-(--hm-navy)/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-(--hm-mist) transition hover:border-(--hm-accent)/60 hover:text-(--hm-cream)"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All events
        </Link>
        <Link href={MEDALLION_BASE_PATH} className="flex items-center gap-2.5" aria-label={`${MEDALLION_EVENT.hotel} home`}>
          <span className="text-right leading-none" aria-hidden>
            <span className="block text-[0.55rem] uppercase tracking-[0.4em] text-(--hm-accent)">Hotel</span>
            <span className="mt-1 block font-serif text-sm uppercase tracking-[0.16em] text-(--hm-cream)">Medallion</span>
          </span>
          <MedallionLogo size={36} />
        </Link>
      </nav>

      <article className="mt-6">
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-(--hm-line) shadow-[0_30px_80px_rgba(2,6,20,0.6)] sm:aspect-16/10">
          <EventArtwork event={event} className={status === 'past' ? 'grayscale-60' : ''} />
          <div className="absolute inset-0 bg-linear-to-t from-(--hm-ink)/90 via-transparent to-transparent" />
          <EventDateBadge iso={event.startsAt} className="absolute bottom-4 left-4" />
          <div className="absolute right-4 top-4">
            <EventStatusChip event={event} now={now} />
          </div>
        </div>

        <header className="mt-8">
          <p className="text-xs uppercase tracking-[0.32em] text-(--hm-accent)">{MEDALLION_EVENT.hotel} presents</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-(--hm-cream) sm:text-4xl">{event.title}</h1>
          {event.tagline && <p className="mt-3 text-base italic leading-relaxed text-(--hm-accent-soft)">{event.tagline}</p>}
        </header>

        {status === 'past' && (
          <p role="status" className="mt-6 rounded-2xl border border-(--hm-line) bg-(--hm-ink)/60 px-5 py-4 text-sm text-(--hm-mist)">
            This event has passed. Thank you to everyone who joined us — see what’s coming up below.
          </p>
        )}

        <dl className="mt-8 divide-y divide-(--hm-line) overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--hm-accent)/10">
                <Icon className="size-4 text-(--hm-accent)" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-[0.65rem] uppercase tracking-[0.24em] text-(--hm-dim)">{label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-(--hm-cream)">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {status !== 'past' && (
          <a
            href={cta.href}
            {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-6 py-4 text-sm font-semibold text-(--hm-navy) shadow-[0_12px_40px_rgba(0,174,241,0.25)] transition hover:bg-(--hm-accent-soft) active:scale-[0.98]"
          >
            {cta.external ? <ArrowUpRight className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            {cta.label}
          </a>
        )}

        {paragraphs.length > 0 && (
          <section aria-labelledby="about-heading" className="mt-12">
            <h2 id="about-heading" className="text-xs uppercase tracking-[0.3em] text-(--hm-mist)">About the evening</h2>
            <div className="mt-4 space-y-4 text-[0.95rem] leading-relaxed text-(--hm-mist)">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </section>
        )}

        {status !== 'past' && (
          <section aria-labelledby="calendar-heading" className="mt-12">
            <h2 id="calendar-heading" className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-(--hm-mist)">
              <CalendarPlus className="size-4 text-(--hm-accent)" aria-hidden />
              Add to your calendar
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {calendarOptions.map((o) => (
                <a
                  key={o.label}
                  href={o.href}
                  {...(o.external ? { target: '_blank', rel: 'noopener noreferrer' } : { download: `hotel-medallion-${event.slug}.ics` })}
                  className="flex min-h-12 items-center justify-center rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-2 py-3 text-center text-xs font-medium text-(--hm-cream) transition hover:border-(--hm-accent)/60 hover:bg-(--hm-accent)/10 sm:text-sm"
                >
                  {o.label}
                </a>
              ))}
            </div>
          </section>
        )}
      </article>

      <VenueMap
        className="mt-12"
        venue={{
          name: event.venueName,
          addressLines: event.venueAddress.split(/,\s*/).reduce<string[]>((lines, part, i, all) => {
            // Two-part lines read better than one long run-on address.
            if (i % 2 === 0) lines.push(all[i + 1] ? `${part}, ${all[i + 1]}` : part);
            return lines;
          }, []),
          directionsUrl: eventDirectionsUrl(event),
          embedUrl: eventMapEmbedUrl(event),
        }}
      />

      {others.length > 0 && <UpcomingEvents events={others} now={now} emptyState={false} className="mt-16" />}

      <footer className="mt-10">
        <PrContact />
      </footer>
    </main>
  );
}
