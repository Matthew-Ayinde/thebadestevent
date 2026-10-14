import type { Interval } from './dates';

export interface Totals {
  visitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgSessionMs: number;
  avgPageMs: number;
  newVisitors: number;
  identified: number;
  /** Unique visitors who accepted analytics cookies. */
  consentedVisitors: number;
  /** Clicks on WhatsApp, phone and email links. */
  contactClicks: number;
}

export interface SeriesPoint {
  key: string;
  visitors: number;
  pageviews: number;
  sessions: number;
}

export interface BreakdownRow {
  label: string;
  code?: string;
  visitors: number;
  pageviews: number;
}

export interface AnalyticsOverview {
  range: { from: string; to: string; tz: string; interval: Interval };
  previousRange: { from: string; to: string };
  totals: Totals;
  previousTotals: Totals;
  liveVisitors: number;
  series: SeriesPoint[];
  breakdowns: {
    pages: BreakdownRow[];
    referrers: BreakdownRow[];
    campaigns: BreakdownRow[];
    countries: BreakdownRow[];
    cities: BreakdownRow[];
    devices: BreakdownRow[];
    browsers: BreakdownRow[];
    os: BreakdownRow[];
    languages: BreakdownRow[];
    clickTargets: BreakdownRow[];
    clickKinds: BreakdownRow[];
  };
  /** 7 rows (Mon–Sun) × 24 hours of page views, in the viewer's timezone. */
  heatmap: number[][];
}

export interface VisitorRow {
  visitorId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  identitySources?: string[];
  consent?: boolean;
  ip?: string;
  deviceModel?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  firstSeen: string;
  lastSeen: string;
  pageviews: number;
  sessions: number;
  totalMs: number;
  firstReferrerHost?: string;
  firstUtmSource?: string;
}

export interface VisitorList {
  visitors: VisitorRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface VisitorClick {
  pageviewId?: string;
  path: string;
  kind: string;
  target: string;
  label?: string;
  createdAt: string;
}

export interface VisitorEvent {
  pageviewId: string;
  sessionId: string;
  path: string;
  title?: string;
  referrerHost?: string;
  utmSource?: string;
  utmCampaign?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  ip?: string;
  durationMs: number;
  maxScroll: number;
  createdAt: string;
}

export interface VisitorDetail {
  visitor: VisitorRow & {
    language?: string;
    timezone?: string;
    screen?: string;
    viewport?: string;
    colorScheme?: string;
    connection?: string;
    osVersion?: string;
    userAgent?: string;
    ipAddresses?: string[];
    consentAt?: string;
    firstReferrer?: string;
    firstUtmCampaign?: string;
    firstLandingPath?: string;
    identifiedAt?: string;
    identitySourceLog: { source: string; submissionId?: string; at: string }[];
  };
  events: VisitorEvent[];
  clicks: VisitorClick[];
}

export interface FormFunnelTotals {
  /** Unique visitors who opened the questionnaire page. */
  pageVisitors: number;
  /** Unique visitors who began the first question. */
  started: number;
  /** Unique visitors who submitted successfully. */
  submitted: number;
  /** Submissions actually saved in the database for the period (source of truth). */
  savedSubmissions: number;
  medianCompletionMs: number | null;
}

export interface FormStepStat {
  step: number;
  label: string;
  reached: number;
  /** Median time spent on the step by people who moved past it. */
  medianMs: number | null;
  errors: number;
  topError?: string;
}

export interface FormSeriesPoint {
  key: string;
  pageVisitors: number;
  started: number;
  submitted: number;
}

export interface AnswerBreakdown {
  id: string;
  question: string;
  /** Respondents who answered; multi-select rows can sum past this. */
  respondents: number;
  multi: boolean;
  rows: { label: string; count: number }[];
}

export interface FormAnalyticsData {
  form: { id: string; label: string; path: string; steps: string[] };
  range: { from: string; to: string; tz: string; interval: Interval };
  previousRange: { from: string; to: string };
  totals: FormFunnelTotals;
  previousTotals: FormFunnelTotals;
  funnel: { label: string; visitors: number }[];
  steps: FormStepStat[];
  submitErrors: number;
  series: FormSeriesPoint[];
  sources: {
    referrers: BreakdownRow[];
    campaigns: BreakdownRow[];
    countries: BreakdownRow[];
    cities: BreakdownRow[];
    devices: BreakdownRow[];
  };
  answers: AnswerBreakdown[];
  score?: { question: string; average: number; respondents: number; distribution: number[] };
  comments: { question: string; text: string; at: string }[];
}
