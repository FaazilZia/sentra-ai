import React from 'react';
import { cn } from '@/lib/utils';
import { ReclassificationTimeline } from './ReclassificationTimeline';

export interface LogEntry {
  id: string;
  type: 'blocked' | 'warning' | 'processed' | 'ongoing';
  message: string;
  time: string;
  regulatoryContext?: string;
  status?: 'Completed' | 'Pending' | 'Ongoing' | 'Overridden' | 'Reclassified' | 'Monitoring';
  owner?: string;
  linkedTo?: string; // e.g. "Alert #242"
  override?: boolean;
  impact?: string;
  delayedImpact?: boolean;
  history?: Array<{
    time: string;
    state: string;
    risk: 'low' | 'medium' | 'high';
  }>;
}

interface OperationalLogProps {
  entries: LogEntry[];
}

export const OperationalLog: React.FC<OperationalLogProps> = ({ entries }) => {
  return (
    <div className="h-full flex flex-col bg-slate-950/50 border-l border-white/5 p-6 space-y-10 overflow-hidden pr-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">System Activity Heartbeat</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Monitoring Active</span>
        </div>
      </div>

      {/* ASYMMETRICAL LOG FEED */}
      <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
        {entries.map((entry, idx) => (
          <div 
            key={entry.id} 
            className={cn(
              "relative pl-6 border-l border-white/5 space-y-4 py-1 group transition-all",
              idx % 3 === 0 ? "mt-16" : "mt-4" // Visual Asymmetry: Bursty spacing
            )}
          >
            <div className={cn(
              "absolute -left-[4.5px] top-2 h-2 w-2 rounded-full",
              entry.delayedImpact ? "bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.6)] animate-pulse" :
              entry.override ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
              entry.type === 'processed' ? 'bg-emerald-500' : 
              entry.type === 'blocked' ? 'bg-rose-500' : 
              entry.type === 'warning' ? 'bg-amber-500' : 'bg-slate-700 animate-pulse'
            )} />
            
            <div className="flex items-center justify-between gap-4">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter tabular-nums">
                {entry.time}
              </p>
              {entry.linkedTo && (
                <span className="text-[8px] font-black text-slate-500 hover:text-slate-300 transition-colors cursor-help uppercase tracking-widest bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                  Linked to {entry.linkedTo}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              {entry.delayedImpact && (
                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">
                   ⚠️ Delayed impact from prior decision
                </p>
              )}
              <p className={cn(
                "text-[11px] font-bold leading-tight tracking-tight uppercase",
                entry.delayedImpact ? "text-rose-500" :
                entry.override ? "text-amber-500" :
                entry.type === 'blocked' ? "text-rose-500" : "text-slate-300"
              )}>
                {entry.override ? `OVERRIDE: ${entry.message}` : entry.message}
              </p>
            </div>

            {entry.impact && (
              <p className="text-[9px] font-black text-rose-500/80 uppercase tracking-widest italic">
                {entry.impact}
              </p>
            )}

            {entry.history && (
              <div className="pt-2">
                <ReclassificationTimeline entries={entry.history} />
              </div>
            )}

            <div className="flex items-center justify-between pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-3">
                 {entry.status && (
                   <span className={cn(
                     "text-[8px] font-black uppercase tracking-[0.1em]",
                     entry.status === 'Overridden' || entry.status === 'Reclassified' ? "text-amber-500" :
                     entry.status === 'Monitoring' ? "text-indigo-400" :
                     entry.status === 'Pending' ? "text-amber-500" : entry.status === 'Ongoing' ? "text-slate-500" : "text-emerald-500/60"
                   )}>
                     • {entry.status}
                   </span>
                 )}
                 {entry.regulatoryContext && (
                   <span className="text-[8px] font-bold text-slate-600 border-l border-white/10 pl-3 uppercase">
                     {entry.regulatoryContext}
                   </span>
                 )}
               </div>
               {entry.owner && (
                 <span className="text-[8px] font-bold text-slate-600 uppercase">
                   BY {entry.owner}
                 </span>
               )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-white/5 flex items-center justify-between opacity-40">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
          Origin: Local Proxy Node
        </p>
        <span className="text-[9px] font-bold text-slate-500 uppercase">v1.2.4-stable</span>
      </div>
    </div>
  );
};
