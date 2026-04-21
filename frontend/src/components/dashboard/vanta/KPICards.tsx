import { Users, AlertTriangle, ShieldCheck, ListTodo, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  color: "cyan" | "rose" | "emerald" | "amber";
}

const colorMap = {
  cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  rose: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

function KPICard({ title, value, trend, trendLabel, icon: Icon, color }: KPICardProps) {
  const isPositive = trend > 0;
  
  return (
    <div className="flex flex-col rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl backdrop-blur-sm transition hover:bg-white/[0.07]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400">{title}</h3>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <span className="text-4xl font-black tracking-tight text-white">{value}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
          isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{Math.abs(trend)}%</span>
        </div>
        <span className="text-xs text-slate-500">{trendLabel}</span>
      </div>
    </div>
  );
}

export function KPICards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total AI Users"
        value="1,284"
        trend={12}
        trendLabel="vs last month"
        icon={Users}
        color="cyan"
      />
      <KPICard
        title="Flagged Prompts"
        value="342"
        trend={-5.4}
        trendLabel="vs last month"
        icon={AlertTriangle}
        color="rose"
      />
      <KPICard
        title="Compliance Score"
        value="94/100"
        trend={2.1}
        trendLabel="vs last month"
        icon={ShieldCheck}
        color="emerald"
      />
      <KPICard
        title="Requires Review"
        value="28"
        trend={-14}
        trendLabel="vs last week"
        icon={ListTodo}
        color="amber"
      />
    </div>
  );
}
