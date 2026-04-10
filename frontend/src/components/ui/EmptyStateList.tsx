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
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3">
        <div>
          <h3 className="text-base font-semibold leading-5 text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p> : null}
        </div>
        {headerAction ? <div>{headerAction}</div> : null}
      </div>

      <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center p-5 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
          <EmptyIcon className="h-5 w-5" />
        </div>
        <h4 className="mt-3 text-sm font-semibold text-slate-900">Nothing to see here — yet</h4>
        <p className="mt-1 max-w-[300px] text-xs leading-5 text-slate-500">{emptyMessage}</p>
        <button className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
