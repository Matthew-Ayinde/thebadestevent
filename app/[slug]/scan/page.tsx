import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadEventSite, hasScannerSession } from '@/lib/event-site-server';
import { ScannerLogin } from '@/components/event-site/ScannerLogin';
import { DoorScanner } from '@/components/event-site/DoorScanner';

// Must render per request: the session cookie decides what door staff see.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Door check-in',
  robots: { index: false, follow: false },
};

export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEventSite((await params).slug);
  if (!event || event.rsvpMode !== 'builtin') notFound();
  if (await hasScannerSession(event.id)) return <DoorScanner event={event} />;
  return <ScannerLogin event={event} />;
}
