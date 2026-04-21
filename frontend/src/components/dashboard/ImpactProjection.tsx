import React from 'react';
import { TrendingUp, ShieldCheck, Activity } from 'lucide-react';

interface ImpactProjectionProps {
  riskChange: string;
  confidenceRecovery: string;
  stabilityImprovement: string;
}

export const ImpactProjection: React.FC<ImpactProjectionProps> = ({ 
  riskChange, 
  confidenceRecovery, 
  stabilityImprovement 
}) => {
  return (
    <div className="space-y-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Expected Decision Impact</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Risk Index</p>
          <div className="flex items-center gap-1 text-emerald-500">
            <TrendingUp className="h-3 w-3 rotate-180" />
            <span className="text-[10px] font-bold uppercase">{riskChange}</span>
          </div>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Confidence</p>
          <div className="flex items-center gap-1 text-emerald-500">
            <ShieldCheck className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase">+{confidenceRecovery}</span>
          </div>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Stability</p>
          <div className="flex items-center gap-1 text-emerald-500">
            <Activity className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase">{stabilityImprovement}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
