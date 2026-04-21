import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center shadow-inner backdrop-blur-sm", className)}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
        <Icon className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-100 tracking-tight">{title}</h3>
      <p className="mb-8 max-w-sm text-sm font-medium text-slate-300 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-6 py-2.5 text-sm font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:bg-cyan-500/20 hover:text-cyan-300 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
