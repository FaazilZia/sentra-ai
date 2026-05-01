import { useEffect, useState } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';
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
import { fetchExecutiveOverview, ExecutiveOverview, fetchGuardrailMetrics } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

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
  const { data, loading, error } = useDashboardData();
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState(false);


  useEffect(() => {
    fetchExecutiveOverview().then(setOverview).catch(console.error);
    // Check for demo mode (total logs < 5)
    fetchGuardrailMetrics().then(m => {
      if (m.total < 5) setShowDemoBanner(true);
    }).catch(console.error);
  }, []);

  const Skeleton = ({ className, children }: { className?: string, children?: React.ReactNode }) => (
    <div className={cn("animate-pulse rounded-xl bg-white/[0.03] border border-white/5", className)}>
      {children}
    </div>
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0f1a] p-8">
        <EmptyState 
          title="Intelligence Feed Interrupted" 
          description={error}
          icon={AlertCircle}
          actionLabel="Retry Connection"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col font-sans selection:bg-cyan-500/30 bg-[#0a0f1a]">
      <AnimatePresence>
        {showDemoBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
                Demo Mode: <span className="opacity-70 font-bold">Showing simulated insights until 5+ real actions are intercepted.</span>
              </p>
            </div>
            <button 
              onClick={() => setShowDemoBanner(false)}
              className="text-amber-500/50 hover:text-amber-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CriticalAlerts alerts={data?.alerts || []} />
      
      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Executive Visibility Layer */}
        {loading || !overview ? (
          <Skeleton className="h-40 w-full flex items-center justify-center">
             <span className="text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">Recalibrating Executive Intel...</span>
          </Skeleton>
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
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <AIInsightsLayer insights={data?.insights || []} />
          )}
        </motion.div>

        {/* CISO KPI Cards */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <KPICards data={data.kpis} />
          )}
        </motion.div>

        {/* PRIMARY FOCUS: Active Security Violations Table */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : data.violations.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-12">
               <EmptyState 
                  title="No Security Violations" 
                  description="Your AI guardrails are active and no critical policy violations have been detected in the current window."
                  icon={ShieldCheck}
               />
            </div>
          ) : (
            <RecentHighRiskPrompts data={data.violations} />
          )}
        </motion.div>

        {/* MERGED: System Observability */}
        <motion.div variants={itemVariants}>
          {loading ? <Skeleton className="h-64 w-full" /> : <SystemObservability />}
        </motion.div>

        {/* Secondary Analytics Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            {loading ? <Skeleton className="h-[300px] w-full" /> : <PromptVolumeChart data={data.chartData} />}
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1">
            {loading ? <Skeleton className="h-[300px] w-full" /> : <RiskByDepartment data={data.departments} />}
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}
