import React from 'react';
import { Sparkles, Shield, Target, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnhancedInsight {
  insight: string;
  confidence: string;
  sources: string[];
  impact_if_ignored: string[];
  expected_outcome: {
    score_change: string;
    risk_reduction: string;
  };
  priority: string;
  recommended_time: string;
  action_label: string;
}

interface AIInsightEnhancedProps {
  data: EnhancedInsight;
  onAction: () => void;
}

export const AIInsightEnhanced: React.FC<AIInsightEnhancedProps> = ({ data, onAction }) => {
  return (
    <div className="relative overflow-hidden rounded-[3rem] bg-slate-900/40 border border-white/5 p-12 transition-all hover:border-white/10">
      <div className="relative z-10 flex flex-col lg:flex-row gap-16">
        {/* Left Side: Insight Core */}
        <div className="flex-1 space-y-12">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Sentra AI Governance Insight</span>
            <span className={cn(
              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
              data.confidence === 'High' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            )}>
              {data.confidence} Confidence
            </span>
          </div>

          <h2 className="text-4xl font-black text-white tracking-tighter leading-[1.1] max-w-2xl">
            {data.insight}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
             <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Priority</p>
                <p className={cn(
                  "text-sm font-black uppercase",
                  data.priority === 'High' ? "text-rose-500" : "text-amber-500"
                )}>{data.priority}</p>
             </div>
             <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recommended Time</p>
                <p className="text-sm font-black text-white uppercase">{data.recommended_time}</p>
             </div>
             <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sources</p>
                <div className="flex gap-2">
                   {data.sources.slice(0, 2).map((s, i) => (
                     <span key={i} className="text-[10px] text-slate-400 font-bold uppercase">{s}</span>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Impact & Outcome */}
        <div className="lg:w-[400px] space-y-12">
          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Shield className="h-3 w-3" /> Potential Impact
              </h4>
              <ul className="space-y-3">
                {data.impact_if_ignored.map((impact, i) => (
                  <li key={i} className="flex gap-3 text-xs text-slate-400 font-medium">
                    <span className="text-rose-500 mt-1">•</span>
                    {impact}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
               <div className="space-y-2">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Target className="h-3 w-3" /> Score Shift
                 </p>
                 <p className="text-lg font-black text-emerald-500 tracking-tight">{data.expected_outcome.score_change}</p>
               </div>
               <div className="space-y-2">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Zap className="h-3 w-3" /> Risk Reduction
                 </p>
                 <p className="text-lg font-black text-white tracking-tight uppercase">{data.expected_outcome.risk_reduction}</p>
               </div>
            </div>

            <button 
              onClick={onAction}
              className="w-full py-5 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
            >
              {data.action_label}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] pointer-events-none" />
    </div>
  );
};
