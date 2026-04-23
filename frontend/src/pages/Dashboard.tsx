import { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { useDashboardData } from '@/hooks/useDashboardData';
import { KPICards } from '@/components/dashboard/vanta/KPICards';
import { PromptVolumeChart } from '@/components/dashboard/vanta/PromptVolumeChart';
import { RiskByDepartment } from '@/components/dashboard/vanta/RiskByDepartment';
import { RecentHighRiskPrompts } from '@/components/dashboard/vanta/RecentHighRiskPrompts';
import { CriticalAlerts } from '@/components/dashboard/vanta/CriticalAlerts';
import { AIInsightsLayer } from '@/components/dashboard/vanta/AIInsightsLayer';
import { SystemObservability } from '@/components/dashboard/SystemObservability';
import { AuditSnapshot } from '@/components/executive/AuditSnapshot';
import { SystemModeIndicator } from '@/components/executive/SystemModeIndicator';
import { fetchExecutiveOverview, ExecutiveOverview } from '@/lib/api';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
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

export default function DashboardPage() {
  const { data, loading } = useDashboardData();
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);

  useEffect(() => {
    fetchExecutiveOverview().then(setOverview).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400 font-medium tracking-widest uppercase text-[10px]">Initializing Security Intel...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  
  return (
    <div className="flex h-full flex-col font-sans selection:bg-cyan-500/30 bg-[#0a0f1a]">
      <CriticalAlerts alerts={data.alerts} />
      
      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Executive Visibility Layer */}
        {!overview ? (
          <div className="w-full h-32 bg-white/[0.02] border border-white/5 rounded-xl animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">Initializing Executive Visibility...</span>
          </div>
        ) : (
          <motion.div variants={itemVariants} className="flex flex-col gap-6 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Executive Visibility</h2>
              <SystemModeIndicator mode={overview.systemMode} />
            </div>
            <AuditSnapshot 
              scans={overview.auditSummary.scansLast24h}
              violations={overview.auditSummary.violationsDetected}
              budgetUsed={overview.auditSummary.budgetUsed}
              budgetLimit={overview.auditSummary.budgetLimit}
              connectors={overview.auditSummary.activeConnectors}
              healthScore={overview.auditSummary.healthScore}
            />
          </motion.div>
        )}
        
        {/* Top Priority: AI Insights Banners */}
        <motion.div variants={itemVariants}>
          <AIInsightsLayer insights={data.insights} />
        </motion.div>

        {/* CISO KPI Cards */}
        <motion.div variants={itemVariants}>
          <KPICards data={data.kpis} />
        </motion.div>

        {/* PRIMARY FOCUS: Active Security Violations Table */}
        <motion.div variants={itemVariants}>
          <RecentHighRiskPrompts data={data.violations} />
        </motion.div>

        {/* MERGED: System Observability */}
        <motion.div variants={itemVariants}>
          <SystemObservability />
        </motion.div>

        {/* Secondary Analytics Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Prompt Trend & Department Risk */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <PromptVolumeChart data={data.chartData} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1">
            <RiskByDepartment data={data.departments} />
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}
