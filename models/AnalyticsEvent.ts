import mongoose, { Schema, Document } from 'mongoose';

// One document per page view. Engagement (time on page, scroll depth) is
// patched onto the same document when the visitor leaves the page.
export interface IAnalyticsEvent extends Document {
  pageviewId: string;
  visitorId: string;
  sessionId: string;
  isNewSession: boolean;
  /** false for cookieless page counts from visitors who did not accept analytics cookies. */
  consent: boolean;
  ip?: string;
  path: string;
  title?: string;
  referrer?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  language?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceModel?: string;
  deviceType?: string;
  screen?: string;
  viewport?: string;
  colorScheme?: string;
  connection?: string;
  durationMs: number;
  maxScroll: number;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    pageviewId: { type: String, required: true, unique: true },
    visitorId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    isNewSession: { type: Boolean, default: false },
    consent: { type: Boolean, default: true },
    ip: String,
    path: { type: String, required: true },
    title: String,
    referrer: String,
    referrerHost: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    countryCode: String,
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    language: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    deviceModel: String,
    deviceType: String,
    screen: String,
    viewport: String,
    colorScheme: String,
    connection: String,
    durationMs: { type: Number, default: 0 },
    maxScroll: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsEventSchema.index({ createdAt: -1 });
AnalyticsEventSchema.index({ visitorId: 1, createdAt: -1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent ||
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
