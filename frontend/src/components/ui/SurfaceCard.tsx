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
        'h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-3">
        <div>
          <h3 className="text-base font-semibold leading-5 text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className={cn('p-3', contentClassName)}>{children}</div>
    </section>
  );
}
