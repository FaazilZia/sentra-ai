import React from 'react';
import { GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EngineResult {
  result: string;
  confidence: 'low' | 'medium' | 'high';
}

interface DisagreementIndicatorProps {
  engines: {
    policy: EngineResult;
    behavior: EngineResult;
    anomaly: EngineResult;
  };
}

export const DisagreementIndicator: React.FC<DisagreementIndicatorProps> = ({ engines }) => {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-amber-500" />
        <h4 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Signal Correlation Analysis</h4>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Policy Engine</p>
          <div className="flex flex-col gap-1">
            <p className={cn("text-[10px] font-bold uppercase", engines.policy.result === 'fail' ? "text-rose-500" : "text-emerald-500")}>{engines.policy.result}</p>
            <span className="text-[8px] font-black text-slate-600 uppercase">Conf: {engines.policy.confidence}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Behavioral Engine</p>
          <div className="flex flex-col gap-1">
            <p className={cn("text-[10px] font-bold uppercase", engines.behavior.result === 'anomaly' ? "text-amber-500" : "text-emerald-500")}>{engines.behavior.result}</p>
            <span className="text-[8px] font-black text-slate-600 uppercase">Conf: {engines.behavior.confidence}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Anomaly Engine</p>
          <div className="flex flex-col gap-1">
            <p className={cn("text-[10px] font-bold uppercase", engines.anomaly.result === 'suspicious' ? "text-amber-500" : "text-emerald-500")}>{engines.anomaly.result}</p>
            <span className="text-[8px] font-black text-slate-600 uppercase">Conf: {engines.anomaly.confidence}</span>
          </div>
        </div>
      </div>
      <p className="text-[9px] font-medium text-slate-300 uppercase italic">
        "Signal correlation required. Conflicting behavioral patterns observed."
      </p>
    </div>
  );
};
