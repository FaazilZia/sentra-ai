import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StabilityIndicatorProps {
  status: string;
  systemsAffected: string;
}

export const StabilityIndicator: React.FC<StabilityIndicatorProps> = ({ status, systemsAffected }) => {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/40 border border-white/5 rounded-full">
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-1.5 w-1.5 rounded-full",
          status.includes('Degrading') ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500"
        )} />
        <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
          Stability: {status}
        </span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
        {systemsAffected}
      </span>
    </div>
  );
};
