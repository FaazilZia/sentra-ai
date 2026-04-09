import { ShieldCheck, LucideIcon } from 'lucide-react';

interface EmptyStateListProps {
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export function EmptyStateList({ 
  title, 
  description, 
  headerAction, 
  emptyMessage = "No active incidents detected", 
  emptyIcon: EmptyIcon = ShieldCheck 
}: EmptyStateListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/4">
        <div>
          <h3 className="font-semibold text-slate-100 leading-none">{title}</h3>
          {description && <p className="text-sm text-slate-400 mt-1.5">{description}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <div className="relative flex min-h-[300px] flex-1 flex-col items-center justify-center bg-slate-950/10 p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_bottom,rgba(74,222,128,0.06),transparent_28%)]" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10 ring-8 ring-white/5 shadow-inner shadow-white/10 backdrop-blur-md mb-4">
          <EmptyIcon className="w-8 h-8 text-emerald-300" />
        </div>
        <h4 className="relative mb-1 font-semibold text-slate-100">System Secure</h4>
        <p className="relative max-w-[280px] text-sm leading-6 text-slate-400">{emptyMessage}</p>
        <button className="relative mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 backdrop-blur-md">
          View Historical Data
        </button>
      </div>
    </div>
  );
}
