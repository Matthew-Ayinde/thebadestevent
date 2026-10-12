import mongoose, { Schema, Document } from 'mongoose';

// A pageview or a conversion (form submission). Location/device are denormalised onto every event
// so breakdowns for any date range are a single aggregation, and stay accurate if a visitor
// later travels or switches network.

export type AnalyticsEventType = 'pageview' | 'conversion';

export interface IAnalyticsEvent extends Document {
  type: AnalyticsEventType;
  name?: string;
  visitorId: string;
  sessionId: string;
  isNewSession: boolean;

  path: string;
  title?: string;
  referrer?: string;
  referrerHost?: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  engagedMs: number;
  scrollDepth: number;

  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  language?: string;
  timezone?: string;
  screen?: string;

  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ['pageview', 'conversion'], required: true },
    name: String,
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    isNewSession: { type: Boolean, default: false },

    path: { type: String, required: true },
    title: String,
    referrer: String,
    referrerHost: String,
    source: { type: String, default: 'Direct' },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,

    engagedMs: { type: Number, default: 0 },
    scrollDepth: { type: Number, default: 0 },

    country: String,
    countryCode: String,
    region: String,
    city: String,
    device: String,
    browser: String,
    os: String,
    language: String,
    timezone: String,
    screen: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsEventSchema.index({ type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ visitorId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ sessionId: 1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
