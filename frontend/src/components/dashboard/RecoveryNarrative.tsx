import React from 'react';
import { BookOpen } from 'lucide-react';

interface RecoveryNarrativeProps {
  narrative: string;
}

export const RecoveryNarrative: React.FC<RecoveryNarrativeProps> = ({ narrative }) => {
  return (
    <div className="mt-4 pt-4 border-t border-emerald-500/10 space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen className="h-3 w-3 text-emerald-500/60" />
        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Recovery Narrative</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
        "{narrative}"
      </p>
    </div>
  );
};
