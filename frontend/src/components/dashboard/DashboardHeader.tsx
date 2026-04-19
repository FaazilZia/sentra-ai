import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Zap, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardHeaderProps {
  total: number;
  blocked: number;
  complianceScore: number;
  riskScore: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  total, 
  blocked, 
  complianceScore, 
  riskScore 
}) => {
  const cards = [
    { 
      label: 'Compliance Score', 
      value: `${complianceScore}%`, 
      icon: ShieldCheck, 
      color: 'text-indigo-400', 
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    { 
      label: 'Risk Score', 
      value: `${riskScore}%`, 
      icon: BarChart3, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20'
    },
    { 
      label: 'Total Violations', 
      value: total, 
      icon: Zap, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    { 
      label: 'Total Blocked Actions', 
      value: blocked, 
      icon: ShieldAlert, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "glass-card p-6 rounded-[1.5rem] border bg-slate-900/40",
            card.border
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", card.bg, card.color)}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                {card.label}
              </p>
              <p className="text-2xl font-black tracking-tight text-white">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
