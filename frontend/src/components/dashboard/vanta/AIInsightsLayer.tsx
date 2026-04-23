import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ShieldCheck, Lock, Activity } from 'lucide-react';

export function AIInsightsLayer({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  // Map the mock insights to specific styling and icons
  const insightConfigs = [
    {
      icon: ShieldCheck,
      colorClass: "border-emerald-500/20 bg-emerald-500/5 text-emerald-100",
      iconColor: "text-emerald-400",
      title: "SECURITY POSTURE"
    },
    {
      icon: Activity,
      colorClass: "border-cyan-500/20 bg-cyan-500/5 text-cyan-100",
      iconColor: "text-cyan-400",
      title: "OPERATIONAL INSIGHT"
    },
    {
      icon: Lock,
      colorClass: "border-slate-500/20 bg-slate-500/5 text-slate-100",
      iconColor: "text-slate-400",
      title: "GOVERNANCE STATUS"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
      {insights.map((insight, idx) => {
        const config = insightConfigs[idx] || insightConfigs[0];
        const Icon = config.icon;
        
        return (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 24 }}
            className={cn(
              "flex items-start gap-4 rounded-xl border-l-4 p-5 backdrop-blur-md",
              config.colorClass
            )}
          >
            <div className="mt-0.5">
              <Icon className={cn("h-6 w-6", config.iconColor)} />
            </div>
            <div className="flex flex-col">
              <span className={cn("text-[10px] font-black tracking-widest uppercase mb-1", config.iconColor)}>
                {config.title}
              </span>
              <p className="text-sm font-bold leading-snug">
                {insight}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
