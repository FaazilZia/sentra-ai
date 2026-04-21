import { motion, Variants } from 'framer-motion';
import { KPICards } from '@/components/dashboard/vanta/KPICards';
import { PromptVolumeChart } from '@/components/dashboard/vanta/PromptVolumeChart';
import { RiskByDepartment } from '@/components/dashboard/vanta/RiskByDepartment';
import { RecentHighRiskPrompts } from '@/components/dashboard/vanta/RecentHighRiskPrompts';

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
  return (
    <div className="flex h-full flex-col font-sans selection:bg-cyan-500/30">
      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-6 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* KPI Cards (Top Row) */}
        <motion.div variants={itemVariants}>
          <KPICards />
        </motion.div>

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          {/* AI Prompt Volume Chart (takes up 2 columns on large screens) */}
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <PromptVolumeChart />
          </motion.div>

          {/* Risk by Department (takes up 1 column) */}
          <motion.div variants={itemVariants} className="xl:col-span-1">
            <RiskByDepartment />
          </motion.div>

        </div>

        {/* Recent High-Risk Prompts Table */}
        <motion.div variants={itemVariants}>
          <RecentHighRiskPrompts />
        </motion.div>

      </motion.div>
    </div>
  );
}
