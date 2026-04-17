import React from 'react';
import { Zap, Shield, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface TimelineStep {
  step: string;
  status: 'complete' | 'pending' | 'failed';
  icon: 'zap' | 'shield' | 'alert' | 'check' | 'x';
  description: string;
}

interface ActionTimelineProps {
  steps: TimelineStep[];
  timestamp: string;
}

const IconMap: Record<string, any> = {
  zap: Zap,
  shield: Shield,
  alert: AlertTriangle,
  check: CheckCircle2,
  x: XCircle
};

export const ActionTimeline: React.FC<ActionTimelineProps> = ({ steps, timestamp }) => {
  return (
    <div className="py-4 px-6 bg-slate-50/50 rounded-xl border border-slate-100 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Governance Interception Timeline
        </h4>
        <span className="text-[10px] font-mono text-slate-400">{timestamp}</span>
      </div>

      <div className="space-y-0 relative">
        {/* Connector Line */}
        <div className="absolute left-[15px] top-2 bottom-6 w-[2px] bg-slate-200" />

        {steps.map((step, idx) => {
          const Icon = IconMap[step.icon] || Zap;
          const isLast = idx === steps.length - 1;

          return (
            <div key={idx} className={`relative flex items-start gap-4 pb-6 ${isLast ? 'pb-0' : ''}`}>
              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${
                step.status === 'complete' ? 'border-indigo-500 text-indigo-500' : 'border-slate-200 text-slate-300'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="pt-0.5">
                <p className="text-[11px] font-bold text-slate-900 leading-none mb-1">{step.step}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
