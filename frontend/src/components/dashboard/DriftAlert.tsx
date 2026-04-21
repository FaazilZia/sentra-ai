import React from 'react';
import { Wind, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriftAlertProps {
  driftPercentage: number;
  timeWindow: string;
  severity: 'low' | 'medium' | 'high';
}

export const DriftAlert: React.FC<DriftAlertProps> = ({ 
  driftPercentage, timeWindow, severity 
}) => {
  return (
    <div className={cn(
       "p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500",
       severity === 'high' ? 'bg-rose-500/[0.03] border border-rose-500/10' : 'bg-amber-500/[0.03] border border-amber-500/10'
    )}>
       <div className="flex items-center gap-6">
          <div className={cn(
             "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-2xl",
             severity === 'high' ? 'bg-rose-500 text-white border-rose-500/20' : 'bg-amber-500 text-white border-amber-500/20'
          )}>
             <Wind className="h-6 w-6" />
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Compliance Drift Detected</span>
                <span className={cn(
                   "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                   severity === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                )}>{severity} Severity</span>
             </div>
             <h4 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                Behavioral Baseline Shift: {driftPercentage}%
             </h4>
          </div>
       </div>

       <div className="flex items-center gap-12">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-slate-600" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Time Window</p>
             </div>
             <p className="text-lg font-black text-white tracking-tight uppercase">{timeWindow}</p>
          </div>
          <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">
             Audit Drift
          </button>
       </div>
    </div>
  );
};
