import mongoose, { Schema, Document } from 'mongoose';

// One row per browser (first-party `rw_vid` cookie). Anonymous until the visitor submits a form,
// at which point the self-reported name/email is attached via `identifyVisitor`.

export interface IVisitorIdentity {
  email: string;
  name?: string;
  phone?: string;
  source: string;
  at: Date;
}

export interface IAnalyticsVisitor extends Document {
  visitorId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  pageviews: number;
  sessions: number;
  conversions: number;
  totalEngagedMs: number;

  email?: string;
  name?: string;
  phone?: string;
  identifiedAt?: Date;
  identities: IVisitorIdentity[];

  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  language?: string;

  device?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screen?: string;
  userAgent?: string;

  firstSource?: string;
  firstReferrer?: string;
  firstReferrerHost?: string;
  firstLandingPage?: string;
  firstUtmSource?: string;
  firstUtmMedium?: string;
  firstUtmCampaign?: string;
  lastPath?: string;

  createdAt: Date;
  updatedAt: Date;
}

const IdentitySchema = new Schema<IVisitorIdentity>(
  {
    email: { type: String, required: true },
    name: String,
    phone: String,
    source: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const AnalyticsVisitorSchema = new Schema<IAnalyticsVisitor>(
  {
    visitorId: { type: String, required: true, unique: true },
    firstSeenAt: { type: Date, required: true, index: true },
    lastSeenAt: { type: Date, required: true, index: true },
    pageviews: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    totalEngagedMs: { type: Number, default: 0 },

    email: { type: String, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    identifiedAt: Date,
    identities: { type: [IdentitySchema], default: [] },

    ip: String,
    country: String,
    countryCode: String,
    region: String,
    city: String,
    postalCode: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    language: String,

    device: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    screen: String,
    userAgent: String,

    firstSource: String,
    firstReferrer: String,
    firstReferrerHost: String,
    firstLandingPage: String,
    firstUtmSource: String,
    firstUtmMedium: String,
    firstUtmCampaign: String,
    lastPath: String,
  },
  { timestamps: true }
);

export const AnalyticsVisitor =
  mongoose.models.AnalyticsVisitor ||
  mongoose.model<IAnalyticsVisitor>('AnalyticsVisitor', AnalyticsVisitorSchema);
