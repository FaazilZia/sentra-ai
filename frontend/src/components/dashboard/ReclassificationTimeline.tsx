import React from 'react';
import { History } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimelineEntry {
  time: string;
  state: string;
  risk: 'low' | 'medium' | 'high';
}

interface ReclassificationTimelineProps {
  entries: TimelineEntry[];
}

export const ReclassificationTimeline: React.FC<ReclassificationTimelineProps> = ({ entries }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-3 w-3 text-slate-500" />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Decision Evolution</span>
      </div>
      <div className="space-y-4 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
        {entries.map((entry, idx) => (
          <div key={idx} className="relative pl-6 space-y-1">
            <div className={cn(
              "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950",
              entry.risk === 'high' ? "bg-rose-500" : entry.risk === 'medium' ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-white uppercase tracking-tight">{entry.state}</span>
              <span className="text-[9px] font-black text-slate-600 uppercase tabular-nums">{entry.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
