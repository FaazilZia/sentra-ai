import { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { RiskPosture } from '@/components/risk/RiskPosture';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { ActiveRiskEvents } from '@/components/risk/ActiveRiskEvents';
import { RiskExposurePanel } from '@/components/risk/RiskExposurePanel';
import { RiskOwnership } from '@/components/risk/RiskOwnership';
import { fetchRiskData, fetchViolations, fetchAIAgents, fetchScans } from '@/lib/api';
import { ShieldCheck, Radar, AlertTriangle } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
};

export default function RiskCenterPage() {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [scans, setScans] = useState<number>(0);

  const loadAllData = async () => {
    try {
      const [risk, v, a, s] = await Promise.all([
        fetchRiskData(),
        fetchViolations(),
        fetchAIAgents(),
        fetchScans()
      ]);
      setRiskData(risk);
      setViolations(v);
      setAgents(a);
      setScans(s.count || 0);
    } catch (e) {
      console.error('Failed to load risk data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculating Exposure...</p>
        </div>
      </div>
    );
  }

  // Compute Risk Level
  const highViolations = violations.filter(v => v.severity >= 80).length;
  const riskLevel = highViolations > 5 ? 'CRITICAL' : (highViolations > 0 ? 'HIGH' : 'LOW');

  return (
    <div className="flex h-full flex-col font-sans selection:bg-rose-500/30 bg-[#0a0f1a] p-8">
      
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <AlertTriangle className={cn("h-6 w-6", riskLevel === 'LOW' ? "text-emerald-500" : "text-rose-500")} />
             <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Risk Assessment</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">
            Autonomous threat evaluation — refreshed every 30 seconds
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#0d1424] border border-[#1e293b] rounded-xl px-6 py-3">
           <div className="text-center border-r border-white/5 pr-6">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Level</p>
              <p className={cn("text-xs font-black uppercase tracking-tighter", riskLevel === 'LOW' ? "text-emerald-400" : "text-rose-500")}>{riskLevel}</p>
           </div>
           <div className="text-center pl-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Scans (24h)</p>
              <p className="text-xs font-mono font-black text-white">{scans}</p>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-10 border-b border-white/5 pb-0 flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        <button className="text-cyan-400 border-b-2 border-cyan-400 pb-4">Overview</button>
        <button className="hover:text-slate-300 transition-colors pb-4">By Model</button>
        <button className="hover:text-slate-300 transition-colors pb-4">By Framework</button>
        <button className="hover:text-slate-300 transition-colors pb-4">Trend</button>
        <button className="hover:text-slate-300 transition-colors pb-4">Ownership</button>
      </div>

      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-12 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <RiskPosture riskData={riskData} violations={violations} scans={scans} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <RiskHeatmap riskData={riskData} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <ActiveRiskEvents violations={violations} />
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RiskExposurePanel riskData={riskData} />
          <RiskOwnership agents={agents} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
