import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

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
        'overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur transition-all hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/65 p-4">
        <div>
          <h3 className="text-sm font-semibold leading-none text-slate-900">{title}</h3>
          {description ? <p className="mt-1.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className={cn('p-4', contentClassName)}>{children}</div>
    </section>
  );
}
