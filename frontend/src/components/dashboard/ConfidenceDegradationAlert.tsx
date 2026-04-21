import React from 'react';
import { Activity, ShieldAlert } from 'lucide-react';

interface ConfidenceDegradationAlertProps {
  currentConfidence: number;
  dropAmount: number;
  reason: string;
}

export const ConfidenceDegradationAlert: React.FC<ConfidenceDegradationAlertProps> = ({ 
  currentConfidence, 
  dropAmount, 
  reason 
}) => {
  return (
    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl relative overflow-hidden group transition-all">
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Confidence Degradation Detected</h3>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-black text-amber-500 tracking-tighter">{currentConfidence}%</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest leading-none">
              -{dropAmount}% variance
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase">Stability: Degrading but contained</span>
          </div>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[11px] font-bold text-slate-400 uppercase leading-snug">
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
};
