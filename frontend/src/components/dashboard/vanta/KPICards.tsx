import { AlertTriangle, ShieldAlert, ShieldBan, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/hooks/useDashboardSimulation';

interface KPICardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  valueColor?: string;
  iconColorClass?: string;
}

function KPICard({ title, value, trend, trendLabel, icon: Icon, valueColor = "text-white", iconColorClass = "text-slate-300 bg-slate-400/10 border-slate-400/20" }: KPICardProps) {
  const isPositive = trend >= 0;
  
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", iconColorClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <span className={cn("text-5xl font-black tracking-tighter drop-shadow-sm", valueColor)}>{value}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold tracking-wide",
          isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{Math.abs(trend).toFixed(1)}</span>
        </div>
        <span className="text-xs font-medium text-slate-300">{trendLabel}</span>
      </div>
    </div>
  );
}

export function KPICards({ data }: { data: KPIData }) {
  const score = data.riskScore.value;
  const scoreColor = score < 30 ? "text-emerald-400" : score < 70 ? "text-amber-400" : "text-rose-500";
  const scoreIconColor = score < 30 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : score < 70 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-rose-500 bg-rose-500/10 border-rose-500/20";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Risk Score"
        value={data.riskScore.value}
        trend={data.riskScore.trend}
        trendLabel={data.riskScore.trendLabel}
        icon={AlertTriangle}
        valueColor={scoreColor}
        iconColorClass={scoreIconColor}
      />
      <KPICard
        title="Critical Violations"
        value={data.criticalViolations.value.toLocaleString()}
        trend={data.criticalViolations.trend}
        trendLabel={data.criticalViolations.trendLabel}
        icon={ShieldAlert}
        valueColor="text-rose-500"
        iconColorClass="text-rose-400 bg-rose-500/10 border-rose-500/20"
      />
      <KPICard
        title="Models Blocked Today"
        value={data.modelsBlockedToday.value.toLocaleString()}
        trend={data.modelsBlockedToday.trend}
        trendLabel={data.modelsBlockedToday.trendLabel}
        icon={ShieldBan}
        valueColor="text-amber-400"
        iconColorClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
      />
      <KPICard
        title="Compliance %"
        value={`${data.complianceScore.value}%`}
        trend={data.complianceScore.trend}
        trendLabel={data.complianceScore.trendLabel}
        icon={ShieldCheck}
        valueColor="text-emerald-400"
        iconColorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      />
    </div>
  );
}
