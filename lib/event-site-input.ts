import { z } from 'zod';
import {
  BACKDROPS,
  HEADING_FONTS,
  HEX_RE,
  RSVP_MODES,
  isValidTimezone,
  slugProblem,
  zonedLocalToDate,
} from '@/lib/event-site';

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const text = (max: number) => z.string().trim().max(max).default('');
const link = (label: string) =>
  z
    .string()
    .trim()
    .max(1000)
    .default('')
    .refine((v) => v === '' || /^(https?:\/\/|mailto:|\/)/i.test(v), `${label} must start with https://, mailto: or /`);
const color = (label: string) => z.string().trim().regex(HEX_RE, `${label} must be a hex colour like #0a1a3f`);

/** The admin editor's payload. Times arrive as wall-clock values in the event's own time zone. */
export const EventSiteInput = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .superRefine((v, ctx) => {
        const problem = slugProblem(v);
        if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
      }),
    isPublished: z.boolean().default(false),
    brandName: z.string().trim().min(1, 'Brand / host name is required').max(80),
    brandEyebrow: text(40),
    brandWordmark: text(60),
    logoUrl: link('Logo'),
    title: z.string().trim().min(1, 'Event title is required').max(140),
    eyebrow: text(120),
    headline: text(140),
    tagline: text(200),
    invitationLine: text(300),
    description: text(6000),
    recapMessage: text(2000),
    coverImageUrl: link('Cover image'),
    timezone: z.string().refine(isValidTimezone, 'Unknown time zone'),
    startsAt: z.string().regex(LOCAL_DT, 'Start date and time are required'),
    endsAt: z.string().regex(LOCAL_DT, 'End date and time are required'),
    venueName: text(120),
    venueAddress: text(400),
    mapsQuery: text(300),
    dressCode: text(120),
    contactName: text(80),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .default('')
      .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Contact email is not valid'),
    rsvpMode: z.enum(RSVP_MODES),
    rsvpUrl: link('RSVP link'),
    codePrefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{1,4}$/, 'Ticket code prefix must be 1–4 letters or numbers'),
    // Blank keeps the current passcode. clearScannerPasscode switches the door scanner off.
    scannerPasscode: z.string().max(100).default(''),
    clearScannerPasscode: z.boolean().default(false),
    theme: z.object({
      background: color('Background'),
      surface: color('Card colour'),
      border: color('Border colour'),
      accent: color('Accent colour'),
      text: color('Text colour'),
      muted: color('Muted text colour'),
      headingFont: z.enum(Object.keys(HEADING_FONTS) as [keyof typeof HEADING_FONTS, ...(keyof typeof HEADING_FONTS)[]]),
      backdrop: z.enum(Object.keys(BACKDROPS) as [keyof typeof BACKDROPS, ...(keyof typeof BACKDROPS)[]]),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.rsvpMode === 'external' && !v.rsvpUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rsvpUrl'], message: 'Add the external RSVP / ticket link' });
    }
    if (v.scannerPasscode && v.scannerPasscode.trim().length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scannerPasscode'], message: 'Door passcode must be at least 4 characters' });
    }
  })
  .transform(({ venueAddress, startsAt, endsAt, scannerPasscode, clearScannerPasscode, ...v }) => ({
    fields: {
      ...v,
      venueAddressLines: venueAddress.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
      startsAt: zonedLocalToDate(startsAt, v.timezone),
      endsAt: zonedLocalToDate(endsAt, v.timezone),
    },
    scannerPasscode: scannerPasscode.trim(),
    clearScannerPasscode,
  }))
  .refine((v) => v.fields.endsAt > v.fields.startsAt, { message: 'The event must end after it starts', path: ['endsAt'] });

export type EventSiteInputValue = z.input<typeof EventSiteInput>;
