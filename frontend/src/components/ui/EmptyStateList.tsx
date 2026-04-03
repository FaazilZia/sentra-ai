import React from 'react';
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
    <div className="bg-white/70 backdrop-blur-md border shadow-sm rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b flex items-center justify-between bg-white/40">
        <div>
          <h3 className="font-semibold text-slate-900 leading-none">{title}</h3>
          {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center min-h-[300px] bg-slate-50/20">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-success/5">
          <EmptyIcon className="w-8 h-8 text-success" />
        </div>
        <h4 className="font-semibold text-slate-900 mb-1">System Secure</h4>
        <p className="text-sm text-slate-500 max-w-[250px]">{emptyMessage}</p>
        <button className="mt-6 px-4 py-2 border text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
          View Historical Data
        </button>
      </div>
    </div>
  );
}
