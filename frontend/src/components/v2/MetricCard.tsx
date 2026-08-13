import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isGood?: boolean;
  };
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  testId?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  status = 'primary',
  testId,
  className
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
          accent: 'border-l-emerald-500'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
          accent: 'border-l-amber-500'
        };
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20',
          accent: 'border-l-rose-500'
        };
      case 'info':
        return {
          iconBg: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500/20',
          accent: 'border-l-sky-500'
        };
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20',
          accent: 'border-l-indigo-600'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between p-4 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all border-l-4",
        styles.accent,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={cn("p-2 rounded-lg border shrink-0", styles.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <div data-testid={testId} className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-bold font-mono px-1.5 py-0.5 rounded text-[10px]",
                  trend.isGood ?? trend.direction === 'up'
                    ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
                    : "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
                )}
              >
                {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                {trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
