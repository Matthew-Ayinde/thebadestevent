import mongoose, { Schema, Document } from 'mongoose';

// Clicks on contact links (WhatsApp, phone, email), socials, outbound links
// and any element tagged with data-track="…".
export interface IAnalyticsClick extends Document {
  pageviewId?: string;
  visitorId: string;
  sessionId: string;
  consent: boolean;
  path: string;
  kind: string;
  target: string;
  label?: string;
  countryCode?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  createdAt: Date;
}

const AnalyticsClickSchema = new Schema<IAnalyticsClick>(
  {
    pageviewId: String,
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    consent: { type: Boolean, default: false },
    path: { type: String, required: true },
    kind: { type: String, required: true },
    target: { type: String, required: true },
    label: String,
    countryCode: String,
    country: String,
    city: String,
    deviceType: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsClickSchema.index({ createdAt: -1 });
AnalyticsClickSchema.index({ visitorId: 1, createdAt: -1 });

export const AnalyticsClick =
  mongoose.models.AnalyticsClick || mongoose.model<IAnalyticsClick>('AnalyticsClick', AnalyticsClickSchema);
