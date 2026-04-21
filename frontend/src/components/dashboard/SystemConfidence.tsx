import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SystemConfidenceProps {
  confidence: number;
  prevConfidence: number;
  trend: 'up' | 'down' | 'stable';
}

export const SystemConfidence: React.FC<SystemConfidenceProps> = ({ confidence, prevConfidence, trend }) => {
  const isDown = trend === 'down' || confidence < prevConfidence;

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">System Confidence</p>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-white">{confidence}%</span>
          {isDown && <TrendingDown className="h-3 w-3 text-rose-500" />}
          {!isDown && trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase",
          isDown ? "text-rose-500" : "text-emerald-500"
        )}>
          {isDown ? 'Drifting' : 'Optimal'}
        </span>
      </div>
      <p className="text-[8px] font-medium text-slate-600 uppercase tracking-tighter">
        Inferred from stability + resolution latency
      </p>
    </div>
  );
};
