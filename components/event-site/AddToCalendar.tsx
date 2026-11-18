import { CalendarPlus } from 'lucide-react';
import { googleCalendarUrl, outlookCalendarUrl, type EventSiteView } from '@/lib/event-site';

/** Calendar buttons. With a ticket token the entry carries the guest's pass link. */
export function AddToCalendar({
  event,
  pageUrl,
  token,
  ticketUrl,
  className = '',
}: {
  event: EventSiteView;
  pageUrl: string;
  token?: string;
  ticketUrl?: string;
  className?: string;
}) {
  const links = { pageUrl, ticketUrl };
  const ics = `/api/e/${event.slug}/calendar${token ? `?t=${encodeURIComponent(token)}` : ''}`;
  const options = [
    // The .ics file covers Apple Calendar and any other desktop calendar app.
    { label: 'Apple / iPhone', href: ics, external: false },
    { label: 'Google', href: googleCalendarUrl(event, links), external: true },
    { label: 'Outlook', href: outlookCalendarUrl(event, links), external: true },
  ];

  return (
    <section aria-labelledby="calendar-heading" className={className}>
      <h2 id="calendar-heading" className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-(--hm-mist)">
        <CalendarPlus className="size-4 text-(--hm-accent)" aria-hidden />
        Add to your calendar
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map((o) => (
          <a
            key={o.label}
            href={o.href}
            {...(o.external ? { target: '_blank', rel: 'noopener noreferrer' } : { download: `${event.slug}.ics` })}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-2 py-3 text-center text-xs font-medium text-(--hm-cream) transition hover:border-(--hm-accent)/60 hover:bg-(--hm-accent)/10 sm:text-sm"
          >
            {o.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-(--hm-dim)">
        {token ? 'Includes your pass link and a reminder 2 hours before.' : 'Includes a reminder 2 hours before.'}
      </p>
    </section>
  );
}
