import React from 'react';
import { Activity, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitoringStatusProps {
  status: 'active' | 'warning' | 'critical';
  lastChecked: string;
  violations24h: number;
  stability: 'stable' | 'fluctuating' | 'degrading';
}

export const MonitoringStatus: React.FC<MonitoringStatusProps> = ({ 
  status, lastChecked, violations24h, stability 
}) => {
  return (
    <div className="p-8 rounded-[3rem] bg-slate-900/40 border border-white/5 space-y-8 transition-all hover:border-white/10">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 relative">
                <Activity className={cn(
                   "h-5 w-5",
                   status === 'critical' ? 'text-rose-500' : status === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                )} />
                <span className={cn(
                   "absolute top-0 right-0 h-2 w-2 rounded-full",
                   status === 'critical' ? 'bg-rose-500 animate-pulse' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                )} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Continuous Monitoring</p>
                <h4 className="text-xl font-black text-white tracking-tighter uppercase">
                   {status === 'active' ? 'System Healthy' : status === 'warning' ? 'Anomaly Detected' : 'Enforcement Breach'}
                </h4>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-slate-600" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Last Pulse</p>
             </div>
             <p className="text-lg font-black text-white tracking-tight uppercase">{lastChecked}</p>
          </div>
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-slate-600" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">24h Incidents</p>
             </div>
             <p className={cn(
                "text-lg font-black tracking-tight",
                violations24h > 0 ? 'text-rose-500' : 'text-slate-400'
             )}>{violations24h} Detected</p>
          </div>
       </div>

       <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Stability</span>
             <span className={cn(
                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                stability === 'stable' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
             )}>{stability}</span>
          </div>
          <div className="flex -space-x-1">
             {[...Array(5)].map((_, i) => (
                <div key={i} className={cn(
                   "h-3 w-1 rounded-full",
                   i < 4 ? 'bg-emerald-500/50' : 'bg-slate-800'
                )} />
             ))}
          </div>
       </div>
    </div>
  );
};
