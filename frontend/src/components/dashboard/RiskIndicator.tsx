import React from 'react';
import { cn } from '@/lib/utils';

interface RiskIndicatorProps {
  level: 'low' | 'medium' | 'high';
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({ level, className }) => {
  const configs = {
    low: { color: 'bg-emerald-500', text: 'Low Risk', glow: 'shadow-emerald-500/20' },
    medium: { color: 'bg-amber-500', text: 'Medium Risk', glow: 'shadow-amber-500/20' },
    high: { color: 'bg-rose-500', text: 'High Risk', glow: 'shadow-rose-500/20' },
  };

  const { color, text, glow } = configs[level];

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full bg-slate-800/50 border border-white/5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse shadow-[0_0_8px]", color, glow)} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
        {text}
      </span>
    </div>
  );
};
