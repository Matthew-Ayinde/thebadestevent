import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eventFontVariables } from '@/lib/event-fonts';
import { themeStyle, themeTokens } from '@/lib/event-site';
import { getEventSite, isAdminSession, loadEventSite } from '@/lib/event-site-server';

// Content is admin-edited and drafts depend on the viewer's session.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Public view only, so an unpublished event's details never reach non-admins via <head>.
  const event = await getEventSite((await params).slug);
  if (!event) return { title: 'Not found', robots: { index: false, follow: false } };
  const description = event.tagline || event.invitationLine || `${event.title} by ${event.brandName}.`;
  return {
    title: { absolute: `${event.title} · ${event.brandName}`, template: `%s · ${event.brandName}` },
    description,
    // Replace the root layout's RÌNWÁ identity so each event reads as its own brand.
    applicationName: event.brandName,
    authors: [{ name: event.brandName }],
    creator: event.brandName,
    publisher: event.brandName,
    alternates: { canonical: `/${event.slug}` },
    ...(event.logoUrl ? { icons: { icon: event.logoUrl } } : {}),
    robots: event.isPublished ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${event.title} — ${event.brandName}`,
      description,
      url: `/${event.slug}`,
      siteName: event.brandName,
      images: event.coverImageUrl ? [event.coverImageUrl] : [],
    },
    twitter: { card: event.coverImageUrl ? 'summary_large_image' : 'summary', images: event.coverImageUrl ? [event.coverImageUrl] : [] },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const event = await loadEventSite((await params).slug);
  return { themeColor: event ? themeTokens(event.theme).navy : undefined };
}

// Loads the event whatever its publish state so tickets and the door scanner keep working after
// it is unpublished; the public page itself (page.tsx) decides who may see an unpublished event.
export default async function EventLayout({ children, params }: Props & { children: ReactNode }) {
  const event = await loadEventSite((await params).slug);
  if (!event) notFound();
  const showDraftBanner = !event.isPublished && (await isAdminSession());

  return (
    <div
      data-event-site
      data-backdrop={event.theme.backdrop}
      className={`event-site flex flex-1 flex-col ${eventFontVariables}`}
      style={themeStyle(event.theme)}
    >
      {showDraftBanner && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-black">
          Not published — the public page is only visible to admins. Tickets and the door scanner still work.
          <Link href={`/admin/event-pages/${event.id}`} className="underline underline-offset-2">
            Edit
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
