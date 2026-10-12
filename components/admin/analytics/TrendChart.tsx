'use client';

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COMPARE_COLOR, SERIES_COLOR, fmtBucket, fmtCompact, fmtNumber, type Granularity, type SeriesPoint } from './format';

export type ChartMetric = 'visitors' | 'newVisitors' | 'sessions' | 'pageviews' | 'conversions';

interface Props {
  metric: ChartMetric;
  metricLabel: string;
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  unit: Granularity;
  compare: boolean;
  showTable: boolean;
}

interface Row {
  date: string;
  value: number;
  previous?: number;
  previousDate?: string;
}

function ChartTooltip({ active, payload, unit, metricLabel, compare }: any) {
  if (!active || !payload?.length) return null;
  const row: Row = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/12 bg-[#0b1f23]/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur text-sm">
      <p className="text-white/50 text-xs mb-1.5">{metricLabel}</p>
      <div className="flex items-center gap-2.5">
        <span className="h-0.5 w-3.5 rounded-full" style={{ background: SERIES_COLOR }} />
        <span className="font-semibold text-white">{fmtNumber(row.value)}</span>
        <span className="text-white/55">{fmtBucket(row.date, unit, true)}</span>
      </div>
      {compare && row.previousDate !== undefined && (
        <div className="flex items-center gap-2.5 mt-1">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: COMPARE_COLOR }} />
          <span className="font-semibold text-white/80">{fmtNumber(row.previous ?? 0)}</span>
          <span className="text-white/45">{fmtBucket(row.previousDate, unit, true)}</span>
        </div>
      )}
    </div>
  );
}

export default function TrendChart({ metric, metricLabel, series, previousSeries, unit, compare, showTable }: Props) {
  const data: Row[] = series.map((p, i) => ({
    date: p.date,
    value: p[metric],
    previous: previousSeries[i]?.[metric],
    previousDate: previousSeries[i]?.date,
  }));

  if (showTable) {
    return (
      <div className="max-h-[320px] overflow-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0b1f23]">
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-white/45">
              <th className="px-4 py-2.5 font-medium">Period</th>
              <th className="px-4 py-2.5 font-medium text-right">{metricLabel}</th>
              {compare && <th className="px-4 py-2.5 font-medium text-right">Previous period</th>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((r) => (
              <tr key={r.date} className="border-t border-white/5">
                <td className="px-4 py-2 text-white/75">{fmtBucket(r.date, unit, true)}</td>
                <td className="px-4 py-2 text-right text-white/90">{fmtNumber(r.value)}</td>
                {compare && <td className="px-4 py-2 text-right text-white/55">{r.previousDate ? fmtNumber(r.previous ?? 0) : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="h-[320px] w-full" role="img" aria-label={`${metricLabel} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => fmtBucket(d, unit)}
            interval={tickEvery - 1}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            minTickGap={12}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            tickFormatter={fmtCompact}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip unit={unit} metricLabel={metricLabel} compare={compare} />}
            cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }}
          />
          {compare && (
            <Line
              type="monotone"
              dataKey="previous"
              stroke={COMPARE_COLOR}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: '#9aa8aa', stroke: '#0c1c1f', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={data.length === 1 ? { r: 4, fill: SERIES_COLOR } : false}
            activeDot={{ r: 5, fill: SERIES_COLOR, stroke: '#0c1c1f', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
