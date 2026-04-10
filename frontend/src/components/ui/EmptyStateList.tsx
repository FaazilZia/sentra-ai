import { Box, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateListProps {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  actionLabel?: string;
}

export function EmptyStateList({
  title,
  description,
  headerAction,
  emptyMessage = 'Nothing to see here — yet',
  emptyIcon: EmptyIcon = Box,
  actionLabel = 'Start Scan',
}: EmptyStateListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/65 p-4">
        <div>
          <h3 className="text-sm font-semibold leading-none text-slate-900">{title}</h3>
          {description ? <p className="mt-1.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {headerAction ? <div>{headerAction}</div> : null}
      </div>

      <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
          <EmptyIcon className="h-7 w-7" />
        </div>
        <h4 className="mt-4 text-sm font-semibold text-slate-900">Nothing to see here — yet</h4>
        <p className="mt-2 max-w-[300px] text-sm leading-6 text-slate-500">{emptyMessage}</p>
        <button className="mt-5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
