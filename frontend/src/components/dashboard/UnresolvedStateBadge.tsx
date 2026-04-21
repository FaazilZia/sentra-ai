import React from 'react';
import { cn } from '../../lib/utils';

export type UnresolvedState = 'Under Investigation' | 'Inconclusive' | 'Monitoring';

interface UnresolvedStateBadgeProps {
  state: UnresolvedState;
}

export const UnresolvedStateBadge: React.FC<UnresolvedStateBadgeProps> = ({ state }) => {
  return (
    <span className={cn(
      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm",
      state === 'Under Investigation' ? "text-indigo-400 border-indigo-400/20 bg-indigo-400/5" :
      state === 'Inconclusive' ? "text-slate-400 border-slate-500/20 bg-slate-500/5" :
      "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
    )}>
      • {state}
    </span>
  );
};
