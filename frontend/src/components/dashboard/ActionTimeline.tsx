import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Search, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimelineStep {
  label: string;
  status: 'pending' | 'active' | 'completed';
  icon: any;
  detail?: string;
}

interface ActionTimelineProps {
  status: 'allowed' | 'blocked';
  risk: string;
}

export const ActionTimeline: React.FC<ActionTimelineProps> = ({ status, risk }) => {
  const steps: TimelineStep[] = [
    { label: 'AI Triggered', status: 'completed', icon: Zap, detail: 'Agent intent captured' },
    { label: 'Policy Check', status: 'completed', icon: Shield, detail: 'Context evaluated' },
    { label: 'Risk Analysis', status: 'completed', icon: Search, detail: `${risk.toUpperCase()} risk detected` },
    { 
      label: status === 'allowed' ? 'Authorized' : 'Intercepted', 
      status: 'active', 
      icon: status === 'allowed' ? CheckCircle2 : XCircle,
      detail: status === 'allowed' ? 'Safe to execute' : 'Action blocked'
    },
  ];

  return (
    <div className="space-y-4 py-2">
      {steps.map((step, index) => (
        <motion.div 
          key={step.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative flex gap-3 pb-4 last:pb-0"
        >
          {index !== steps.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-[2px] bg-slate-800" />
          )}
          
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 z-10",
            step.label === 'Authorized' ? "bg-emerald-500/20 text-emerald-400" : 
            step.label === 'Intercepted' ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-400"
          )}>
            <step.icon className="h-3 w-3" />
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-100">{step.label}</span>
            <span className="text-[10px] text-slate-500">{step.detail}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
