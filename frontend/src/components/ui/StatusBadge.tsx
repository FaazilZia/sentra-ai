import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  default: 'border-slate-200 bg-slate-50 text-slate-600 before:bg-slate-400',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 before:bg-emerald-500',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 before:bg-amber-500',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 before:bg-rose-600',
  info: 'border-sky-200 bg-sky-50 text-sky-700 before:bg-sky-500',
};

export function StatusBadge({ label, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium before:h-1.5 before:w-1.5 before:rounded-full',
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}
