'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Database, Loader, MessageSquareQuote, MousePointerClick, Percent, TrendingDown, Users } from 'lucide-react';
import type { AnswerBreakdown, FormAnalyticsData } from '@/lib/analytics/types';
import KpiTile from './KpiTile';
import TrendChart, { SERIES_COLORS } from './TrendChart';
import BreakdownCard from './BreakdownCard';
import { formatDateTime, formatDuration, formatNumber, formatPercent } from './format';

const card = 'rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6';
const ratio = (a: number, b: number) => (b ? a / b : 0);

function Funnel({ stages }: { stages: FormAnalyticsData['funnel'] }) {
  const top = Math.max(1, stages[0]?.visitors ?? 0, ...stages.map((s) => s.visitors));
  // The single largest loss between two consecutive stages.
  let worst = -1;
  let worstLoss = 0;
  stages.forEach((s, i) => {
    if (i === 0) return;
    const loss = stages[i - 1].visitors - s.visitors;
    if (loss > worstLoss) {
      worstLoss = loss;
      worst = i;
    }
  });

  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].visitors : null;
        const kept = prev ? s.visitors / prev : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-white/80">{s.label}</span>
              <span className="flex items-baseline gap-3 tabular-nums">
                {kept !== null && (
                  <span className={`text-xs ${i === worst ? 'font-medium text-amber-200' : 'text-white/40'}`}>
                    {i === worst && <TrendingDown size={12} className="mr-1 inline" aria-hidden />}
                    {i === worst ? 'Biggest drop-off · ' : ''}
                    {formatPercent(kept)} continued
                  </span>
                )}
                <span className="font-semibold text-white/90">{formatNumber(s.visitors)}</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#3987e5]/70"
                style={{ width: `${(s.visitors / top) * 100}%` }}
                title={`${s.label}: ${formatNumber(s.visitors)} people (${formatPercent(ratio(s.visitors, stages[0].visitors))} of page visitors)`}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AnswerCard({ answer }: { answer: AnswerBreakdown }) {
  const max = Math.max(1, ...answer.rows.map((r) => r.count));
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3">
        <h3 className="font-serif text-lg leading-snug text-white/90">{answer.question}</h3>
        <p className="text-xs text-white/40">
          {formatNumber(answer.respondents)} {answer.respondents === 1 ? 'response' : 'responses'}
          {answer.multi ? ' · several choices allowed' : ''}
        </p>
      </div>
      {answer.rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">No answers in this period</p>
      ) : (
        <ul className="space-y-1.5">
          {answer.rows.map((r) => (
            <li
              key={r.label}
              className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-1.5"
              title={`${r.label}: ${r.count} (${formatPercent(ratio(r.count, answer.respondents))} of respondents)`}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg bg-[#3987e5]/20 transition group-hover:bg-[#3987e5]/30"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
              <span className="relative truncate text-sm text-white/85">{r.label}</span>
              <span className="relative flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-xs text-white/40">{formatPercent(ratio(r.count, answer.respondents))}</span>
                <span className="text-sm font-medium text-white/90">{formatNumber(r.count)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ScoreCard({ score }: { score: NonNullable<FormAnalyticsData['score']> }) {
  const max = Math.max(1, ...score.distribution);
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-serif text-lg leading-snug text-white/90">{score.question}</h3>
      <p className="mb-4 text-xs text-white/40">{formatNumber(score.respondents)} responses</p>
      <div className="flex items-end gap-6">
        <p className="shrink-0">
          <span className="text-5xl font-semibold tabular-nums text-white/95">
            {score.respondents ? score.average.toFixed(1) : '–'}
          </span>
          <span className="ml-1 text-white/40">/ 5</span>
        </p>
        <div className="flex h-28 flex-1 items-end gap-2" role="list" aria-label="Score distribution">
          {score.distribution.map((count, i) => (
            <div key={i} role="listitem" className="flex flex-1 flex-col items-center gap-1" title={`${i + 1}: ${count} responses`}>
              <span className="text-xs tabular-nums text-white/70">{count}</span>
              <div
                className="w-full rounded-t-[4px] bg-[#3987e5]/70"
                style={{ height: `${Math.max(2, (count / max) * 72)}px` }}
              />
              <span className="text-[11px] text-white/45">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Props {
  form: string;
  query: string;
  rangeLabel: string;
  refreshKey: number;
}

export default function FormAnalyticsView({ form, query, rangeLabel, refreshKey }: Props) {
  const [data, setData] = useState<FormAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/analytics/forms?form=${form}&${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to load questionnaire analytics');
        return res.json();
      })
      .then((body: FormAnalyticsData) => {
        // Discard a stale response for the other questionnaire.
        if (body.form.id === form) {
          setData(body);
          setError(null);
        }
      })
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [form, query, refreshKey]);

  if (error) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>;
  }
  if (!data || data.form.id !== form) {
    return (
      <div className="flex justify-center py-32">
        <Loader className="h-10 w-10 animate-spin text-teal-300" />
      </div>
    );
  }

  const t = data.totals;
  const p = data.previousTotals;
  const totalErrors = data.steps.reduce((sum, s) => sum + s.errors, 0);

  return (
    <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiTile label="Opened the page" value={formatNumber(t.pageVisitors)} current={t.pageVisitors} previous={p.pageVisitors} icon={Users} />
        <KpiTile
          label="Started"
          value={formatNumber(t.started)}
          current={t.started}
          previous={p.started}
          icon={MousePointerClick}
          hint={`${formatPercent(ratio(t.started, t.pageVisitors))} of page visitors began the first question`}
        />
        <KpiTile label="Submitted" value={formatNumber(t.submitted)} current={t.submitted} previous={p.submitted} icon={CheckCircle2} />
        <KpiTile
          label="Completion rate"
          value={t.started ? formatPercent(ratio(t.submitted, t.started)) : '–'}
          current={ratio(t.submitted, t.started)}
          previous={ratio(p.submitted, p.started)}
          icon={Percent}
          hint="Share of people who started and went on to submit"
        />
        <KpiTile
          label="Median time to finish"
          value={t.medianCompletionMs !== null ? formatDuration(t.medianCompletionMs) : '–'}
          current={t.medianCompletionMs ?? 0}
          previous={p.medianCompletionMs ?? 0}
          icon={Clock}
          lowerIsBetter
        />
        <KpiTile
          label="Saved submissions"
          value={formatNumber(t.savedSubmissions)}
          current={t.savedSubmissions}
          previous={p.savedSubmissions}
          icon={Database}
          hint="Every submission stored in the database, including people whose browsers block analytics"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="font-serif text-2xl text-white/90">Funnel</h2>
          <p className="mb-5 text-xs text-white/40">Unique people reaching each stage · {rangeLabel}</p>
          <Funnel stages={data.funnel} />
        </section>
        <section className={`${card} lg:col-span-3`}>
          <h2 className="font-serif text-2xl text-white/90">Responses over time</h2>
          <p className="mb-2 text-xs text-white/40">
            {data.range.interval === 'month' ? 'Monthly' : 'Daily'} unique people · times in {data.range.tz}
          </p>
          <TrendChart
            data={data.series}
            series={[
              { key: 'pageVisitors', label: 'Opened', color: SERIES_COLORS[0] },
              { key: 'started', label: 'Started', color: SERIES_COLORS[1] },
              { key: 'submitted', label: 'Submitted', color: SERIES_COLORS[2] },
            ]}
            interval={data.range.interval}
            label={`${data.form.label} opened, started and submitted`}
          />
        </section>
      </div>

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl text-white/90">Step by step</h2>
          <p className="text-xs text-white/40">
            {formatNumber(totalErrors)} validation {totalErrors === 1 ? 'message' : 'messages'}
            {data.submitErrors ? ` · ${formatNumber(data.submitErrors)} failed submissions` : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-[0.68rem] uppercase tracking-[0.12em] text-white/35">
              <tr>
                <th className="px-3 py-2 font-medium">Step</th>
                <th className="px-3 py-2 text-right font-medium">Reached</th>
                <th className="px-3 py-2 text-right font-medium">Of starters</th>
                <th className="px-3 py-2 text-right font-medium">Median time</th>
                <th className="px-3 py-2 text-right font-medium">Blocked by validation</th>
                <th className="px-3 py-2 font-medium">Most common message</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.steps.map((s) => (
                <tr key={s.step} className="border-t border-white/5">
                  <td className="px-3 py-3 text-white/85">
                    <span className="mr-2 text-white/35">{s.step}</span>
                    {s.label}
                  </td>
                  <td className="px-3 py-3 text-right text-white/80">{formatNumber(s.reached)}</td>
                  <td className="px-3 py-3 text-right text-white/60">{t.started ? formatPercent(ratio(s.reached, t.started)) : '–'}</td>
                  <td className="px-3 py-3 text-right text-white/80">{s.medianMs !== null ? formatDuration(s.medianMs) : '–'}</td>
                  <td className="px-3 py-3 text-right text-white/80">{formatNumber(s.errors)}</td>
                  <td className="max-w-[18rem] truncate px-3 py-3 text-white/50" title={s.topError}>
                    {s.topError ?? '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <h2 className="mb-1 font-serif text-2xl text-white/90">What people said</h2>
        <p className="mb-4 text-xs text-white/40">From {formatNumber(t.savedSubmissions)} saved submissions in this period</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.score && <ScoreCard score={data.score} />}
          {data.answers.map((a) => (
            <AnswerCard key={a.id} answer={a} />
          ))}
        </div>
      </div>

      {data.comments.length > 0 && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl text-white/90">
            <MessageSquareQuote size={20} className="text-teal-300/70" aria-hidden />
            In their words
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.comments.map((c, i) => (
              <li key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <p className="mb-2 text-[0.66rem] uppercase tracking-[0.14em] text-teal-300/60">{c.question}</p>
                <blockquote className="whitespace-pre-line text-sm leading-relaxed text-white/80">&ldquo;{c.text}&rdquo;</blockquote>
                <p className="mt-2 text-xs text-white/35">{formatDateTime(c.at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Where respondents come from"
          totalVisitors={t.pageVisitors}
          tabs={[
            { id: 'referrers', label: 'Referrer', rows: data.sources.referrers },
            {
              id: 'campaigns',
              label: 'Campaign',
              rows: data.sources.campaigns,
              empty: `No UTM-tagged visits. Share ${data.form.path}?utm_source=… to track a campaign.`,
            },
          ]}
        />
        <BreakdownCard
          title="Who opens it"
          totalVisitors={t.pageVisitors}
          tabs={[
            { id: 'countries', label: 'Country', rows: data.sources.countries, showFlags: true },
            { id: 'cities', label: 'City', rows: data.sources.cities, showFlags: true },
            { id: 'devices', label: 'Device', rows: data.sources.devices },
          ]}
        />
      </div>
    </div>
  );
}
