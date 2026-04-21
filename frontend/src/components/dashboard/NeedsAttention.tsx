import React from 'react';
import { cn } from '@/lib/utils';
import { DecisionControls } from './DecisionControls';
import { AutoResponseTimer } from './AutoResponseTimer';
import { ImpactProjection } from './ImpactProjection';
import { UnresolvedStateBadge, UnresolvedState } from './UnresolvedStateBadge';
import { StabilityIndicator } from './StabilityIndicator';
import { DisagreementIndicator } from './DisagreementIndicator';
import { SystemRecommendation } from './SystemRecommendation';
import { ConfidenceRecoveryNode } from './ConfidenceRecoveryNode';
import { DelayedImpactNotice } from './DelayedImpactNotice';

export interface Issue {
  label: string;
  type: 'critical' | 'warning';
  severity?: 'Warning' | 'Needs Attention' | 'High Risk' | 'Breach Risk';
  startTime?: number;
  origin?: string;
  id?: string;
  recurrence?: {
    count: number;
    timeframe: string;
  };
  unresolvedState?: UnresolvedState;
  engines?: {
    policy: { result: string; confidence: 'low' | 'medium' | 'high' };
    behavior: { result: string; confidence: 'low' | 'medium' | 'high' };
    anomaly: { result: string; confidence: 'low' | 'medium' | 'high' };
  };
  delayedFrom?: string;
  stabilityStatus?: string;
  recommendationBias?: { bias: string; reason: string };
  recoverySteps?: string[];
  recommendedAction: string;
  recommendationConfidence: 'High' | 'Medium' | 'Low';
  expectedImpact: {
    riskChange: string;
    confidenceRecovery: string;
    stabilityImprovement: string;
  };
  autoResponseMinutes?: number;
  executedBy?: 'System' | 'User';
}

interface NeedsAttentionProps {
  issues: Issue[];
  onExecute: (id: string) => void;
  onReview: (id: string) => void;
  onDefer: (id: string) => void;
  onAction?: () => void;
}

export const NeedsAttention: React.FC<NeedsAttentionProps> = ({ 
  issues, 
  onExecute, 
  onReview, 
  onDefer 
}) => {
  if (issues.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/10 border border-white/5 rounded-2xl p-6 mb-10 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Autonomous Decision Layer</h2>
        </div>
        <span className="text-[9px] font-bold text-slate-700 uppercase">System-driven governance active</span>
      </div>

      <div className="space-y-16">
        {issues.map((issue: Issue, idx: number) => (
          <div key={idx} className="group relative bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.02] transition-all space-y-10">
            {/* 1. STATE & STABILITY */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
              <div className="space-y-5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded border",
                    issue.severity === 'Breach Risk' ? "text-rose-600 border-rose-600/30 bg-rose-600/5" :
                    issue.severity === 'High Risk' ? "text-amber-500 border-amber-500/30 bg-amber-500/5" :
                    "text-slate-400 border-slate-500/30 bg-slate-500/5"
                  )}>
                    {issue.severity || 'System Observation'}
                  </span>
                  {issue.unresolvedState && <UnresolvedStateBadge state={issue.unresolvedState} />}
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                    ID: {issue.id || `#A-${idx}`}
                  </span>
                  {issue.stabilityStatus && (
                    <StabilityIndicator status={issue.stabilityStatus} systemsAffected="Node Isolated" />
                  )}
                </div>
                
                <h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-none max-w-3xl">
                  {issue.label}
                </h4>

                <div className="flex items-center gap-4 text-[10px] font-medium text-slate-400 uppercase">
                  <span>Source: {issue.origin || 'Policy Engine'}</span>
                  <span>•</span>
                  <span>SLA Time Remaining: 4h 12m</span>
                  {issue.executedBy && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500/80">Action by: {issue.executedBy}</span>
                    </>
                  )}
                </div>
              </div>

              {issue.autoResponseMinutes && (
                <div className="shrink-0">
                  <AutoResponseTimer minutes={issue.autoResponseMinutes} />
                </div>
              )}
            </div>

            {/* 2. SYSTEM DISAGREEMENT & RECOMMENDATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t border-white/5">
              <div className="space-y-6">
                 {issue.engines && <DisagreementIndicator engines={issue.engines as any} />}
                 {issue.recommendationBias && (
                    <SystemRecommendation 
                      bias={issue.recommendationBias.bias} 
                      reason={issue.recommendationBias.reason} 
                    />
                 )}
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Action</p>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      {issue.recommendationConfidence} Confidence
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                    {issue.recommendedAction}
                  </h3>
                </div>

                <ImpactProjection 
                  riskChange={issue.expectedImpact.riskChange} 
                  confidenceRecovery={issue.expectedImpact.confidenceRecovery} 
                  stabilityImprovement={issue.expectedImpact.stabilityImprovement} 
                />

                <DecisionControls 
                  onExecute={() => onExecute(issue.id || '')}
                  onReview={() => onReview(issue.id || '')}
                  onDefer={() => onDefer(issue.id || '')}
                />
              </div>
            </div>

            {/* 3. RECOVERY & IMPACT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t border-white/5">
               {issue.recoverySteps && (
                 <ConfidenceRecoveryNode steps={issue.recoverySteps} />
               )}
               {issue.delayedFrom && (
                 <div className="space-y-4">
                    <DelayedImpactNotice delay="2h 14m" sourceEvent={issue.delayedFrom} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-snug px-4 italic">
                      "Impact confirmed as secondary propagation from {issue.delayedFrom}. System-driven mitigation active."
                    </p>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
