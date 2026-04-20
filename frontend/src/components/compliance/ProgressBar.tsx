import { Zap } from 'lucide-react';
import { AnimatedCounter } from '../ui/AnimatedCounter';

interface ProgressBarProps {
  progress: number;
  completedCount: string;
  status: string;
}

export function ProgressBar({ progress, completedCount, status }: ProgressBarProps) {
  return (
    <div className="glass-card rounded-3xl p-8 bg-slate-900/60 border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Readiness Progress</p>
          <h3 className="text-3xl font-black text-white"><AnimatedCounter value={progress} />%</h3>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tasks Resolved</p>
          <p className="text-xl font-black text-white">{completedCount}</p>
        </div>
      </div>

      <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-0 left-0 h-full w-full opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]"
          style={{ backgroundSize: '40px 40px' }}
        />
      </div>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Readiness Status</p>
          <p className="text-sm font-bold text-white uppercase tracking-tight">{status}</p>
        </div>
      </div>
    </div>
  );
}
