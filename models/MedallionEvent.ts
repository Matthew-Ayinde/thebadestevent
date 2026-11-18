import mongoose, { Schema, Document, type Model } from 'mongoose';

/** An upcoming Hotel Medallion event, published from the admin console. */
export interface IMedallionEvent extends Document {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueAddress: string;
  imageUrl: string;
  rsvpUrl: string;
  dressCode: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedallionEventSchema = new Schema<IMedallionEvent>(
  {
    title: { type: String, required: true, trim: true },
    // Set once on create and never changed, so shared links keep working after edits.
    slug: { type: String, required: true, unique: true },
    tagline: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    venueName: { type: String, default: 'Hotel Medallion', trim: true },
    venueAddress: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '' },
    rsvpUrl: { type: String, default: '' },
    dressCode: { type: String, default: '', trim: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const MedallionEvent: Model<IMedallionEvent> =
  (mongoose.models.MedallionEvent as Model<IMedallionEvent>) ||
  mongoose.model<IMedallionEvent>('MedallionEvent', MedallionEventSchema);
