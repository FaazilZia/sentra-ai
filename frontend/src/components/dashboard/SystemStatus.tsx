import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SystemStatusProps {
  compliance: 'nominal' | 'elevated' | 'critical';
  risk: 'low' | 'medium' | 'high';
  guardrails: 'active' | 'bypassed' | 'learning' | 'constrained';
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ compliance, risk, guardrails }) => {
  return (
    <div className="space-y-6">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operational Status</p>
      
      <div className="space-y-4">
        {/* Compliance State */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
            {compliance === 'critical' ? (
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            ) : compliance === 'elevated' ? (
              <Shield className="h-4 w-4 text-amber-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Compliance</span>
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            compliance === 'critical' ? "text-rose-500" : compliance === 'elevated' ? "text-amber-500" : "text-emerald-500"
          )}>
            {compliance}
          </span>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              risk === 'high' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : risk === 'medium' ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Risk Level</span>
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest text-white"
          )}>
            {risk}
          </span>
        </div>

        {/* Guardrail Mode */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"
            )} />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Guardrails</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            {guardrails}
          </span>
        </div>
      </div>
    </div>
  );
};
