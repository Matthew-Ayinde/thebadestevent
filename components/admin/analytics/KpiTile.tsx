import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { change, formatPercent } from './format';

interface Props {
  label: string;
  value: string;
  current: number;
  previous: number;
  icon: LucideIcon;
  /** For metrics like bounce rate, a decrease is the good direction. */
  lowerIsBetter?: boolean;
  hint?: string;
}

export default function KpiTile({ label, value, current, previous, icon: Icon, lowerIsBetter, hint }: Props) {
  const delta = change(current, previous);
  const flat = delta === null || Math.abs(delta) < 0.005;
  const good = !flat && (lowerIsBetter ? delta! < 0 : delta! > 0);
  const DeltaIcon = flat ? Minus : delta! > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-white/50">{label}</h3>
        <Icon className="h-4 w-4 text-white/30" aria-hidden />
      </div>
      <p className="font-serif text-3xl leading-none text-white/90">{value}</p>
      <p
        className={`mt-3 flex items-center gap-1 text-xs ${
          flat ? 'text-white/40' : good ? 'text-emerald-400' : 'text-rose-400'
        }`}
        title={hint}
      >
        <DeltaIcon size={14} aria-hidden />
        {delta === null ? (
          <span>No prior data</span>
        ) : (
          <span>
            {flat ? 'No change' : `${delta > 0 ? '+' : ''}${formatPercent(delta)}`}
            <span className="text-white/35"> vs previous</span>
          </span>
        )}
      </p>
    </div>
  );
}
