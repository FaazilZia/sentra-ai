import React from 'react';
import { Shield, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export const BeforeAfterPanel: React.FC = () => {
  return (
    <div className="glass-card rounded-[2rem] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Before / Vulnerable */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5 relative">
          <div className="absolute top-0 right-0 p-4">
             <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
               Unprotected
             </span>
          </div>
          
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Standard AI Runtime
          </h3>

          <div className="space-y-6">
            <div className="flex gap-4 items-start opacity-60">
              <div className="p-2 rounded-lg bg-slate-800">
                <Shield className="w-4 h-4 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">Data Sharing Intent</p>
                <p className="text-xs text-slate-400">Agent attempts to share sensitive medical data</p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="p-2 rounded-lg bg-rose-500/20">
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-400">Leak Occurred</p>
                <p className="text-xs text-rose-500/80">Action executed without verification. HIPAA violation logged after 24h.</p>
              </div>
            </div>
          </div>
        </div>

        {/* After / Sentra Protected */}
        <div className="p-8 bg-indigo-500/[0.02] relative">
          <div className="absolute top-0 right-0 p-4">
             <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
               Sentra Active
             </span>
          </div>

          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Sentra AI Governance
          </h3>

          <div className="space-y-6">
             <div className="flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">Real-time Interception</p>
                <p className="text-xs text-slate-400">Sentra SDK intercepts intent before execution</p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 glow-green">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-400">Threat Neutralized</p>
                <p className="text-xs text-emerald-500/80">Action blocked automatically based on HIPAA Policy. Business risk avoided.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
