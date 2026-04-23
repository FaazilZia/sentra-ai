import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  default: 'border-white/10 bg-white/5 text-slate-400 before:bg-slate-400',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 before:bg-emerald-500 before:shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400 before:bg-amber-500 before:shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-400 before:bg-rose-500 before:shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 before:bg-cyan-500 before:shadow-[0_0_8px_rgba(6,182,212,0.5)]',
};

export function StatusBadge({ label, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider before:h-1.5 before:w-1.5 before:rounded-full',
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}
