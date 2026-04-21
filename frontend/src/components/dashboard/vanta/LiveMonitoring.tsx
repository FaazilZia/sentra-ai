import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const liveViolations = [
  {
    framework: 'HIPAA',
    article: 'Rule 164.312 (Access Control)',
    description: 'PHI accessed without proper encryption context in 5 prompts.',
    status: 'critical',
    violationCount: 5
  },
  {
    framework: 'GDPR',
    article: 'Article 32 (Security of Processing)',
    description: 'Data minimization failure on EU citizen record summarization.',
    status: 'warning',
    violationCount: 1
  },
  {
    framework: 'DPDP',
    article: 'Section 8 (Data Minimization)',
    description: 'No active violations detected in current workflow stream.',
    status: 'passing',
    violationCount: 0
  }
];

export function LiveMonitoring() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-white">Live Rule Monitoring</h3>
          <span className="relative flex h-2 w-2 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <p className="text-xs text-slate-300 font-medium">Tracking active checklist violations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liveViolations.map((v, idx) => (
          <motion.div 
            key={v.framework}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 transition hover:bg-white/[0.02]",
              v.status === 'critical' ? "border-rose-500/20 bg-rose-500/5" :
              v.status === 'warning' ? "border-amber-500/20 bg-amber-500/5" :
              "border-emerald-500/20 bg-emerald-500/5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-xs font-black uppercase tracking-widest",
                v.status === 'critical' ? "text-rose-400" :
                v.status === 'warning' ? "text-amber-400" :
                "text-emerald-400"
              )}>
                {v.framework}
              </span>
              {v.violationCount > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                  <ShieldAlert className="h-3 w-3" />
                  {v.violationCount} Violations
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Clean
                </span>
              )}
            </div>
            
            <div className="mt-1">
              <h4 className="text-sm font-semibold text-white">{v.article}</h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">{v.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
