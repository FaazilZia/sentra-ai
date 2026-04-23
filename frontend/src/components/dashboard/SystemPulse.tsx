import { AlertCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SystemPulseProps {
  status: 'stable' | 'at-risk' | 'degrading';
  issueCount: number;
  lastIncident: string;
  trend: {
    value: number;
    isImproving: boolean;
  };
}

export const SystemPulse: React.FC<SystemPulseProps> = ({ status, issueCount, lastIncident, trend }) => {
  return (
    <div className="w-full bg-slate-900/40 border-b border-white/5 py-3 px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-2 w-2 rounded-full",
            status === 'stable' ? "bg-emerald-500" : status === 'at-risk' ? "bg-amber-500" : "bg-rose-500"
          )} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            System: <span className={cn(
              status === 'stable' ? "text-emerald-500" : status === 'at-risk' ? "text-amber-500" : "text-rose-500"
            )}>{status}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 border-l border-white/5 pl-8">
          <AlertCircle className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Active Issues: <span className="text-white">{issueCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 border-l border-white/5 pl-8">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Last Incident: <span className="text-white">{lastIncident}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {trend.isImproving ? (
          <TrendingUp className="h-3 w-3 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-rose-500" />
        )}
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          trend.isImproving ? "text-emerald-500" : "text-rose-500"
        )}>
          {trend.isImproving ? '+' : '-'}{trend.value}% Trend
        </span>
      </div>
    </div>
  );
};
