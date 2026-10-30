import mongoose, { Schema, Document } from 'mongoose';

export const CREDIT_OPTIONS = ['Full name', 'Nickname', 'Anonymous'] as const;
export type CreditOption = (typeof CREDIT_OPTIONS)[number];

/** How many featured stories fit on the /feedback wall. */
export const WALL_SIZE = 8;

export interface IHomecomingStory extends Document {
  creditAs: CreditOption;
  name?: string;
  movedFrom: string;
  photoUrl?: string;
  story: string;
  yearReturned: number;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  wantsTag: boolean;
  wishedHelpWith?: string;
  wishPrepared?: string;
  landingThoughts?: string;
  contentConsent: boolean;
  // Only consented stories can be featured; featured ones show on /feedback.
  featured: boolean;
  /** When it was last put on the wall; the wall shows newest first. */
  featuredAt?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomecomingStorySchema = new Schema<IHomecomingStory>(
  {
    creditAs: { type: String, enum: CREDIT_OPTIONS, required: true },
    name: { type: String },
    movedFrom: { type: String, required: true },
    photoUrl: { type: String },
    story: { type: String, required: true },
    yearReturned: { type: Number, required: true },
    instagram: { type: String },
    tiktok: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    wantsTag: { type: Boolean, default: false },
    wishedHelpWith: { type: String },
    wishPrepared: { type: String },
    landingThoughts: { type: String },
    contentConsent: { type: Boolean, required: true },
    featured: { type: Boolean, default: false, index: true },
    featuredAt: { type: Date },
    status: { type: String, default: 'new' },
  },
  { timestamps: true }
);

export const HomecomingStory =
  mongoose.models.HomecomingStory ||
  mongoose.model<IHomecomingStory>('HomecomingStory', HomecomingStorySchema);

/** What a public visitor is allowed to see of a featured story. */
export interface PublicStory {
  id: string;
  displayName: string;
  movedFrom: string;
  yearReturned: number;
  photoUrl?: string;
  story: string;
  landingThoughts?: string;
  handle?: string;
}

export function toPublicStory(s: IHomecomingStory): PublicStory {
  const handle = s.wantsTag ? s.instagram || s.tiktok || s.twitter : undefined;
  return {
    id: String(s._id),
    displayName: s.creditAs === 'Anonymous' || !s.name ? 'Anonymous' : s.name,
    movedFrom: s.movedFrom,
    yearReturned: s.yearReturned,
    photoUrl: s.photoUrl,
    story: s.story,
    landingThoughts: s.landingThoughts,
    handle: handle ? `@${handle.replace(/^@/, '')}` : undefined,
  };
}
