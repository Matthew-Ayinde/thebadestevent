import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadEventSite, hasScannerSession } from '@/lib/event-site-server';
import { GuestList } from '@/components/event-site/GuestList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guest list',
  robots: { index: false, follow: false },
};

export default async function GuestListPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEventSite((await params).slug);
  if (!event || event.rsvpMode !== 'builtin') notFound();
  if (!(await hasScannerSession(event.id))) redirect(`/${event.slug}/scan`);
  return <GuestList event={event} />;
}
