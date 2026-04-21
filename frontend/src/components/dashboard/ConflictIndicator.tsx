import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ConflictIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-3 py-3 px-6 bg-amber-500/5 border border-amber-500/10 rounded-xl">
      <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />
      <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">
        Conflicting Signals: System appears compliant, but instability patterns detected.
      </p>
    </div>
  );
};
