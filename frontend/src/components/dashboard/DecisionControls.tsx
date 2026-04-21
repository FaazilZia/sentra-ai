import React from 'react';
import { Play, Layers } from 'lucide-react';

interface DecisionControlsProps {
  onExecute: () => void;
  onReview: () => void;
  onDefer: () => void;
}

export const DecisionControls: React.FC<DecisionControlsProps> = ({ 
  onExecute, 
  onReview, 
  onDefer 
}) => {
  return (
    <div className="flex items-center gap-3 w-full">
      <button 
        onClick={onExecute}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-xl group"
      >
        <Play className="h-3 w-3 fill-current group-hover:scale-110 transition-transform" />
        Execute
      </button>
      <button 
        onClick={onReview}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
      >
        <Layers className="h-3 w-3" />
        Review Options
      </button>
      <button 
        onClick={onDefer}
        className="px-6 py-4 rounded-xl bg-transparent border border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:border-white/20 hover:text-slate-300 transition-all"
      >
        Defer
      </button>
    </div>
  );
};
