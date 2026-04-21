import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfidenceContextProps {
  confidence: 'High' | 'Medium' | 'Low';
  limitation: string;
  falsePositiveRisk: 'Low' | 'Medium' | 'High';
}

export const ConfidenceContext: React.FC<ConfidenceContextProps> = ({ 
  confidence, 
  limitation, 
  falsePositiveRisk 
}) => {
  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="h-3 w-3 text-slate-500 mt-0.5" />
        <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic">
          Decision Doubt: {limitation}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">False Positive Risk:</span>
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
            falsePositiveRisk === 'High' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" :
            falsePositiveRisk === 'Medium' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
            "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
          )}>
            {falsePositiveRisk}
          </span>
        </div>
      </div>
    </div>
  );
};
