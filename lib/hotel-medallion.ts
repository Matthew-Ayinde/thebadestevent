// Single source of truth for the Hotel Medallion relaunch microsite.
// Safe to import from client components — no secrets here.

export const MEDALLION_EVENT = {
  hotel: 'Hotel Medallion',
  title: 'Relaunch — Wine & Wings Cocktail Party',
  invitationLine: 'You are specially invited to Hotel Medallion’s Relaunch - Wine & Wings cocktail party',
  dateLabel: 'October 30th, 2026',
  // TODO: replace with the confirmed start time, e.g. '7:00 PM'. Hidden while empty.
  timeLabel: '7:00 PM',
  // TODO: replace with the confirmed venue address.
  venueAddress: 'Hotel Medallion — venue address to be announced',
  logoPath: '/hotel-medallion/logo.png',
  prContactName: 'RINWA',
  prContactEmail: 'info@rinwahospitality.com',
} as const;

export const MEDALLION_BASE_PATH = '/hotel-medallion';

// QR payloads are `HM1:<token>`. The scanner also accepts a full ticket URL or a bare short code.
export const MEDALLION_QR_PREFIX = 'HM1:';

export function medallionQrPayload(token: string) {
  return `${MEDALLION_QR_PREFIX}${token}`;
}

export type CheckInResult =
  | { result: 'admitted' | 'already'; guest: { name: string; code: string; checkedInAt: string } }
  | { result: 'invalid' };
