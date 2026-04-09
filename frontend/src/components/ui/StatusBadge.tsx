import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  default: 'border-white/10 bg-white/5 text-slate-200',
  success: 'border-emerald-300/15 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-300/15 bg-amber-400/10 text-amber-200',
  danger: 'border-rose-300/15 bg-rose-400/10 text-rose-200',
  info: 'border-cyan-300/15 bg-cyan-400/10 text-cyan-100',
};

export function StatusBadge({ label, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}
