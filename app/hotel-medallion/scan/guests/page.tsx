import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasScannerSession } from '@/lib/hotel-medallion-server';
import { GuestList } from '@/components/hotel-medallion/GuestList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guest list',
  robots: { index: false, follow: false },
};

export default async function GuestListPage() {
  if (!(await hasScannerSession())) redirect('/hotel-medallion/scan');
  return <GuestList />;
}
