import React from 'react';
import { Clock } from 'lucide-react';

interface AutoResponseTimerProps {
  minutes: number;
}

export const AutoResponseTimer: React.FC<AutoResponseTimerProps> = ({ minutes }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full">
      <Clock className="h-3 w-3 text-rose-500 animate-pulse" />
      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none">
        Auto-response: Scheduled in {minutes} minutes unless overridden
      </span>
    </div>
  );
};
