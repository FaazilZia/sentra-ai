import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Task {
  id: string;
  priority: 'High' | 'Medium';
  framework: string;
  problem: string;
  action: string;
  deadline: string;
}

interface WeeklyFixQueueProps {
  tasks: Task[];
}

export const WeeklyFixQueue: React.FC<WeeklyFixQueueProps> = ({ tasks }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process Queue (Weekly Tasks)</h3>
        <span className="text-[9px] font-bold text-slate-700 uppercase">Prioritized by SLA risk</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-6 rounded-xl bg-slate-900/20 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                      task.priority === 'High' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5"
                    )}>
                      {task.priority} Priority
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{task.framework}</span>
                  </div>
                  <div className="flex items-center gap-1 text-rose-500">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tabular-nums">{task.deadline}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white leading-snug uppercase tracking-tight">{task.problem}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Action: {task.action}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                 <div className="flex flex-col gap-1">
                    <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">If Ignored:</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Score projected to drop 2.4% + SLA Risk</p>
                 </div>
                 <div className="flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Linked to Log #E-142</span>
                    <button className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-emerald-500 transition-colors">
                      Fix Now →
                    </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
