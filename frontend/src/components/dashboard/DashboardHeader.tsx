import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardHeaderProps {
  total: number;
  allowed: number;
  blocked: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ total, allowed, blocked }) => {
  const cards = [
    { 
      label: 'Total Actions', 
      value: total, 
      icon: Zap, 
      color: 'text-indigo-400', 
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    { 
      label: 'Authorized', 
      value: allowed, 
      icon: ShieldCheck, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    { 
      label: 'Intercepted', 
      value: blocked, 
      icon: ShieldAlert, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "glass-card p-6 rounded-[2rem] relative overflow-hidden group",
            card.border
          )}
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className={cn("p-4 rounded-2xl", card.bg, card.color)}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
                {card.label}
              </p>
              <p className="text-3xl font-black tracking-tight text-white leading-none">
                {card.value.toLocaleString()}
              </p>
            </div>
          </div>
          
          {/* Subtle decoration */}
          <div className={cn(
            "absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity",
            card.bg
          )} />
        </motion.div>
      ))}
    </div>
  );
};
