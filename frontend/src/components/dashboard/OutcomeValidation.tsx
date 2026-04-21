import React from 'react';
import { ArrowUpRight, Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecoveryNarrative } from './RecoveryNarrative';

interface OutcomeValidationProps {
  status: 'verified' | 'failed';
  prevScore: number;
  newScore: number;
  prevRisk: string;
  newRisk: string;
  confidence: string;
  narrative?: string;
}

export const OutcomeValidation: React.FC<OutcomeValidationProps> = ({ 
  status, prevScore, newScore, prevRisk, newRisk, confidence, narrative 
}) => {
  const isVerified = status === 'verified';

  return (
    <div className="group p-8 rounded-[3rem] bg-slate-900/40 border border-white/5 space-y-8 transition-all hover:border-white/10">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={cn(
               "h-10 w-10 rounded-xl flex items-center justify-center border",
               isVerified ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
             )}>
                {isVerified ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5 text-rose-500" />}
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Outcome Verification</p>
                <h4 className="text-xl font-black text-white tracking-tighter uppercase">
                   {isVerified ? "Closed-Loop Success" : "Validation Failed"}
                </h4>
             </div>
          </div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
             {confidence} Confidence
          </span>
       </div>

       <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
          <div className="space-y-4">
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Score Delta</p>
             <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">{newScore}%</span>
                <span className="text-sm font-bold text-emerald-500">+{newScore - prevScore}% ↑</span>
             </div>
          </div>
          <div className="space-y-4">
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Risk Evolution</p>
             <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">{prevRisk}</span>
                <ArrowUpRight className="h-3 w-3 text-slate-700" />
                <span className={cn(
                   "text-sm font-black uppercase",
                   newRisk === 'Low' ? 'text-emerald-500' : 'text-rose-500'
                 )}>{newRisk}</span>
             </div>
          </div>
       </div>

       {narrative && (
         <RecoveryNarrative narrative={narrative} />
       )}

       <div className="flex items-center gap-3 pt-2">
          <div className={cn(
             "h-2 w-2 rounded-full",
             isVerified ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
          )} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {isVerified ? "Changes verified against policy baseline" : "Residual risk above threshold"}
          </p>
       </div>
    </div>
  );
};
