import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface AuditReadinessProps {
  score: number;
  status: string;
}

export const AuditReadiness: React.FC<AuditReadinessProps> = ({ score, status }) => {
  const isReady = score >= 90;

  return (
    <div className="flex items-center gap-12 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
       <div className="relative h-24 w-24">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
             <circle 
                cx="50" cy="50" r="45" 
                className="stroke-slate-900 fill-none" 
                strokeWidth="10" 
             />
             <circle 
                cx="50" cy="50" r="45" 
                className={cn(
                   "fill-none transition-all duration-1000",
                   isReady ? "stroke-emerald-500" : "stroke-amber-500"
                )} 
                strokeWidth="10" 
                strokeDasharray="282.7"
                strokeDashoffset={282.7 - (282.7 * score) / 100}
                strokeLinecap="round"
             />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xl font-black text-white">{score}%</span>
          </div>
       </div>

       <div className="space-y-3">
          <div className="flex items-center gap-2">
             {isReady ? (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
             ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
             )}
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Audit Readiness</span>
          </div>
          <div className="space-y-1">
             <h4 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{status}</h4>
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {isReady ? "Certified Baseline Reached" : "Pending High-Priority Evidence"}
             </p>
          </div>
       </div>
    </div>
  );
};
