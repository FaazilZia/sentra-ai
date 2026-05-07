import { cn } from '@/lib/utils';
import { LayoutDashboard, ShieldAlert, ClipboardCheck, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

const icons = {
  systems: LayoutDashboard,
  risks: ShieldAlert,
  compliance: ClipboardCheck,
  shadow: EyeOff,
};

interface KPICardProps {
  label: string;
  value: string | number;
  icon: keyof typeof icons;
  status: 'primary' | 'warning' | 'success' | 'danger';
  trend?: {
    value: string;
    isUp: boolean;
  };
  isLoading?: boolean;
}

export default function KPICard({ label, value, icon, status, trend, isLoading }: KPICardProps) {
  const Icon = icons[icon] || LayoutDashboard;

  const statusColors = {
    primary: 'var(--violet-blue)',
    warning: 'var(--risk-medium)',
    success: 'var(--risk-low)',
    danger: 'var(--risk-critical)',
  };

  const bgColors = {
    primary: 'var(--ghost-violet)',
    warning: 'rgba(245, 158, 11, 0.1)',
    success: 'rgba(34, 197, 94, 0.1)',
    danger: 'rgba(239, 68, 68, 0.1)',
  };

  return (
    <div className="card-base p-6 flex flex-col relative overflow-hidden group hover:shadow-md transition-all min-h-[140px]">
      <div className="flex items-start justify-between mb-5">
        <div 
          className="h-10 w-10 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: bgColors[status], color: statusColors[status] }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && !isLoading && value !== '--' && (
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
            trend.isUp ? "bg-[#22C55E1A] text-[#22C55E]" : "bg-[#EF44441A] text-[#EF4444]"
          )}>
            {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.05em]">{label}</span>
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-20 bg-[var(--bg-page)] animate-pulse rounded" />
          ) : (
            <span className={cn(
              "text-[var(--text-3xl)] font-bold tracking-tighter transition-colors",
              value === '--' ? "text-[var(--text-muted)]" : "text-[var(--violet-blue)]"
            )}>
              {value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
