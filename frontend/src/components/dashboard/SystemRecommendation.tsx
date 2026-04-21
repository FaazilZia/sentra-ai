import React from 'react';
import { Compass, Info } from 'lucide-react';

interface SystemRecommendationProps {
  bias: string;
  reason: string;
}

export const SystemRecommendation: React.FC<SystemRecommendationProps> = ({ bias, reason }) => {
  return (
    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-indigo-400" />
        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">System Recommendation Bias</h4>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-black text-white uppercase tracking-tight">
          {bias}
        </p>
        <div className="flex items-start gap-2">
          <Info className="h-3 w-3 text-slate-500 mt-0.5" />
          <p className="text-[9px] font-bold text-slate-500 uppercase leading-snug">
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
};
