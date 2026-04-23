import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SurfaceCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SurfaceCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SurfaceCardProps) {
  return (
    <section
      className={cn(
        'h-full overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1424] shadow-2xl transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/5 bg-[#0d1424] p-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
          {description ? <p className="mt-1 text-[10px] leading-4 text-slate-400 font-medium">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className={cn('p-4', contentClassName)}>{children}</div>
    </section>
  );
}
