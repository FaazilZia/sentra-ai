import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertTriangle, Lock, Users } from 'lucide-react';

export function AIInsightsLayer({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  // Map the mock insights to specific styling and icons
  const insightConfigs = [
    {
      icon: AlertTriangle,
      colorClass: "border-rose-500 bg-rose-500/10 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
      iconColor: "text-rose-500",
      title: "URGENT THREAT TREND"
    },
    {
      icon: Lock,
      colorClass: "border-amber-500 bg-amber-500/10 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      iconColor: "text-amber-500",
      title: "SECURITY EVENT"
    },
    {
      icon: Users,
      colorClass: "border-cyan-500 bg-cyan-500/10 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
      iconColor: "text-cyan-500",
      title: "BEHAVIORAL RISK"
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
