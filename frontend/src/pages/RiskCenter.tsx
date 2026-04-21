import { motion, Variants } from 'framer-motion';
import { RiskPosture } from '@/components/risk/RiskPosture';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { ActiveRiskEvents } from '@/components/risk/ActiveRiskEvents';
import { RiskExposurePanel } from '@/components/risk/RiskExposurePanel';
import { RiskOwnership } from '@/components/risk/RiskOwnership';

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
  return (
    <div className="flex h-full flex-col font-sans selection:bg-rose-500/30">
      
      {/* Top Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">Risk Assessment</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Live exposure across all AI models in your organisation — refreshed every 60 seconds
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-white/10 pb-3 flex gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
        <button className="text-white border-b-2 border-white pb-3 -mb-[14px]">Overview</button>
        <button className="hover:text-slate-100 transition pb-3 -mb-[14px]">By Model</button>
        <button className="hover:text-slate-100 transition pb-3 -mb-[14px]">By Framework</button>
        <button className="hover:text-slate-100 transition pb-3 -mb-[14px]">Trend</button>
        <button className="hover:text-slate-100 transition pb-3 -mb-[14px]">Ownership</button>
      </div>

      <motion.div 
        className="mx-auto w-full max-w-[1600px] space-y-12 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <RiskPosture />
        </motion.div>

        <motion.div variants={itemVariants}>
          <RiskHeatmap />
        </motion.div>

        <motion.div variants={itemVariants}>
          <ActiveRiskEvents />
        </motion.div>

        <motion.div variants={itemVariants}>
          <RiskExposurePanel />
        </motion.div>

        <motion.div variants={itemVariants}>
          <RiskOwnership />
        </motion.div>
      </motion.div>
    </div>
  );
}
