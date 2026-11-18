import { Navigation } from 'lucide-react';
import { directionsUrl, mapEmbedUrl, type EventSiteView } from '@/lib/event-site';

type Brand = Pick<EventSiteView, 'logoUrl' | 'brandName' | 'brandEyebrow' | 'brandWordmark'>;

export function EventLogo({ event, size = 72, className = '' }: { event: Pick<Brand, 'logoUrl' | 'brandName'>; size?: number; className?: string }) {
  if (!event.logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logos may live on any host
    <img
      src={event.logoUrl}
      alt={event.brandName}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function EventWordmark({ event, compact = false }: { event: Brand; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <EventLogo event={event} size={compact ? 52 : 84} />
      {event.brandEyebrow && (
        <p className={`${event.logoUrl ? 'mt-4' : ''} text-[0.65rem] uppercase tracking-[0.5em] text-(--hm-accent)`}>{event.brandEyebrow}</p>
      )}
      <p className={`font-serif uppercase tracking-[0.18em] text-(--hm-cream) ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>
        {event.brandWordmark}
      </p>
    </div>
  );
}

/** Small inline brand lockup for headers. */
export function EventBrandInline({ event }: { event: Brand }) {
  return (
    <span className="flex items-center gap-2.5">
      <EventLogo event={event} size={36} />
      <span className="leading-none">
        {event.brandEyebrow && (
          <span className="block text-[0.55rem] uppercase tracking-[0.4em] text-(--hm-accent)">{event.brandEyebrow}</span>
        )}
        <span className="mt-1 block font-serif text-sm uppercase tracking-[0.16em] text-(--hm-cream)">{event.brandWordmark}</span>
      </span>
    </span>
  );
}

export function AccentRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="h-px w-12 bg-linear-to-r from-transparent to-(--hm-accent)/70" />
      <span className="size-1.5 rotate-45 bg-(--hm-accent)" />
      <span className="h-px w-12 bg-linear-to-l from-transparent to-(--hm-accent)/70" />
    </div>
  );
}

export function ContactLine({ event }: { event: Pick<EventSiteView, 'contactName' | 'contactEmail'> }) {
  if (!event.contactEmail) return null;
  return (
    <p className="text-center text-xs leading-relaxed text-(--hm-dim)">
      For enquiries, contact {event.contactName}{' '}
      <a href={`mailto:${event.contactEmail}`} className="text-(--hm-accent) underline-offset-4 hover:underline">
        {event.contactEmail}
      </a>
    </p>
  );
}

type Venue = Pick<EventSiteView, 'venueName' | 'venueAddressLines' | 'mapsQuery'>;

/** The venue address as a tap-for-directions link. */
export function VenueAddress({ event, className = '' }: { event: Venue; className?: string }) {
  const lines = event.venueAddressLines.length ? event.venueAddressLines : [event.venueName];
  return (
    <a
      href={directionsUrl(event)}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-block underline decoration-(--hm-accent)/40 underline-offset-4 transition hover:text-(--hm-cream) hover:decoration-(--hm-accent) ${className}`}
    >
      {lines.map((line) => (
        <span key={line} className="block">{line}</span>
      ))}
      <span className="sr-only"> (opens Google Maps directions)</span>
    </a>
  );
}

/** Embedded Google Map of the venue with a one-tap directions button. */
export function VenueMap({ event, className = '', heading = 'Getting there' }: { event: Venue; className?: string; heading?: string }) {
  if (!event.venueName && !event.venueAddressLines.length && !event.mapsQuery) return null;
  return (
    <section aria-labelledby="venue-heading" className={className}>
      <h2 id="venue-heading" className="text-center text-xs uppercase tracking-[0.3em] text-(--hm-mist)">
        {heading}
      </h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70">
        <iframe
          src={mapEmbedUrl(event)}
          title={`Map showing ${event.venueName || 'the venue'}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block aspect-4/3 w-full border-0"
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-(--hm-mist)">
            {event.venueName && <span className="block font-medium text-(--hm-cream)">{event.venueName}</span>}
            {event.venueAddressLines.map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </p>
          <a
            href={directionsUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-5 py-3 text-sm font-semibold text-(--hm-on-accent) transition hover:bg-(--hm-accent-soft) active:scale-[0.98]"
          >
            <Navigation className="size-4" aria-hidden />
            Get directions
          </a>
        </div>
      </div>
    </section>
  );
}
