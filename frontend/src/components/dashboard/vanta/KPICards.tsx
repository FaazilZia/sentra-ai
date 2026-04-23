import { AlertTriangle, ShieldAlert, ShieldBan, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/hooks/useDashboardData';

interface KPICardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  valueColor?: string;
  iconColorClass?: string;
}

function KPICard({ title, value, trend, trendLabel, icon: Icon, valueColor = "text-white", iconColorClass = "text-slate-500 bg-white/5 border-white/10" }: KPICardProps) {
  const isPositive = trend >= 0;
  
  return (
    <div className="flex flex-col rounded-xl border border-[#1e293b] bg-[#0d1424] p-5 shadow-2xl transition-all hover:border-cyan-500/20">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", iconColorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4">
        <span className={cn("text-4xl font-black tracking-tighter", valueColor)}>{value}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
          isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{trendLabel}</span>
      </div>
    </div>
  );
}

export function KPICards({ data }: { data: KPIData }) {
  const score = data.riskScore.value;
  const violations = data.criticalViolations.value;
  const compliance = data.complianceScore.value;
  const blocked = data.modelsBlockedToday.value;

  // Risk Score: Red only when < 80 or violations > 0. (Assuming 100 is best)
  const isRiskAlert = score < 80 || violations > 0;
  const scoreColor = score === 0 ? "text-slate-500" : (isRiskAlert ? "text-rose-500" : "text-emerald-400");
  const scoreIconColor = score === 0 ? "text-slate-500 bg-white/5 border-white/10" : (isRiskAlert ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20");

  // Critical Violations: Red only if > 0
  const violationsColor = violations === 0 ? "text-slate-500" : "text-rose-500";
  const violationsIconColor = violations === 0 ? "text-slate-500 bg-white/5 border-white/10" : "text-rose-400 bg-rose-500/10 border-rose-500/20";

  // Models Blocked: Neutral if 0
  const blockedColor = blocked === 0 ? "text-slate-500" : "text-amber-400";
  const blockedIconColor = blocked === 0 ? "text-slate-500 bg-white/5 border-white/10" : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  // Compliance %: Red only when < 100% AND violations exist
  const isComplianceAlert = compliance < 100 && violations > 0;
  const complianceColor = compliance === 0 ? "text-slate-500" : (isComplianceAlert ? "text-rose-500" : "text-emerald-400");
  const complianceIconColor = compliance === 0 ? "text-slate-500 bg-white/5 border-white/10" : (isComplianceAlert ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Risk Score"
        value={score}
        trend={data.riskScore.trend}
        trendLabel={data.riskScore.trendLabel}
        icon={AlertTriangle}
        valueColor={scoreColor}
        iconColorClass={scoreIconColor}
      />
      <KPICard
        title="Critical Violations"
        value={violations.toLocaleString()}
        trend={data.criticalViolations.trend}
        trendLabel={data.criticalViolations.trendLabel}
        icon={ShieldAlert}
        valueColor={violationsColor}
        iconColorClass={violationsIconColor}
      />
      <KPICard
        title="Models Blocked Today"
        value={blocked.toLocaleString()}
        trend={data.modelsBlockedToday.trend}
        trendLabel={data.modelsBlockedToday.trendLabel}
        icon={ShieldBan}
        valueColor={blockedColor}
        iconColorClass={blockedIconColor}
      />
      <KPICard
        title="Compliance %"
        value={`${compliance}%`}
        trend={data.complianceScore.trend}
        trendLabel={data.complianceScore.trendLabel}
        icon={ShieldCheck}
        valueColor={complianceColor}
        iconColorClass={complianceIconColor}
      />
    </div>
  );
}
