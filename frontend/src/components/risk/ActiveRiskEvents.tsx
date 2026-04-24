import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface ActiveRiskEventsProps {
  violations: any[];
}

function EventBadge({ text, type }: { text: string; type: string }) {
  const styles: Record<string, string> = {
    'high': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'medium': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    'low': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'framework': 'border-white/10 bg-white/5 text-slate-400',
    'category': 'border-white/10 bg-white/5 text-slate-400',
    'action': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black tracking-widest uppercase",
      styles[type] || 'border-white/10 bg-white/5 text-slate-500'
    )}>
      {text}
    </span>
  );
}

export function ActiveRiskEvents({ violations }: ActiveRiskEventsProps) {
  const criticalCount = violations.filter(v => v.severity >= 80).length;
  const mediumCount = violations.filter(v => v.severity >= 40 && v.severity < 80).length;
  const lowCount = violations.filter(v => v.severity < 40).length;

  return (
    <div className="space-y-6">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        Active Security Events — Governance Intervention
      </h2>
      
      <div className="flex flex-col rounded-2xl border border-[#1e293b] bg-[#0d1424] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="text-rose-500">{criticalCount} critical</span> <span className="mx-2 text-slate-700">|</span> 
            <span className="text-amber-500">{mediumCount} medium</span> <span className="mx-2 text-slate-700">|</span> 
            <span className="text-emerald-500">{lowCount} low</span>
          </div>
          {criticalCount > 0 && (
            <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-rose-400 animate-pulse">
              Requires Response
            </span>
          )}
        </div>

        {/* List */}
        <div className="flex flex-col divide-y divide-white/5">
          {violations.length === 0 ? (
            <div className="p-12 text-center">
               <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No active violations detected</p>
            </div>
          ) : (
            violations.slice(0, 5).map((v, idx) => {
              const severity = v.severity >= 80 ? 'high' : (v.severity >= 40 ? 'medium' : 'low');
              return (
                <motion.div 
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="p-6 transition hover:bg-white/[0.02] cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex gap-4">
                      <div className={cn(
                        "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                        severity === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      )} />
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{v.action} — Policy Breach</h4>
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-5xl">
                          {v.details}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <EventBadge text={severity} type={severity} />
                          {v.metadata?.framework && <EventBadge text={v.metadata.framework} type="framework" />}
                          {v.metadata?.compliance?.map((c: string) => <EventBadge key={c} text={c} type="framework" />)}
                          <EventBadge text="Neutralize Policy" type="action" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">ID: {v.id.slice(0,8)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
