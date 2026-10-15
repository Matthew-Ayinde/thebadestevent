import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Model, PipelineStage } from 'mongoose';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsFormEvent } from '@/models/AnalyticsFormEvent';
import { QuestionnaireSubmission } from '@/models/QuestionnaireSubmission';
import { MeetingRequest } from '@/models/MeetingRequest';
import { JobApplication } from '@/models/JobApplication';
import { MedallionGuest } from '@/models/MedallionGuest';
import { TalentCircleMember } from '@/models/TalentCircleMember';
import {
  bucketKeys,
  bucketOf,
  localDate,
  parseRange,
  previousRange,
  type DateRange,
  type Granularity,
} from '@/lib/analytics-query';
import {
  FORMS,
  formPathFilter,
  isFormId,
  type AnswerBreakdown,
  type FormAnalyticsData,
  type FormFunnelTotals,
  type FormId,
  type FormStepStat,
} from '@/lib/analytics-forms';

export const runtime = 'nodejs';

const UNITS: Granularity[] = ['day', 'week', 'month'];
const MAX_EVENTS = 50_000;
const ANSWER_LIMIT = 12;

interface AnswerSpec {
  id: string;
  question: string;
  /** A field name, or an aggregation expression producing the answer. */
  value: string | Record<string, unknown>;
  multi?: boolean;
}

// What each form's saved submissions can tell us. Free-text fields are left out of the
// charts (they'd have one bar per person); a couple are shown as recent quotes instead.
const SUBMISSIONS: Record<FormId, { model: Model<any>; answers: AnswerSpec[]; comments?: { field: string; question: string }[] }> = {
  questionnaire: {
    model: QuestionnaireSubmission,
    answers: [
      { id: 'eventFormat', question: 'Event format', value: 'eventFormat' },
      { id: 'hostCity', question: 'Host city', value: 'hostCity' },
      { id: 'managingScope', question: 'Scope of support', value: 'managingScope' },
      { id: 'venueSecured', question: 'Venue already secured', value: 'venueSecured' },
      { id: 'requiredSpaces', question: 'Spaces required', value: 'requiredSpaces', multi: true },
      { id: 'productionNeeds', question: 'Production needs', value: 'productionNeeds', multi: true },
      { id: 'vipGuests', question: 'VIPs, speakers or sponsors attending', value: 'vipGuests' },
      { id: 'ticketingSupport', question: 'Needs ticketing support', value: 'ticketingSupport' },
      { id: 'travelCoordination', question: 'Travel & hospitality coordination', value: 'travelCoordination' },
      { id: 'cateringProvided', question: 'Food & beverage provided', value: 'cateringProvided' },
      { id: 'serviceStyle', question: 'Catering service style', value: 'serviceStyle', multi: true },
      { id: 'eventMaterials', question: 'Materials required', value: 'eventMaterials', multi: true },
      { id: 'sponsorsInvolved', question: 'Sponsors involved', value: 'sponsorsInvolved' },
      { id: 'securityRequired', question: 'Security required', value: 'securityRequired' },
    ],
    comments: [
      { field: 'successDefinition', question: 'What success looks like' },
      { field: 'eventPurpose', question: 'Purpose of the event' },
    ],
  },
  meeting_request: {
    model: MeetingRequest,
    answers: [
      {
        id: 'topic',
        question: 'Topic',
        // Requests are stored as "Topic — note"; chart the topic part only.
        value: { $cond: [{ $gt: [{ $indexOfCP: ['$reason', ' — '] }, 0] }, { $arrayElemAt: [{ $split: ['$reason', ' — '] }, 0] }, null] },
      },
      { id: 'status', question: 'Status', value: 'status' },
      { id: 'source', question: 'Booked via', value: 'source' },
    ],
    comments: [{ field: 'reason', question: 'What they want to discuss' }],
  },
  job_application: {
    model: JobApplication,
    answers: [
      { id: 'jobTitle', question: 'Role applied for', value: 'jobTitle' },
      { id: 'status', question: 'Application status', value: 'status' },
      { id: 'location', question: 'Applicant location', value: 'location' },
      {
        id: 'resume',
        question: 'CV attached',
        value: { $cond: [{ $ifNull: ['$resume.publicId', false] }, 'With CV', 'No CV'] },
      },
    ],
  },
  talent_circle: {
    model: TalentCircleMember,
    answers: [
      { id: 'crafts', question: 'Craft', value: 'crafts', multi: true },
      { id: 'experience', question: 'Years in hospitality', value: 'experience' },
      { id: 'lookingFor', question: 'Looking for', value: 'lookingFor', multi: true },
      { id: 'startWhen', question: 'Could start', value: 'startWhen' },
      { id: 'city', question: 'Based in', value: 'city' },
    ],
    comments: [
      { field: 'moment', question: 'A moment they made unforgettable' },
      { field: 'dreamMove', question: 'Their dream move' },
    ],
  },
  medallion_rsvp: {
    model: MedallionGuest,
    answers: [
      { id: 'checkedIn', question: 'Checked in at the door', value: { $cond: [{ $ifNull: ['$checkedInAt', false] }, 'Checked in', 'Not yet'] } },
      {
        id: 'emailDelivery',
        question: 'Invitation email',
        value: {
          $cond: [{ $ifNull: ['$emailError', false] }, 'Failed', { $cond: [{ $ifNull: ['$emailSentAt', false] }, 'Sent', 'Pending'] }],
        },
      },
    ],
  },
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type LeanFormEvent = { attemptId: string; visitorId: string; action: string; step: number; message?: string; createdAt: Date };

async function funnelTotals(formId: FormId, range: DateRange): Promise<FormFunnelTotals & { events: LeanFormEvent[] }> {
  const window = { $gte: range.start, $lt: range.end };
  const [pageVisitors, events, savedSubmissions] = await Promise.all([
    AnalyticsEvent.distinct('visitorId', { type: 'pageview', createdAt: window, path: formPathFilter(FORMS[formId]) }),
    AnalyticsFormEvent.find({ form: formId, createdAt: window })
      .sort({ createdAt: 1 })
      .limit(MAX_EVENTS)
      .select('attemptId visitorId action step message createdAt')
      .lean<LeanFormEvent[]>(),
    SUBMISSIONS[formId].model.countDocuments({ createdAt: window }),
  ]);

  const started = new Set<string>();
  const submitted = new Set<string>();
  const attemptStart = new Map<string, number>();
  const durations: number[] = [];
  for (const e of events) {
    if (e.action === 'start') {
      started.add(e.visitorId);
      if (!attemptStart.has(e.attemptId)) attemptStart.set(e.attemptId, e.createdAt.getTime());
    } else if (e.action === 'submit') {
      submitted.add(e.visitorId);
      const begun = attemptStart.get(e.attemptId);
      if (begun !== undefined) durations.push(e.createdAt.getTime() - begun);
    }
  }

  return {
    pageVisitors: pageVisitors.length,
    started: started.size,
    submitted: submitted.size,
    savedSubmissions,
    medianCompletionMs: median(durations),
    events,
  };
}

function stepStats(formId: FormId, events: LeanFormEvent[]): { steps: FormStepStat[]; submitErrors: number } {
  const total = FORMS[formId].steps.length;
  const reached = Array.from({ length: total + 2 }, () => new Set<string>());
  const errors = Array<number>(total + 2).fill(0);
  const messages = Array.from({ length: total + 2 }, () => new Map<string, number>());
  // Per attempt, when each step was first reached (submit counts as step total+1).
  const reachedAt = new Map<string, Map<number, number>>();
  let submitErrors = 0;

  for (const e of events) {
    if (e.action === 'start' || e.action === 'step' || e.action === 'submit') {
      const step = Math.min(e.step, total + 1);
      reached[step]?.add(e.visitorId);
      if (!reachedAt.has(e.attemptId)) reachedAt.set(e.attemptId, new Map());
      const times = reachedAt.get(e.attemptId)!;
      if (!times.has(step)) times.set(step, e.createdAt.getTime());
    } else if (e.action === 'error' && e.step >= 1 && e.step <= total) {
      errors[e.step] += 1;
      if (e.message) messages[e.step].set(e.message, (messages[e.step].get(e.message) ?? 0) + 1);
    } else if (e.action === 'submit_error') {
      submitErrors += 1;
    }
  }

  const steps = FORMS[formId].steps.map((label, i) => {
    const step = i + 1;
    const spent: number[] = [];
    for (const times of reachedAt.values()) {
      const enter = times.get(step);
      const leave = times.get(step + 1);
      if (enter !== undefined && leave !== undefined && leave >= enter) spent.push(leave - enter);
    }
    const top = [...messages[step].entries()].sort((a, b) => b[1] - a[1])[0];
    return { step, label, reached: reached[step].size, medianMs: median(spent), errors: errors[step], topError: top?.[0] };
  });
  return { steps, submitErrors };
}

async function answerStats(formId: FormId, range: DateRange) {
  const spec = SUBMISSIONS[formId];
  const project = (a: AnswerSpec) => ({ $project: { v: typeof a.value === 'string' ? `$${a.value}` : a.value } });
  const facet: Record<string, PipelineStage.FacetPipelineStage[]> = {};
  for (const a of spec.answers) {
    facet[a.id] = [
      project(a),
      ...(a.multi ? [{ $unwind: '$v' } as const] : []),
      { $match: { v: { $nin: [null, ''] } } },
      { $group: { _id: '$v', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: ANSWER_LIMIT },
    ];
    // Respondents = submissions that answered this question at all.
    facet[`${a.id}__n`] = [
      project(a),
      { $match: a.multi ? { 'v.0': { $exists: true } } : { v: { $nin: [null, ''] } } },
      { $count: 'n' },
    ];
  }
  for (const c of spec.comments ?? []) {
    facet[`comment__${c.field}`] = [
      { $match: { [c.field]: { $nin: [null, ''] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      { $project: { text: `$${c.field}`, createdAt: 1 } },
    ];
  }

  const [result] = await spec.model.aggregate([{ $match: { createdAt: { $gte: range.start, $lt: range.end } } }, { $facet: facet }]);

  const answers: AnswerBreakdown[] = spec.answers.map((a) => ({
    id: a.id,
    question: a.question,
    multi: !!a.multi,
    respondents: result[`${a.id}__n`][0]?.n ?? 0,
    rows: result[a.id].map((r: { _id: unknown; count: number }) => ({ label: String(r._id), count: r.count })),
  }));

  const comments = (spec.comments ?? [])
    .flatMap((c) =>
      result[`comment__${c.field}`].map((r: any) => ({ question: c.question, text: String(r.text).slice(0, 600), at: r.createdAt }))
    )
    .sort((a: { at: Date }, b: { at: Date }) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return { answers, comments };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formParam = searchParams.get('form');
    if (!isFormId(formParam)) return NextResponse.json({ error: 'Unknown form', code: 'VALIDATION_ERROR' }, { status: 400 });
    const formId = formParam;
    const config = FORMS[formId];

    const range = parseRange(searchParams);
    if (!range) return NextResponse.json({ error: 'Invalid date range', code: 'VALIDATION_ERROR' }, { status: 400 });
    const unitParam = searchParams.get('unit') as Granularity;
    const unit = UNITS.includes(unitParam) ? unitParam : 'day';
    const prev = previousRange(range);

    await connectDB();
    const unknown = (field: string) => ({ $ifNull: [field, 'Unknown'] });
    const byVisitors = (key: unknown, limit = 10): PipelineStage.FacetPipelineStage[] => [
      { $group: { _id: key, visitors: { $addToSet: '$visitorId' } } },
      { $project: { visitors: { $size: '$visitors' } } },
      { $sort: { visitors: -1 } },
      { $limit: limit },
    ];

    const [current, previous, [traffic], answerData] = await Promise.all([
      funnelTotals(formId, range),
      funnelTotals(formId, prev),
      AnalyticsEvent.aggregate([
        { $match: { type: 'pageview', createdAt: { $gte: range.start, $lt: range.end }, path: formPathFilter(config) } },
        {
          $facet: {
            series: [
              {
                $group: {
                  _id: { $dateTrunc: { date: '$createdAt', unit, timezone: range.tz, startOfWeek: 'monday' } },
                  visitors: { $addToSet: '$visitorId' },
                },
              },
              { $project: { n: { $size: '$visitors' } } },
            ],
            sources: [{ $match: { isNewSession: true } }, ...byVisitors(unknown('$source'))],
            campaigns: [{ $match: { utmCampaign: { $nin: [null, ''] } } }, ...byVisitors('$utmCampaign')],
            countries: byVisitors({ code: '$countryCode', name: unknown('$country') }),
            devices: byVisitors(unknown('$device'), 5),
          },
        },
      ] as PipelineStage[]),
      answerStats(formId, range),
    ]);

    const { events, ...totals } = current;
    const { events: _previousEvents, ...previousTotals } = previous;
    const { steps, submitErrors } = stepStats(formId, events);

    // Bucket everything in the viewer's timezone so it lines up with the site charts.
    const keyOf = (instant: Date) => bucketOf(localDate(instant, range.tz), unit);
    const startedBy = new Map<string, Set<string>>();
    const submittedBy = new Map<string, Set<string>>();
    for (const e of events) {
      const target = e.action === 'start' ? startedBy : e.action === 'submit' ? submittedBy : null;
      if (!target) continue;
      const key = keyOf(e.createdAt);
      if (!target.has(key)) target.set(key, new Set());
      target.get(key)!.add(e.visitorId);
    }
    const pageBy = new Map<string, number>(traffic.series.map((s: { _id: Date; n: number }) => [keyOf(s._id), s.n]));
    const series = bucketKeys(range, unit).map((date) => ({
      date,
      pageVisitors: pageBy.get(date) ?? 0,
      started: startedBy.get(date)?.size ?? 0,
      submitted: submittedBy.get(date)?.size ?? 0,
    }));

    const toRows = (rows: { _id: any; visitors: number }[], label: (id: any) => string, code?: (id: any) => string | undefined) =>
      rows.map((r) => ({ label: label(r._id), code: code?.(r._id), visitors: r.visitors }));

    const body: FormAnalyticsData = {
      form: { id: config.id, label: config.label, path: config.path, steps: config.steps, startedMeans: config.startedMeans },
      range: { from: range.from, to: range.to, tz: range.tz, unit },
      previousRange: { from: prev.from, to: prev.to },
      totals,
      previousTotals,
      funnel: [
        { label: 'Opened the page', visitors: totals.pageVisitors },
        ...steps.map((s) => ({ label: config.steps.length > 1 ? `${s.step}. ${s.label}` : 'Started', visitors: s.reached })),
        { label: 'Submitted', visitors: totals.submitted },
      ],
      steps,
      submitErrors,
      series,
      sources: {
        sources: toRows(traffic.sources, String),
        campaigns: toRows(traffic.campaigns, String),
        countries: toRows(traffic.countries, (id) => id.name, (id) => id.code ?? undefined),
        devices: toRows(traffic.devices, String),
      },
      ...answerData,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('Error fetching form analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch form analytics', code: 'FETCH_ERROR' }, { status: 500 });
  }
}
