import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  EyeOff, 
  Info,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusVariant = 
  | 'active' 
  | 'compliant' 
  | 'success' 
  | 'warning' 
  | 'medium'
  | 'danger' 
  | 'critical'
  | 'high'
  | 'shadow' 
  | 'pending' 
  | 'blocked' 
  | 'draft' 
  | 'info';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label, 
  className,
  size = 'sm' 
}) => {
  const normStatus = (status || '').toString().toLowerCase();

  const getConfig = () => {
    switch (normStatus) {
      case 'active':
      case 'compliant':
      case 'success':
      case 'allowed':
      case 'pass':
      case 'blocking':
        return {
          icon: ShieldCheck,
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          defaultLabel: label || status || 'Active'
        };
      case 'warning':
      case 'medium':
      case 'needs review':
      case 'flagged':
      case 'flag-and-review':
      case 'human-in-loop':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-700 dark:text-amber-400',
          defaultLabel: label || status || 'Warning'
        };
      case 'critical':
      case 'high':
      case 'danger':
      case 'fail':
      case 'violating':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-700 dark:text-rose-400',
          defaultLabel: label || status || 'Critical'
        };
      case 'blocked':
        return {
          icon: Ban,
          bg: 'bg-red-600/15 dark:bg-red-600/20',
          border: 'border-red-600/40',
          text: 'text-red-700 dark:text-red-300 font-bold',
          defaultLabel: label || 'Blocked'
        };
      case 'shadow':
      case 'unregistered':
        return {
          icon: EyeOff,
          bg: 'bg-purple-500/10 dark:bg-purple-500/15',
          border: 'border-purple-500/30 border-dashed',
          text: 'text-purple-700 dark:text-purple-300',
          defaultLabel: label || 'Shadow'
        };
      case 'pending':
      case 'under_review':
      case 'draft':
        return {
          icon: Clock,
          bg: 'bg-slate-500/10 dark:bg-slate-500/15',
          border: 'border-slate-400/30',
          text: 'text-slate-700 dark:text-slate-300',
          defaultLabel: label || status || 'Pending'
        };
      default:
        return {
          icon: Info,
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          border: 'border-indigo-500/30',
          text: 'text-indigo-700 dark:text-indigo-300',
          defaultLabel: label || status || 'Info'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold tracking-tight uppercase border rounded-md transition-colors",
        size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        config.bg,
        config.border,
        config.text,
        className
      )}
      aria-label={`Status: ${config.defaultLabel}`}
    >
      <IconComponent className={cn("shrink-0 stroke-[2.5]", size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{config.defaultLabel}</span>
    </span>
  );
};
