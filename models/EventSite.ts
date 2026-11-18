import mongoose, { Schema, Document, type Model, type Types } from 'mongoose';
import { BACKDROPS, HEADING_FONTS, RSVP_MODES, type Backdrop, type HeadingFont, type RsvpMode } from '@/lib/event-site';

/** An admin-managed event page, served publicly at /{slug}. */
export interface IEventSite extends Document {
  _id: Types.ObjectId;
  slug: string;
  isPublished: boolean;
  brandName: string;
  brandEyebrow: string;
  brandWordmark: string;
  logoUrl: string;
  title: string;
  eyebrow: string;
  headline: string;
  tagline: string;
  invitationLine: string;
  description: string;
  recapMessage: string;
  coverImageUrl: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  venueName: string;
  venueAddressLines: string[];
  mapsQuery: string;
  dressCode: string;
  contactName: string;
  contactEmail: string;
  rsvpMode: RsvpMode;
  rsvpUrl: string;
  codePrefix: string;
  scannerPasscodeHash: string | null;
  theme: {
    background: string;
    surface: string;
    border: string;
    accent: string;
    text: string;
    muted: string;
    headingFont: HeadingFont;
    backdrop: Backdrop;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ThemeSchema = new Schema(
  {
    background: { type: String, default: '#06102a' },
    surface: { type: String, default: '#0a1a3f' },
    border: { type: String, default: '#23396e' },
    accent: { type: String, default: '#00aef1' },
    text: { type: String, default: '#f3efe4' },
    muted: { type: String, default: '#b3c0e0' },
    headingFont: { type: String, enum: Object.keys(HEADING_FONTS), default: 'cormorant' },
    backdrop: { type: String, enum: Object.keys(BACKDROPS), default: 'glow' },
  },
  { _id: false }
);

const EventSiteSchema = new Schema<IEventSite>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isPublished: { type: Boolean, default: false, index: true },
    brandName: { type: String, required: true, trim: true },
    brandEyebrow: { type: String, default: '', trim: true },
    brandWordmark: { type: String, default: '', trim: true },
    logoUrl: { type: String, default: '' },
    title: { type: String, required: true, trim: true },
    eyebrow: { type: String, default: '', trim: true },
    headline: { type: String, default: '', trim: true },
    tagline: { type: String, default: '', trim: true },
    invitationLine: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    recapMessage: { type: String, default: '', trim: true },
    coverImageUrl: { type: String, default: '' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Africa/Lagos' },
    venueName: { type: String, default: '', trim: true },
    venueAddressLines: { type: [String], default: [] },
    mapsQuery: { type: String, default: '', trim: true },
    dressCode: { type: String, default: '', trim: true },
    contactName: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true, lowercase: true },
    rsvpMode: { type: String, enum: RSVP_MODES, default: 'builtin' },
    rsvpUrl: { type: String, default: '' },
    codePrefix: { type: String, default: 'EV', uppercase: true, trim: true },
    // bcrypt hash of the door-staff passcode; never sent to the browser.
    scannerPasscodeHash: { type: String, default: null, select: false },
    theme: { type: ThemeSchema, default: () => ({}) },
  },
  { timestamps: true }
);

EventSiteSchema.index({ brandName: 1, isPublished: 1, startsAt: 1 });

export const EventSite: Model<IEventSite> =
  (mongoose.models.EventSite as Model<IEventSite>) || mongoose.model<IEventSite>('EventSite', EventSiteSchema);
