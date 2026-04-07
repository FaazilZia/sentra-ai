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
    <div className="bg-white/6 backdrop-blur-xl border border-white/10 shadow-lg shadow-slate-950/20 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/4">
        <div>
          <h3 className="font-semibold text-slate-100 leading-none">{title}</h3>
          {description && <p className="text-sm text-slate-400 mt-1.5">{description}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center min-h-[300px] bg-slate-950/10">
        <div className="w-16 h-16 bg-white/10 border border-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 ring-8 ring-white/5 shadow-inner shadow-white/10">
          <EmptyIcon className="w-8 h-8 text-emerald-300" />
        </div>
        <h4 className="font-semibold text-slate-100 mb-1">System Secure</h4>
        <p className="text-sm text-slate-400 max-w-[250px]">{emptyMessage}</p>
        <button className="mt-6 px-4 py-2 border border-white/10 bg-white/5 text-sm font-medium rounded-xl text-slate-200 hover:bg-white/10 transition-colors backdrop-blur-md">
          View Historical Data
        </button>
      </div>
    </div>
  );
}
