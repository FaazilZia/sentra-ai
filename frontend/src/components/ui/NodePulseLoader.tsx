import { cn } from '@/lib/utils';

interface NodePulseLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function NodePulseLoader({ label, size = 'md', className }: NodePulseLoaderProps) {
  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="node-pulse-loader">
        <span className={dotSize} />
        <span className={dotSize} />
        <span className={dotSize} />
      </div>
      {label && (
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}
