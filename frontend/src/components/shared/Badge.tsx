import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'royal' | 'success' | 'warning' | 'danger' | 'compliant' | 'ghost';
  className?: string;
}

const variants = {
  royal: 'bg-[var(--royal-indigo)] text-white',
  success: 'bg-[var(--risk-low)] text-[var(--risk-low-text)]',
  warning: 'bg-[var(--risk-medium)] text-[var(--risk-medium-text)]',
  danger: 'bg-[var(--risk-critical)] text-[var(--risk-critical-text)]',
  compliant: 'bg-[var(--risk-compliant)] text-[var(--risk-compliant-text)]',
  ghost: 'bg-[var(--ghost-violet)] text-[var(--royal-indigo)]',
};

export function Badge({ children, variant = 'royal', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight',
      variants[variant as keyof typeof variants],
      className
    )}>
      {children}
    </span>
  );
}
