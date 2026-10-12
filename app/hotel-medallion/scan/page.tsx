import type { Metadata } from 'next';
import { hasScannerSession, isScannerConfigured } from '@/lib/hotel-medallion-server';
import { ScannerLogin } from '@/components/hotel-medallion/ScannerLogin';
import { DoorScanner } from '@/components/hotel-medallion/DoorScanner';

// Must render per request: the session cookie and passcode env decide what door staff see.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Door check-in',
  robots: { index: false, follow: false },
};

export default async function ScanPage() {
  if (await hasScannerSession()) return <DoorScanner />;
  return <ScannerLogin configured={isScannerConfigured()} />;
}
