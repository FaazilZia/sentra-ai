import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, Activity, Lock } from 'lucide-react';

interface RiskPostureProps {
  riskData: any;
  violations: any[];
  scans: number;
}

export function RiskPosture({ riskData, violations, scans }: RiskPostureProps) {
  const criticalCount = violations.filter(v => v.severity >= 80).length;
  const blockedToday = violations.filter(v => v.status === 'BLOCKED').length;
  const riskScore = riskData?.overall_score || 0;
  
  const isCritical = criticalCount > 0 || riskScore > 70;
  const scoreColor = riskScore === 0 ? "text-slate-500" : (isCritical ? "text-rose-500" : "text-emerald-400");
  const scoreLevel = riskScore === 0 ? "STABLE" : (riskScore > 70 ? "CRITICAL" : (riskScore > 40 ? "ELEVATED" : "OPTIMAL"));

  return (
    <div className="space-y-6">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        Risk Posture — Real-time Evaluation
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Overall Risk Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0d1424] p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <AlertTriangle className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overall Exposure</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className={cn("text-4xl font-black tracking-tighter", scoreColor)}>{scoreLevel}</h3>
            <span className="text-xs font-bold text-slate-600">/ 100</span>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000 rounded-full", isCritical ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]")} 
                style={{ width: `${riskScore}%` }} 
              />
            </div>
            <span className="text-[10px] font-mono font-black text-slate-400">{riskScore}%</span>
          </div>
        </motion.div>

        {/* Critical Violations Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0d1424] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critical Events</p>
            <ShieldAlert className={cn("h-4 w-4", criticalCount > 0 ? "text-rose-500" : "text-slate-600")} />
          </div>
          <div className="mt-2">
            <h3 className={cn("text-4xl font-black tracking-tighter", criticalCount > 0 ? "text-rose-500" : "text-slate-500")}>
              {criticalCount}
            </h3>
          </div>
          <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {criticalCount > 0 ? "NEEDS IMMEDIATE AUDIT" : "NO ACTIVE THREATS"}
          </p>
        </motion.div>

        {/* Live Scans Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0d1424] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Evaluated Interactions</p>
            <Activity className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-4xl font-black text-white tracking-tighter">
              {scans.toLocaleString()}
            </h3>
          </div>
          <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            LAST 24 HOURS
          </p>
        </motion.div>

        {/* Prevented Threats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0d1424] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Threats Prevented</p>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className={cn("text-4xl font-black tracking-tighter", blockedToday > 0 ? "text-emerald-400" : "text-slate-500")}>
              {blockedToday}
            </h3>
          </div>
          <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            AUTO-MITIGATED TODAY
          </p>
        </motion.div>

      </div>
    </div>
  );
}
