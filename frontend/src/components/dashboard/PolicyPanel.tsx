import React from 'react';
import { FileSignature, ToggleLeft as Toggle, ToggleRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PolicyRule {
  id: string;
  agent: string;
  action: string;
  enabled: boolean;
}

interface PolicyPanelProps {
  rules: PolicyRule[];
  onToggle: (id: string) => void;
}

export const PolicyPanel: React.FC<PolicyPanelProps> = ({ rules, onToggle }) => {
  return (
    <div className="glass-card rounded-[2rem] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            Governance Core
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Active Access Policies</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
        {rules.map((rule) => (
          <div 
            key={rule.id}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{rule.agent}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{rule.action}</p>
            </div>
            
            <button 
              onClick={() => onToggle(rule.id)}
              className={cn(
                "p-1 rounded-lg transition-all",
                rule.enabled ? "text-emerald-500" : "text-slate-600"
              )}
            >
              {rule.enabled ? <ToggleRight className="w-8 h-8" /> : <Toggle className="w-8 h-8 opacity-40" />}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between px-2">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Status</span>
           <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase">Enforced</span>
        </div>
      </div>
    </div>
  );
};
