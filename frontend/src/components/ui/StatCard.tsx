import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value?: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: string;
  industryRate?: string;
  sparkline?: number[];
  valueColor?: string;
}

export function StatCard({
  title,
  value = '---',
  icon: Icon,
  iconClassName,
  trend = 'Waiting for data',
  industryRate = 'Industry Rate: 90%',
  sparkline = [24, 42, 34, 56, 48, 68, 61, 78],
  valueColor = "text-white"
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
    <div className="group relative flex h-full min-h-[140px] flex-col justify-between overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1424] p-4 transition-all hover:border-cyan-500/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
          {isSkeleton ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-white/5" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-white/5" />
            </div>
          ) : (
            <>
              <p className={cn("mt-1.5 font-mono text-2xl font-bold tracking-tighter", valueColor)}>{value}</p>
              <p className="mt-1 text-[10px] font-medium leading-3 text-slate-500 italic">
                {industryRate}
              </p>
            </>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-slate-950/50">
          <Icon className={cn('h-4 w-4 text-cyan-400', iconClassName)} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="max-w-[58%] text-[10px] leading-4 text-slate-400">{trend}</p>
        <svg viewBox="0 0 100 44" className="h-10 w-24 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" role="img" aria-label={`${title} trend`}>
          <polyline
            fill="none"
            points={points}
            stroke="#06b6d4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path d={`M0 44 L${points.split(' ').join(' L')} L100 44 Z`} fill="rgba(6, 182, 212, 0.05)" />
        </svg>
      </div>
    </div>
  );
}
