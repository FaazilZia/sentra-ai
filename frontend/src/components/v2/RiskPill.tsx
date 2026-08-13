import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RiskPillProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' | string;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export const RiskPill: React.FC<RiskPillProps> = ({
  level,
  score,
  showIcon = true,
  className
}) => {
  const normLevel = (level || '').toString().toUpperCase();

  const getStyle = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30',
          icon: ShieldX,
          label: 'Critical'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
          icon: ShieldAlert,
          label: 'High'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
          icon: AlertTriangle,
          label: 'Medium'
        };
      case 'LOW':
      case 'SAFE':
      default:
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          icon: ShieldCheck,
          label: normLevel === 'SAFE' ? 'Safe' : 'Low'
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        style.bg,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0 stroke-[2.5]" />}
      <span>{style.label}</span>
      {score !== undefined && (
        <span className="font-mono ml-0.5 opacity-80">({score})</span>
      )}
    </span>
  );
};
