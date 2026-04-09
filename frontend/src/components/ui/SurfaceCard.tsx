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
        'overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/6 shadow-lg shadow-slate-950/20 backdrop-blur-xl',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/4 p-5">
        <div>
          <h3 className="font-semibold leading-none text-slate-100">{title}</h3>
          {description ? <p className="mt-1.5 text-sm text-slate-400">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  );
}
