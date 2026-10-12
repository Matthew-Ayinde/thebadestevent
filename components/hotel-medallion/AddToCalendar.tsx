import { CalendarPlus } from 'lucide-react';
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/hotel-medallion';

export function AddToCalendar({ token, ticketUrl, className = '' }: { token: string; ticketUrl: string; className?: string }) {
  const options = [
    // The .ics file covers Apple Calendar and any other desktop calendar app.
    { label: 'Apple / iPhone', href: `/api/hotel-medallion/calendar?t=${encodeURIComponent(token)}`, external: false },
    { label: 'Google', href: googleCalendarUrl(ticketUrl), external: true },
    { label: 'Outlook', href: outlookCalendarUrl(ticketUrl), external: true },
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
            {...(o.external ? { target: '_blank', rel: 'noopener noreferrer' } : { download: 'hotel-medallion-relaunch.ics' })}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-(--hm-line) bg-(--hm-navy)/60 px-2 py-3 text-center text-xs font-medium text-(--hm-cream) transition hover:border-(--hm-accent)/60 hover:bg-(--hm-accent)/10 sm:text-sm"
          >
            {o.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-(--hm-dim)">Includes your pass link and a reminder 2 hours before.</p>
    </section>
  );
}
