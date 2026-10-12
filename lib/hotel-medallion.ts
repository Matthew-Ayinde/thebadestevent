// Single source of truth for the Hotel Medallion relaunch microsite.
// Safe to import from client components — no secrets here.

export const MEDALLION_EVENT = {
  hotel: 'Hotel Medallion',
  title: 'Relaunch — Wine & Wings Cocktail Party',
  invitationLine: 'You are specially invited to Hotel Medallion’s Relaunch - Wine & Wings cocktail party',
  dateLabel: 'October 30th, 2026',
  timeLabel: '5:00 PM - 10:00 PM',
  venueAddressLines: ['Plot 61, Babatunde Anjous Avenue', 'Off Admiralty Way, Lekki Phase 1', 'Lagos, Nigeria'],
  venueAddress: 'Plot 61, Babatunde Anjous Avenue, Off Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  // What Google Maps searches for — matches the hotel's own listing so the pin lands on the building.
  mapsQuery: 'Hotel Medallion, Plot 61 Babatunde Anjous Avenue, Lekki Phase 1, Lagos, Nigeria',
  logoPath: '/hotel-medallion/logo.png',
  prContactName: 'RINWA',
  prContactEmail: 'info@rinwahospitality.com',
} as const;

// Opens turn-by-turn directions (the Maps app on phones) from wherever the guest is.
export const MEDALLION_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MEDALLION_EVENT.mapsQuery)}`;

// Keyless Google Maps embed for the in-page map.
export const MEDALLION_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(MEDALLION_EVENT.mapsQuery)}&z=16&output=embed`;

export const MEDALLION_BASE_PATH = '/hotel-medallion';

// QR payloads are `HM1:<token>`. The scanner also accepts a full ticket URL or a bare short code.
export const MEDALLION_QR_PREFIX = 'HM1:';

export function medallionQrPayload(token: string) {
  return `${MEDALLION_QR_PREFIX}${token}`;
}

export type CheckInResult =
  | { result: 'admitted' | 'already'; guest: { name: string; code: string; checkedInAt: string } }
  | { result: 'invalid' };
