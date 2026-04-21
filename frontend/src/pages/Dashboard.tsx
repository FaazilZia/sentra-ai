import { motion, Variants } from 'framer-motion';
import { useDashboardSimulation } from '@/hooks/useDashboardSimulation';
import { KPICards } from '@/components/dashboard/vanta/KPICards';
import { PromptVolumeChart } from '@/components/dashboard/vanta/PromptVolumeChart';
import { RiskByDepartment } from '@/components/dashboard/vanta/RiskByDepartment';
import { RecentHighRiskPrompts } from '@/components/dashboard/vanta/RecentHighRiskPrompts';
import { CriticalAlerts } from '@/components/dashboard/vanta/CriticalAlerts';
import { AIInsightsLayer } from '@/components/dashboard/vanta/AIInsightsLayer';
import { LiveMonitoring } from '@/components/dashboard/vanta/LiveMonitoring';

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
  const data = useDashboardSimulation();
  
  return (
    <div className="flex h-full flex-col font-sans selection:bg-cyan-500/30">
      <CriticalAlerts alerts={data.alerts} />
      
      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-6 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
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

        {/* Secondary Analytics & Observability Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Live Rule Monitoring (Takes 2 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <LiveMonitoring />
          </motion.div>

          {/* Prompt Trend & Department Risk (Stacked in 1 col) */}
          <motion.div variants={itemVariants} className="flex flex-col gap-6 lg:col-span-1">
            <PromptVolumeChart data={data.chartData} />
            <div className="flex-1">
              <RiskByDepartment data={data.departments} />
            </div>
          </motion.div>

        </div>

      </motion.div>
    </div>
  );
}
