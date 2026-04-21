import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ConfidenceRecoveryNodeProps {
  steps: string[];
}

export const ConfidenceRecoveryNode: React.FC<ConfidenceRecoveryNodeProps> = ({ steps }) => {
  return (
    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-emerald-500">
        <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
        <h4 className="text-[9px] font-black uppercase tracking-widest leading-none">Confidence Recovery Path</h4>
      </div>
      <ul className="space-y-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
