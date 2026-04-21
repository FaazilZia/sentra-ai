import React from 'react';
import { EyeOff } from 'lucide-react';

export const SilentRisk: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900/20 border border-dashed border-white/10 rounded-2xl flex items-start gap-4">
      <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
        <EyeOff className="h-4 w-4 text-slate-500" />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Silent Risk Detected</p>
        <p className="text-[11px] font-bold text-slate-400 uppercase leading-snug">
          No active violations detected, but anomaly patterns observed in cross-region traffic.
        </p>
      </div>
    </div>
  );
};
