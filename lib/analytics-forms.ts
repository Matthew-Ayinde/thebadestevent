// The forms whose journeys are tracked step by step. Shared by the public form
// hooks, the collect endpoint and the admin dashboard.

export const FORM_IDS = ['questionnaire', 'meeting_request', 'job_application', 'talent_circle', 'medallion_rsvp'] as const;
export type FormId = (typeof FORM_IDS)[number];

export const FORM_ACTIONS = ['start', 'step', 'error', 'submit', 'submit_error'] as const;
export type FormAction = (typeof FORM_ACTIONS)[number];

export interface FormConfig {
  id: FormId;
  label: string;
  /** Where the form lives; a trailing "*" matches every page under that prefix. */
  path: string;
  /** Step names, in order; step numbers are 1-based. Single-page forms have one step. */
  steps: string[];
  /** What "started" means, shown in the dashboard. */
  startedMeans: string;
}

export const FORMS: Record<FormId, FormConfig> = {
  questionnaire: {
    id: 'questionnaire',
    label: 'Event questionnaire',
    path: '/',
    steps: ['The vision', 'The experience', 'The details'],
    startedMeans: 'Opened the first part of the questionnaire',
  },
  meeting_request: {
    id: 'meeting_request',
    label: 'Meeting booking',
    path: '/',
    steps: ['Your details', 'Pick a time'],
    startedMeans: 'Opened the booking form',
  },
  job_application: {
    id: 'job_application',
    label: 'Job applications',
    path: '/careers/*',
    steps: ['Application form'],
    startedMeans: 'Started filling in an application',
  },
  talent_circle: {
    id: 'talent_circle',
    label: 'Talent circle',
    path: '/careers',
    steps: ['Sign-up form'],
    startedMeans: 'Started filling in the talent circle form',
  },
  medallion_rsvp: {
    id: 'medallion_rsvp',
    label: 'Medallion RSVP',
    path: '/hotel-medallion',
    steps: ['RSVP form'],
    startedMeans: 'Started filling in the RSVP',
  },
};

export function isFormId(value: string | null | undefined): value is FormId {
  return !!value && (FORM_IDS as readonly string[]).includes(value);
}

/** Mongo filter for page views on a form's page(s). */
export function formPathFilter(form: FormConfig) {
  if (form.path.endsWith('*')) {
    const prefix = form.path.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: `^${prefix}` };
  }
  return form.path;
}

/* ------------------------------ Dashboard response types ------------------------------ */

export interface FormFunnelTotals {
  /** Unique visitors who opened the form's page. */
  pageVisitors: number;
  /** Unique visitors who started the form. */
  started: number;
  /** Unique visitors who submitted successfully. */
  submitted: number;
  /** Submissions actually saved in the database for the period (the source of truth). */
  savedSubmissions: number;
  medianCompletionMs: number | null;
}

export interface FormStepStat {
  step: number;
  label: string;
  reached: number;
  /** Median time on the step among people who moved past it. */
  medianMs: number | null;
  errors: number;
  topError?: string;
}

export interface AnswerBreakdown {
  id: string;
  question: string;
  /** Submissions that answered; multi-select rows can sum past this. */
  respondents: number;
  multi: boolean;
  rows: { label: string; count: number }[];
}

export interface FormSourceRow {
  label: string;
  code?: string;
  visitors: number;
}

export interface FormAnalyticsData {
  form: { id: FormId; label: string; path: string; steps: string[]; startedMeans: string };
  range: { from: string; to: string; tz: string; unit: 'day' | 'week' | 'month' };
  previousRange: { from: string; to: string };
  totals: FormFunnelTotals;
  previousTotals: FormFunnelTotals;
  funnel: { label: string; visitors: number }[];
  steps: FormStepStat[];
  submitErrors: number;
  series: { date: string; pageVisitors: number; started: number; submitted: number }[];
  sources: { sources: FormSourceRow[]; campaigns: FormSourceRow[]; countries: FormSourceRow[]; devices: FormSourceRow[] };
  answers: AnswerBreakdown[];
  comments: { question: string; text: string; at: string }[];
}
