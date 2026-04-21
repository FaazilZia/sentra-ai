import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Issue {
  label: string;
  type: 'critical' | 'warning';
}

interface NeedsAttentionProps {
  issues: Issue[];
  onAction: () => void;
}

export const NeedsAttention: React.FC<NeedsAttentionProps> = ({ issues, onAction }) => {
  if (issues.length === 0) return null;

  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] bg-rose-500/[0.03] border border-rose-500/10 p-8 transition-all hover:bg-rose-500/[0.05] hover:border-rose-500/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="flex -space-x-3">
            {issues.map((issue, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-xl",
                  issue.type === 'critical' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                )}
              >
                {issue.type === 'critical' ? <AlertTriangle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">System Alert: Governance Gaps Detected</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {issues.map((issue, idx) => (
                <span key={idx} className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  issue.type === 'critical' ? "text-rose-500" : "text-amber-500"
                )}>
                  • {issue.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <button 
          onClick={onAction}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-2xl"
        >
          Resolve Issues
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-rose-500/10 blur-[100px] pointer-events-none" />
    </div>
  );
};
