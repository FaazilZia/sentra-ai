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
    <div className="group relative flex h-full min-h-[148px] flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium leading-4 text-slate-500">{title}</p>
          {isSkeleton ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-slate-200" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-slate-950">{value}</p>
              <p className="mt-1 text-[10px] font-medium leading-3 text-slate-400">
                {industryRate}
              </p>
            </>
          )}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
          <Icon className={cn('h-3.5 w-3.5 text-slate-700', iconClassName)} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="max-w-[58%] text-[10px] leading-4 text-slate-500">{trend}</p>
        <svg viewBox="0 0 100 44" className="h-10 w-24 shrink-0" role="img" aria-label={`${title} trend`}>
          <polyline
            fill="none"
            points={points}
            stroke="#0F172A"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path d={`M0 44 L${points.split(' ').join(' L')} L100 44 Z`} fill="rgba(15,23,42,0.04)" />
        </svg>
      </div>
    </div>
  );
}
