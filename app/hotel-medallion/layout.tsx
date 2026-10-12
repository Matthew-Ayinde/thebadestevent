import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';

export const metadata: Metadata = {
  title: {
    absolute: `${MEDALLION_EVENT.hotel} Relaunch — Wings & Wine`,
    template: `%s · ${MEDALLION_EVENT.hotel}`,
  },
  description: `RSVP for ${MEDALLION_EVENT.hotel}’s Relaunch — Wings & Wine cocktail party, ${MEDALLION_EVENT.dateLabel}.`,
  // Replace the root layout's RÌNWÁ identity so the microsite reads as its own brand.
  applicationName: MEDALLION_EVENT.hotel,
  authors: [{ name: MEDALLION_EVENT.hotel }],
  creator: MEDALLION_EVENT.hotel,
  publisher: MEDALLION_EVENT.hotel,
  keywords: [MEDALLION_EVENT.hotel, 'relaunch', 'Wings & Wine', 'cocktail party', 'RSVP'],
  alternates: { canonical: '/hotel-medallion' },
  icons: { icon: MEDALLION_EVENT.logoPath },
  openGraph: {
    title: `${MEDALLION_EVENT.hotel} — Wings & Wine`,
    description: `You are specially invited to the relaunch. ${MEDALLION_EVENT.dateLabel}.`,
    url: '/hotel-medallion',
    siteName: MEDALLION_EVENT.hotel,
    images: [],
  },
  twitter: { card: 'summary', images: [] },
};

export const viewport: Viewport = {
  themeColor: '#0a1a3f',
};

export default function HotelMedallionLayout({ children }: { children: ReactNode }) {
  return <div className="medallion flex flex-1 flex-col">{children}</div>;
}
