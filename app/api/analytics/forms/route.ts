import { connectDB } from '@/lib/mongodb';
import { AnalyticsEvent } from '@/models/AnalyticsEvent';
import { AnalyticsFormEvent } from '@/models/AnalyticsFormEvent';
import { GuestExperienceSubmission } from '@/models/GuestExperienceSubmission';
import { HomecomingSubmission } from '@/models/HomecomingSubmission';
import { parseRange, requireAdmin } from '@/lib/analytics/admin-query';
import { addDays, bucketKeys, daysBetween, startOfDayInZone } from '@/lib/analytics/dates';
import { sourceFacets, sourceRows } from '@/lib/analytics/breakdowns';
import { FORMS, isFormId, type FormId } from '@/lib/analytics/forms';
import type { AnswerBreakdown, FormAnalyticsData, FormFunnelTotals, FormStepStat } from '@/lib/analytics/types';
import type { Model } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EVENTS = 50_000;
const ANSWER_LIMIT = 12;

interface AnswerSpec {
  id: string;
  question: string;
  /** A field name, or an expression that resolves "Other" to the typed text. */
  value: string | Record<string, unknown>;
  multi?: boolean;
}

const otherOr = (field: string, otherField: string) => ({
  $cond: [{ $eq: [`$${field}`, 'Other'] }, { $ifNull: [`$${otherField}`, 'Other'] }, `$${field}`],
});

const SUBMISSIONS: Record<
  FormId,
  {
    model: Model<any>;
    answers: AnswerSpec[];
    score?: { field: string; question: string };
    comments?: { field: string; question: string }[];
  }
> = {
  guest: {
    model: GuestExperienceSubmission,
    answers: [
      { id: 'welcomed', question: 'Felt welcomed on arrival', value: 'welcomed' },
      { id: 'anticipatedMoment', question: 'Someone anticipated a need', value: 'anticipatedMoment' },
      { id: 'wouldReturn', question: 'Would come back for the hospitality', value: 'wouldReturn' },
    ],
    score: { field: 'caredForScore', question: 'How cared for guests felt (1–5)' },
    comments: [
      { field: 'overlookedMoment', question: 'Felt overlooked or unsure' },
      { field: 'anticipatedMomentDetail', question: 'What was anticipated' },
    ],
  },
  homecoming: {
    model: HomecomingSubmission,
    answers: [
      { id: 'residence', question: 'Travelling from', value: otherOr('residence', 'residenceOther') },
      { id: 'arrival', question: 'Planning to arrive', value: 'arrival' },
      { id: 'stayLength', question: 'Length of stay', value: 'stayLength' },
      { id: 'lastHome', question: 'Last time home', value: 'lastHome' },
      { id: 'companions', question: 'Travelling with', value: 'companions' },
      { id: 'reason', question: 'Reasons for coming', value: 'reason', multi: true },
      { id: 'accommodation', question: 'Where they will stay', value: 'accommodation' },
      { id: 'budget', question: 'Accommodation budget', value: 'budget' },
      { id: 'needs', question: 'What they want handled', value: 'needs', multi: true },
      { id: 'excitedFor', question: 'Excited to experience', value: 'excitedFor', multi: true },
      { id: 'perks', question: 'Perks & discounts', value: 'perks' },
      { id: 'heardFrom', question: 'Heard about RÌNWÁ from', value: otherOr('heardFrom', 'heardFromOther') },
      { id: 'contactMethod', question: 'Preferred contact', value: 'contactMethod' },
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

async function funnelTotals(formId: FormId, start: Date, end: Date): Promise<FormFunnelTotals & { events: LeanFormEvent[] }> {
  const range = { $gte: start, $lt: end };
  const [pageVisitors, events, savedSubmissions] = await Promise.all([
    AnalyticsEvent.distinct('visitorId', { createdAt: range, path: FORMS[formId].path }),
    AnalyticsFormEvent.find({ form: formId, createdAt: range })
      .sort({ createdAt: 1 })
      .limit(MAX_EVENTS)
      .select('attemptId visitorId action step message createdAt')
      .lean<LeanFormEvent[]>(),
    SUBMISSIONS[formId].model.countDocuments({ createdAt: range }),
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
  const errorMessages = Array.from({ length: total + 2 }, () => new Map<string, number>());
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
      if (e.message) errorMessages[e.step].set(e.message, (errorMessages[e.step].get(e.message) ?? 0) + 1);
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
    const top = [...errorMessages[step].entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      step,
      label,
      reached: reached[step].size,
      medianMs: median(spent),
      errors: errors[step],
      topError: top?.[0],
    };
  });
  return { steps, submitErrors };
}

async function answerStats(formId: FormId, start: Date, end: Date) {
  const spec = SUBMISSIONS[formId];
  const facet: Record<string, any[]> = { respondents: [{ $count: 'n' }] };
  for (const a of spec.answers) {
    facet[a.id] = [
      { $project: { v: typeof a.value === 'string' ? `$${a.value}` : a.value } },
      ...(a.multi ? [{ $unwind: '$v' }] : []),
      { $match: { v: { $nin: [null, ''] } } },
      { $group: { _id: '$v', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: ANSWER_LIMIT },
    ];
    // Respondents = submissions that answered this question at all.
    facet[`${a.id}__n`] = [
      { $project: { v: typeof a.value === 'string' ? `$${a.value}` : a.value } },
      { $match: a.multi ? { 'v.0': { $exists: true } } : { v: { $nin: [null, ''] } } },
      { $count: 'n' },
    ];
  }
  if (spec.score) {
    facet.score = [
      { $project: { s: { $convert: { input: `$${spec.score.field}`, to: 'int', onError: null, onNull: null } } } },
      { $match: { s: { $gte: 1, $lte: 5 } } },
      { $group: { _id: '$s', count: { $sum: 1 } } },
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

  const [result] = await spec.model.aggregate([{ $match: { createdAt: { $gte: start, $lt: end } } }, { $facet: facet }]);

  const answers: AnswerBreakdown[] = spec.answers.map((a) => ({
    id: a.id,
    question: a.question,
    multi: !!a.multi,
    respondents: result[`${a.id}__n`][0]?.n ?? 0,
    rows: result[a.id].map((r: { _id: unknown; count: number }) => ({ label: String(r._id), count: r.count })),
  }));

  let score: FormAnalyticsData['score'];
  if (spec.score) {
    const distribution = [1, 2, 3, 4, 5].map((n) => result.score.find((r: any) => r._id === n)?.count ?? 0);
    const respondents = distribution.reduce((a, b) => a + b, 0);
    const average = respondents ? distribution.reduce((sum, count, i) => sum + count * (i + 1), 0) / respondents : 0;
    score = { question: spec.score.question, average, respondents, distribution };
  }

  const comments = (spec.comments ?? [])
    .flatMap((c) =>
      result[`comment__${c.field}`].map((r: any) => ({ question: c.question, text: String(r.text).slice(0, 600), at: r.createdAt }))
    )
    .sort((a: { at: Date }, b: { at: Date }) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return { answers, score, comments };
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const formParam = request.nextUrl.searchParams.get('form');
  if (!isFormId(formParam)) return NextResponse.json({ error: 'Unknown form' }, { status: 400 });
  const formId = formParam;
  const config = FORMS[formId];

  const range = parseRange(request);
  if (range instanceof NextResponse) return range;
  const { from, to, tz, interval, start, end } = range;
  const span = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(span - 1));

  try {
    await connectDB();
    const bucketFormat = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [current, previous, traffic, answerData] = await Promise.all([
      funnelTotals(formId, start, end),
      funnelTotals(formId, startOfDayInZone(prevFrom, tz), start),
      AnalyticsEvent.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end }, path: config.path } },
        {
          $facet: {
            series: [
              {
                $group: {
                  _id: { $dateToString: { format: bucketFormat, date: '$createdAt', timezone: tz } },
                  visitors: { $addToSet: '$visitorId' },
                },
              },
              { $project: { n: { $size: '$visitors' } } },
            ],
            ...sourceFacets,
          },
        },
      ]),
      answerStats(formId, start, end),
    ]);

    const { events, ...totals } = current;
    const { events: _prevEvents, ...previousTotals } = previous;
    const { steps, submitErrors } = stepStats(formId, events);

    // Bucket form events in the viewer's timezone to line up with page traffic.
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const bucketOf = (d: Date) => (interval === 'month' ? dayKey.format(d).slice(0, 7) : dayKey.format(d));
    const startedBy = new Map<string, Set<string>>();
    const submittedBy = new Map<string, Set<string>>();
    for (const e of events) {
      const target = e.action === 'start' ? startedBy : e.action === 'submit' ? submittedBy : null;
      if (!target) continue;
      const key = bucketOf(e.createdAt);
      if (!target.has(key)) target.set(key, new Set());
      target.get(key)!.add(e.visitorId);
    }
    const pageBy = new Map<string, number>(traffic[0].series.map((s: { _id: string; n: number }) => [s._id, s.n]));
    const series = bucketKeys(from, to, interval).map((key) => ({
      key,
      pageVisitors: pageBy.get(key) ?? 0,
      started: startedBy.get(key)?.size ?? 0,
      submitted: submittedBy.get(key)?.size ?? 0,
    }));

    const body: FormAnalyticsData = {
      form: { id: config.id, label: config.label, path: config.path, steps: config.steps },
      range: { from, to, tz, interval },
      previousRange: { from: prevFrom, to: prevTo },
      totals,
      previousTotals,
      funnel: [
        { label: 'Opened the page', visitors: totals.pageVisitors },
        ...steps.map((s) => ({ label: `${s.step}. ${s.label}`, visitors: s.reached })),
        { label: 'Submitted', visitors: totals.submitted },
      ],
      steps,
      submitErrors,
      series,
      sources: sourceRows(traffic[0]),
      ...answerData,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Form analytics error:', error);
    return NextResponse.json({ error: 'Failed to load questionnaire analytics' }, { status: 500 });
  }
}
