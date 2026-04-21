import React from 'react';
import { Timer } from 'lucide-react';

interface DelayedImpactNoticeProps {
  delay: string;
  sourceEvent: string;
}

export const DelayedImpactNotice: React.FC<DelayedImpactNoticeProps> = ({ delay, sourceEvent }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
      <Timer className="h-4 w-4 text-rose-500 mt-0.5" />
      <div className="space-y-1">
        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Delayed Consequence Detected</p>
        <p className="text-[11px] font-bold text-slate-100 uppercase leading-snug">
          Lagged impact from prior override on {sourceEvent} ({delay} delay observed)
        </p>
      </div>
    </div>
  );
};
