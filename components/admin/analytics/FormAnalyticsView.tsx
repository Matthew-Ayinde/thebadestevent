'use client';

import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, MessageSquareQuote, TrendingDown } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import type { AnswerBreakdown, FormAnalyticsData, FormId } from '@/lib/analytics-forms';
import { BarList, Empty, Panel } from './Panels';
import { Flag } from './Visitors';
import { delta, fmtBucket, fmtCompact, fmtDateTime, fmtDuration, fmtNumber, fmtPercent, type Granularity } from './format';

// Validated together (dataviz validate_palette, dark mode, all pairs) on the admin card surface.
const LINES = [
  { key: 'pageVisitors', label: 'Opened', color: '#3987e5' },
  { key: 'started', label: 'Started', color: '#d95926' },
  { key: 'submitted', label: 'Submitted', color: '#0fa594' },
] as const;

const ratio = (a: number, b: number) => (b ? a / b : 0);

function Tile({
  label,
  value,
  current,
  previous,
  hint,
  invert,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  hint: string;
  invert?: boolean;
}) {
  const d = delta(current, previous);
  const up = (d ?? 0) > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" title={hint}>
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{value}</p>
      <p className="mt-1 text-[0.72rem]">
        {d === null ? (
          <span className="text-white/35">new</span>
        ) : Math.abs(d) < 0.005 ? (
          <span className="text-white/35">no change</span>
        ) : (
          <span className={`inline-flex items-center gap-0.5 font-medium ${good ? 'text-emerald-300' : 'text-rose-300'}`}>
            <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
            <span className="sr-only">{up ? 'up' : 'down'}</span>
            {Math.abs(d * 100).toFixed(Math.abs(d) < 0.1 ? 1 : 0)}%
          </span>
        )}
      </p>
    </div>
  );
}

function Funnel({ stages }: { stages: FormAnalyticsData['funnel'] }) {
  const top = Math.max(1, ...stages.map((s) => s.visitors));
  // Flag the single largest loss between two consecutive stages.
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
    <ol className="space-y-3">
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
                    {fmtPercent(kept)} continued
                  </span>
                )}
                <span className="font-semibold text-white/90">{fmtNumber(s.visitors)}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#0fa594]"
                style={{ width: `${(s.visitors / top) * 100}%` }}
                title={`${s.label}: ${fmtNumber(s.visitors)} people`}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ChartTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/12 bg-[#0b1f23]/95 px-3.5 py-2.5 text-sm shadow-xl shadow-black/40 backdrop-blur">
      <p className="mb-1.5 text-xs text-white/50">{fmtBucket(row.date, unit, true)}</p>
      {LINES.map((l) => (
        <div key={l.key} className="flex items-center gap-2.5 py-0.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: l.color }} />
          <span className="font-semibold tabular-nums text-white">{fmtNumber(row[l.key])}</span>
          <span className="text-white/55">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ series, unit }: { series: FormAnalyticsData['series']; unit: Granularity }) {
  const [table, setTable] = useState(false);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-4" aria-label="Legend">
          {LINES.map((l) => (
            <li key={l.key} className="flex items-center gap-2 text-sm text-white/70">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs text-white/50 underline-offset-4 hover:text-white/80 hover:underline">
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0b1d21] text-left text-xs uppercase tracking-[0.1em] text-white/40">
              <tr>
                <th className="px-4 py-2.5 font-medium">Period</th>
                {LINES.map((l) => (
                  <th key={l.key} className="px-4 py-2.5 text-right font-medium">
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums text-white/80">
              {[...series].reverse().map((p) => (
                <tr key={p.date} className="border-t border-white/5">
                  <td className="px-4 py-2">{fmtBucket(p.date, unit, true)}</td>
                  {LINES.map((l) => (
                    <td key={l.key} className="px-4 py-2 text-right">
                      {fmtNumber(p[l.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => fmtBucket(d, unit)}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tickFormatter={fmtCompact} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'rgba(255,255,255,0.25)' }} />
              {LINES.map((l) => (
                <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#0b1d21' }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AnswerCard({ answer }: { answer: AnswerBreakdown }) {
  return (
    <Panel
      title={answer.question}
      subtitle={`${fmtNumber(answer.respondents)} ${answer.respondents === 1 ? 'response' : 'responses'}${answer.multi ? ' · several choices allowed' : ''}`}
    >
      <BarList
        valueLabel="Responses"
        items={answer.rows.map((r) => ({
          key: r.label,
          label: r.label,
          value: r.count,
          meta: fmtPercent(ratio(r.count, answer.respondents)),
        }))}
      />
    </Panel>
  );
}

export default function FormAnalyticsView({
  form,
  from,
  to,
  tz,
  unit,
  refreshKey,
}: {
  form: FormId;
  from: string;
  to: string;
  tz: string;
  unit: Granularity;
  refreshKey: number;
}) {
  const [data, setData] = useState<FormAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ form, from, to, tz, unit });
    fetch(`/api/analytics/forms?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((d: FormAnalyticsData) => {
        if (!cancelled) {
          setData(d);
          setFailed(false);
        }
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [form, from, to, tz, unit, refreshKey]);

  // Never show one form's numbers under another form's tab.
  if (!data || data.form.id !== form) {
    return <div className="py-32">{loading ? <LoadingSpinner /> : <Empty>{failed ? 'Form analytics could not be loaded.' : null}</Empty>}</div>;
  }

  const t = data.totals;
  const p = data.previousTotals;
  const multiStep = data.form.steps.length > 1;
  const totalErrors = data.steps.reduce((n, s) => n + s.errors, 0);

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${loading ? 'opacity-50' : ''}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile label="Opened the page" value={fmtCompact(t.pageVisitors)} current={t.pageVisitors} previous={p.pageVisitors} hint={`Unique visitors to ${data.form.path}`} />
        <Tile label="Started" value={fmtCompact(t.started)} current={t.started} previous={p.started} hint={data.form.startedMeans} />
        <Tile label="Submitted" value={fmtCompact(t.submitted)} current={t.submitted} previous={p.submitted} hint="Unique people who submitted successfully" />
        <Tile
          label="Completion rate"
          value={t.started ? fmtPercent(ratio(t.submitted, t.started)) : '–'}
          current={ratio(t.submitted, t.started)}
          previous={ratio(p.submitted, p.started)}
          hint="Share of people who started and went on to submit"
        />
        <Tile
          label="Median time to finish"
          value={t.medianCompletionMs !== null ? fmtDuration(t.medianCompletionMs) : '–'}
          current={t.medianCompletionMs ?? 0}
          previous={p.medianCompletionMs ?? 0}
          hint="From starting to a successful submission"
          invert
        />
        <Tile
          label="Saved submissions"
          value={fmtCompact(t.savedSubmissions)}
          current={t.savedSubmissions}
          previous={p.savedSubmissions}
          hint="Every submission stored in the database, including from browsers that block analytics"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Funnel" subtitle="Unique people reaching each stage" className="lg:col-span-2">
          <Funnel stages={data.funnel} />
        </Panel>
        <Panel title="Over time" subtitle={`Unique people per ${data.range.unit} · times in ${data.range.tz}`} className="lg:col-span-3">
          <Trend series={data.series} unit={data.range.unit} />
        </Panel>
      </div>

      <Panel
        title={multiStep ? 'Step by step' : 'Where people get stuck'}
        subtitle={`${fmtNumber(totalErrors)} validation ${totalErrors === 1 ? 'message' : 'messages'}${
          data.submitErrors ? ` · ${fmtNumber(data.submitErrors)} failed submissions` : ''
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-[0.68rem] uppercase tracking-[0.14em] text-white/35">
              <tr>
                <th className="px-3 py-2 font-medium">Step</th>
                <th className="px-3 py-2 text-right font-medium">Reached</th>
                <th className="px-3 py-2 text-right font-medium">Of starters</th>
                {multiStep && <th className="px-3 py-2 text-right font-medium">Median time</th>}
                <th className="px-3 py-2 text-right font-medium">Blocked by validation</th>
                <th className="px-3 py-2 font-medium">Most common message</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.steps.map((s) => (
                <tr key={s.step} className="border-t border-white/5">
                  <td className="px-3 py-3 text-white/85">
                    {multiStep && <span className="mr-2 text-white/35">{s.step}</span>}
                    {s.label}
                  </td>
                  <td className="px-3 py-3 text-right text-white/80">{fmtNumber(s.reached)}</td>
                  <td className="px-3 py-3 text-right text-white/55">{t.started ? fmtPercent(ratio(s.reached, t.started)) : '–'}</td>
                  {multiStep && <td className="px-3 py-3 text-right text-white/80">{s.medianMs !== null ? fmtDuration(s.medianMs) : '–'}</td>}
                  <td className="px-3 py-3 text-right text-white/80">{fmtNumber(s.errors)}</td>
                  <td className="max-w-[18rem] truncate px-3 py-3 text-white/50" title={s.topError}>
                    {s.topError ?? '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {data.answers.length > 0 && (
        <div>
          <h2 className="font-serif text-xl text-white/90">What people told us</h2>
          <p className="mb-4 mt-0.5 text-xs text-white/40">From {fmtNumber(t.savedSubmissions)} saved submissions in this period</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.answers.map((a) => (
              <AnswerCard key={a.id} answer={a} />
            ))}
          </div>
        </div>
      )}

      {data.comments.length > 0 && (
        <Panel title="In their words" subtitle="Most recent free-text answers">
          <ul className="grid gap-3 md:grid-cols-2">
            {data.comments.map((c, i) => (
              <li key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-teal-300/70">
                  <MessageSquareQuote size={12} aria-hidden /> {c.question}
                </p>
                <blockquote className="whitespace-pre-line text-sm leading-relaxed text-white/80">&ldquo;{c.text}&rdquo;</blockquote>
                <p className="mt-2 text-xs text-white/35">{fmtDateTime(c.at)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Where they came from" subtitle="Source of the visit">
          <BarList valueLabel="Visitors" items={data.sources.sources.map((r) => ({ key: r.label, label: r.label, value: r.visitors }))} />
        </Panel>
        <Panel title="Countries" subtitle="Who opens the form">
          <BarList
            valueLabel="Visitors"
            items={data.sources.countries.map((r) => ({
              key: r.code ?? r.label,
              label: (
                <span className="flex items-center gap-2">
                  <Flag code={r.code} /> {r.label}
                </span>
              ),
              value: r.visitors,
            }))}
          />
        </Panel>
        <Panel title="Campaigns & devices" subtitle="UTM campaigns, then devices">
          {data.sources.campaigns.length > 0 && (
            <div className="mb-5">
              <BarList valueLabel="Visitors" items={data.sources.campaigns.map((r) => ({ key: r.label, label: r.label, value: r.visitors }))} />
            </div>
          )}
          <BarList valueLabel="Visitors" items={data.sources.devices.map((r) => ({ key: r.label, label: r.label, value: r.visitors }))} />
        </Panel>
      </div>
    </div>
  );
}
