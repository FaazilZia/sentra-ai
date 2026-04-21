import React from 'react';
import { History } from 'lucide-react';

interface PatternMemoryProps {
  count: number;
  timeframe: string;
}

export const PatternMemory: React.FC<PatternMemoryProps> = ({ count, timeframe }) => {
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/5 rounded-md">
      <History className="h-3 w-3 text-slate-500" />
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
        Recurring: {count} violations in last {timeframe}
      </span>
    </div>
  );
};
