import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value?: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: string;
  industryRate?: string;
  sparkline?: number[];
}

export function StatCard({
  title,
  value = '---',
  icon: Icon,
  iconClassName,
  trend = 'Waiting for data',
  industryRate = 'Industry Rate: 90%',
  sparkline = [24, 42, 34, 56, 48, 68, 61, 78],
}: StatCardProps) {
  const isSkeleton = value === '---';
  const points = sparkline
    .map((point, index) => {
      const x = (index / Math.max(sparkline.length - 1, 1)) * 100;
      const y = 42 - (point / 100) * 34;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/60 bg-white/80 p-4 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur transition-all hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-slate-500">{title}</p>
          {isSkeleton ? (
            <div className="mt-3 space-y-2">
              <div className="h-8 w-24 animate-pulse rounded-md bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-950">{value}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {industryRate}
              </p>
            </>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <Icon className={cn('h-4 w-4 text-slate-700', iconClassName)} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="max-w-[58%] text-xs leading-5 text-slate-500">{trend}</p>
        <svg viewBox="0 0 100 44" className="h-11 w-28" role="img" aria-label={`${title} trend`}>
          <polyline
            fill="none"
            points={points}
            stroke="#0F172A"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path d={`M0 44 L${points.split(' ').join(' L')} L100 44 Z`} fill="rgba(15,23,42,0.06)" />
        </svg>
      </div>
    </div>
  );
}
