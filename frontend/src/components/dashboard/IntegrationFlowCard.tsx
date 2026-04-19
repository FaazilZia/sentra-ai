import React from 'react';
import { Network, Server, ShieldCheck } from 'lucide-react';

export const IntegrationFlowCard: React.FC = () => {
  return (
    <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden group">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
        <Network className="w-4 h-4 text-indigo-400" />
        Infrastructure Flow
      </h3>

      <div className="flex items-center justify-between gap-2 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 border border-white/5">
            <Server className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-slate-500">LLM Node</span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="h-[2px] w-full bg-gradient-to-r from-slate-800 via-indigo-500/40 to-slate-800 relative">
            <div className="absolute top-1/2 left-0 w-2 h-2 bg-indigo-400 rounded-full -translate-y-1/2 animate-[ping_2s_infinite]" />
          </div>
          <span className="text-[8px] font-bold text-indigo-400/60 uppercase tracking-tighter">SDK Intercept</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 glow-indigo">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-indigo-400">Sentra Core</span>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
          Runtime protection active. Every agent intent is verified against the global compliance baseline before reaching your data layer.
        </p>
      </div>
    </div>
  );
};
