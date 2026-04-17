import React from 'react';
import { Settings, CheckCircle2, XCircle } from 'lucide-react';

interface Rule {
  id: string;
  agent: string;
  action: string;
  enabled: boolean;
}

interface PolicyPanelProps {
  rules: Rule[];
  onToggle: (id: string) => void;
}

export const PolicyPanel: React.FC<PolicyPanelProps> = ({ rules, onToggle }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Active Policy Guard</h2>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div 
            key={rule.id} 
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">{rule.agent}</span>
              <span className="text-[10px] text-slate-500 font-mono">{rule.action}</span>
            </div>
            
            <button
              onClick={() => onToggle(rule.id)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                rule.enabled ? 'bg-green-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  rule.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Real-time enforcement active
        </div>
      </div>
    </div>
  );
};
