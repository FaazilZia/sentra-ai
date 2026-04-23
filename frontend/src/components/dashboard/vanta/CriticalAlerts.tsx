import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { AlertData } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

const alertStyles = {
  critical: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
};

const alertIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function CriticalAlerts({ alerts }: { alerts: AlertData[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-md flex-col gap-3">
      <AnimatePresence>
        {alerts.map((alert) => {
          const Icon = alertIcons[alert.type];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md",
                alertStyles[alert.type]
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{alert.message}</p>
                <p className="mt-1 text-xs opacity-80">{alert.timestamp}</p>
              </div>
              <button className="flex-shrink-0 opacity-50 hover:opacity-100 transition">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
