import Image from 'next/image';
import { Navigation } from 'lucide-react';
import { MEDALLION_DIRECTIONS_URL, MEDALLION_EVENT, MEDALLION_MAP_EMBED_URL } from '@/lib/hotel-medallion';

export function MedallionLogo({ size = 72, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src={MEDALLION_EVENT.logoPath}
      alt={MEDALLION_EVENT.hotel}
      width={size}
      height={size}
      priority
      unoptimized
      className={`object-contain ${className}`}
    />
  );
}

export function MedallionWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <MedallionLogo size={compact ? 52 : 84} />
      <p className="mt-4 text-[0.65rem] uppercase tracking-[0.5em] text-(--hm-accent)">Hotel</p>
      <p className={`font-serif uppercase tracking-[0.18em] text-(--hm-cream) ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>
        Medallion
      </p>
    </div>
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

export function PrContact() {
  return (
    <p className="text-center text-xs leading-relaxed text-(--hm-dim)">
      For PR inquiries, contact {MEDALLION_EVENT.prContactName}{' '}
      <a
        href={`mailto:${MEDALLION_EVENT.prContactEmail}`}
        className="text-(--hm-accent) underline-offset-4 hover:underline"
      >
        {MEDALLION_EVENT.prContactEmail}
      </a>
    </p>
  );
}

/** The venue address as a tap-for-directions link. */
export function VenueAddress({ className = '' }: { className?: string }) {
  return (
    <a
      href={MEDALLION_DIRECTIONS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-block underline decoration-(--hm-accent)/40 underline-offset-4 transition hover:text-(--hm-cream) hover:decoration-(--hm-accent) ${className}`}
    >
      {MEDALLION_EVENT.venueAddressLines.map((line) => (
        <span key={line} className="block">{line}</span>
      ))}
      <span className="sr-only"> (opens Google Maps directions)</span>
    </a>
  );
}

type VenueOverride = { name: string; addressLines: readonly string[]; directionsUrl: string; embedUrl: string };

/** Embedded Google Map of the venue with a one-tap directions button. Defaults to the hotel. */
export function VenueMap({
  className = '',
  heading = 'Getting there',
  venue,
}: {
  className?: string;
  heading?: string;
  venue?: VenueOverride;
}) {
  const v: VenueOverride = venue ?? {
    name: MEDALLION_EVENT.hotel,
    addressLines: MEDALLION_EVENT.venueAddressLines,
    directionsUrl: MEDALLION_DIRECTIONS_URL,
    embedUrl: MEDALLION_MAP_EMBED_URL,
  };
  return (
    <section aria-labelledby="venue-heading" className={className}>
      <h2 id="venue-heading" className="text-center text-xs uppercase tracking-[0.3em] text-(--hm-mist)">
        {heading}
      </h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-(--hm-line) bg-(--hm-navy)/70">
        <iframe
          src={v.embedUrl}
          title={`Map showing ${v.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block aspect-4/3 w-full border-0"
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-(--hm-mist)">
            <span className="block font-medium text-(--hm-cream)">{v.name}</span>
            {v.addressLines.map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </p>
          <a
            href={v.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-(--hm-accent) px-5 py-3 text-sm font-semibold text-(--hm-navy) transition hover:bg-(--hm-accent-soft) active:scale-[0.98]"
          >
            <Navigation className="size-4" aria-hidden />
            Get directions
          </a>
        </div>
      </div>
    </section>
  );
}
