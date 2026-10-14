import mongoose, { Schema, Document } from 'mongoose';

export interface IIdentitySource {
  source: string;
  submissionId?: string;
  at: Date;
}

// A visitor profile keyed by the anonymous first-party visitor id. Identity
// fields are only filled in when the visitor submits one of the site's forms.
export interface IAnalyticsVisitor extends Document {
  visitorId: string;
  firstSeen: Date;
  lastSeen: Date;
  sessions: number;
  pageviews: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  identifiedAt?: Date;
  identitySources: IIdentitySource[];
  consentAt?: Date;
  ip?: string;
  ipAddresses: string[];
  userAgent?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  language?: string;
  browser?: string;
  os?: string;
  osVersion?: string;
  deviceModel?: string;
  deviceType?: string;
  screen?: string;
  viewport?: string;
  colorScheme?: string;
  connection?: string;
  firstReferrer?: string;
  firstReferrerHost?: string;
  firstUtmSource?: string;
  firstUtmCampaign?: string;
  firstLandingPath?: string;
}

const AnalyticsVisitorSchema = new Schema<IAnalyticsVisitor>({
  visitorId: { type: String, required: true, unique: true },
  firstSeen: { type: Date, required: true },
  lastSeen: { type: Date, required: true, index: true },
  sessions: { type: Number, default: 0 },
  pageviews: { type: Number, default: 0 },
  name: String,
  email: { type: String, index: true },
  phone: String,
  company: String,
  identifiedAt: { type: Date, index: true },
  identitySources: {
    type: [{ source: String, submissionId: String, at: Date, _id: false }],
    default: [],
  },
  consentAt: Date,
  ip: String,
  ipAddresses: { type: [String], default: [] },
  userAgent: String,
  countryCode: String,
  country: String,
  region: String,
  city: String,
  timezone: String,
  language: String,
  browser: String,
  os: String,
  osVersion: String,
  deviceModel: String,
  deviceType: String,
  screen: String,
  viewport: String,
  colorScheme: String,
  connection: String,
  firstReferrer: String,
  firstReferrerHost: String,
  firstUtmSource: String,
  firstUtmCampaign: String,
  firstLandingPath: String,
});

export const AnalyticsVisitor =
  mongoose.models.AnalyticsVisitor ||
  mongoose.model<IAnalyticsVisitor>('AnalyticsVisitor', AnalyticsVisitorSchema);
