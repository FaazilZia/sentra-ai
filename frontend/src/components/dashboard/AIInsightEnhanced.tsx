import React from 'react';
import { Sparkles, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceContext } from './ConfidenceContext';

export interface EnhancedInsight {
  insight: string;
  confidence: 'High' | 'Medium' | 'Low';
  sources: string[];
  impact_if_ignored: string[];
  expected_outcome: {
    score_change: string;
    risk_reduction: string;
  };
  priority: string;
  recommended_time: string;
  action_label: string;
  limitation?: string;
  false_positive_risk?: 'Low' | 'Medium' | 'High';
}

interface AIInsightEnhancedProps {
  data: EnhancedInsight;
  onAction: () => void;
}

export const AIInsightEnhanced: React.FC<AIInsightEnhancedProps> = ({ data, onAction }) => {
  return (
    <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.01] border border-white/10 p-10 transition-all hover:bg-white/[0.02] pr-16">
      <div className="flex flex-col md:flex-row gap-12">
        <div className="flex-1 space-y-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">System Guidance Node</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ml-auto",
              data.confidence === 'High' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            )}>
              <Sparkles className="h-3 w-3 inline mr-1" /> {data.confidence} Confidence
            </span>
          </div>
          
          <div className="space-y-4">
            <p className="text-3xl font-black text-white leading-[1.1] tracking-tight uppercase max-w-2xl">
              {data.insight}
            </p>
            <div className="flex flex-wrap gap-3">
              {data.sources.map(source => (
                <span key={source} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 text-slate-400 rounded-lg border border-white/5">
                  Origin: {source}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">If Ignored (Predictive):</p>
              <ul className="space-y-3">
                {data.impact_if_ignored.map((impact, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-bold text-slate-400 uppercase leading-snug">
                    <div className="h-1 w-1 rounded-full bg-rose-500 mt-1.5" />
                    {impact}
                  </li>
                ))}
                <li className="flex items-start gap-3 text-xs font-black text-rose-600 uppercase leading-snug">
                   Score projection: {data.expected_outcome.score_change.split('→')[0]} → {data.expected_outcome.score_change.split('→')[1]} (Drop)
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Expected Outcome (If Fixed):</p>
              <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 space-y-3">
                <p className="text-xs font-bold text-emerald-500 uppercase">
                  Compliance: {data.expected_outcome.score_change}
                </p>
                <p className="text-xs font-bold text-emerald-500 uppercase">
                  Risk: {data.expected_outcome.risk_reduction}
                </p>
                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-2">
                  Fix affects: GLOBAL COMPLIANCE STATUS
                </p>
              </div>
            </div>
          </div>

          {data.limitation && (
            <ConfidenceContext 
              confidence={data.confidence}
              limitation={data.limitation}
              falsePositiveRisk={data.false_positive_risk || 'Low'}
            />
          )}
        </div>

        <div className="md:w-64 flex flex-col justify-between items-end border-l border-white/5 pl-10">
          <div className="text-right space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Urgency Level</p>
            <p className="text-lg font-black text-white uppercase tracking-tighter">{data.priority}</p>
            <div className="flex items-center gap-2 justify-end text-rose-500 font-black text-[10px] uppercase">
              <Clock className="h-3 w-3" />
              {data.recommended_time}
            </div>
          </div>

          <button 
            onClick={onAction}
            className="w-full flex items-center justify-between gap-4 px-8 py-5 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-2xl"
          >
            {data.action_label || 'Execute Fix'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
