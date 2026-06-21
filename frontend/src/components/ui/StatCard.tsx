import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'teal' | 'violet';

interface StatCardProps {
  title: string;
  value?: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: string;
  industryRate?: string;
  sparkline?: number[];
  valueColor?: string;
  section?: SectionColor;
}

const sectionDotColors: Record<SectionColor, string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  teal: 'bg-teal-500',
  violet: 'bg-violet-500',
};

const sectionStrokeColors: Record<SectionColor, string> = {
  indigo: '#4F46E5',
  emerald: '#059669',
  amber: '#D97706',
  rose: '#DC2626',
  teal: '#0D9488',
  violet: '#7C3AED',
};

export function StatCard({
  title,
  value = '---',
  icon: Icon,
  iconClassName,
  trend = 'Waiting for data',
  industryRate = 'Industry Rate: 90%',
  sparkline = [24, 42, 34, 56, 48, 68, 61, 78],
  valueColor = "text-[var(--text-primary)]",
  section = 'indigo'
}: StatCardProps) {
  const isSkeleton = value === '---';
  const points = sparkline
    .map((point, index) => {
      const x = (index / Math.max(sparkline.length - 1, 1)) * 100;
      const y = 42 - (point / 100) * 34;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = sectionStrokeColors[section] || '#4F46E5';

  return (
    <div className="group relative flex h-full min-h-[140px] flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-default)] bg-white p-4 transition-all hover:shadow-md">
      {/* Node dot (Fix 5) */}
      <span className={cn("absolute top-3 left-3 h-2.5 w-2.5 rounded-full", sectionDotColors[section])} />

      <div className="flex items-start justify-between gap-2 ml-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">{title}</p>
          {isSkeleton ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-[var(--bg-page)]" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--bg-page)]" />
            </div>
          ) : (
            <>
              <p className={cn("mt-1.5 font-mono text-2xl font-bold tracking-tighter", valueColor)}>{value}</p>
              <p className="mt-1 text-[10px] font-medium leading-3 text-[var(--text-muted)] italic">
                {industryRate}
              </p>
            </>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-page)]">
          <Icon className={cn('h-4 w-4 text-[var(--royal-indigo)]', iconClassName)} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="max-w-[58%] text-[10px] leading-4 text-[var(--text-secondary)]">{trend}</p>
        <svg viewBox="0 0 100 44" className="h-10 w-24 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" role="img" aria-label={`${title} trend`}>
          <polyline
            fill="none"
            points={points}
            stroke={strokeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path d={`M0 44 L${points.split(' ').join(' L')} L100 44 Z`} fill={`${strokeColor}10`} />
        </svg>
      </div>
    </div>
  );
}
