import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value?: string | number;
  icon: LucideIcon;
  iconClassName?: string;
}

export function StatCard({ title, value = "---", icon: Icon, iconClassName }: StatCardProps) {
  const isSkeleton = value === "---";

  return (
    <div className="bg-white/6 backdrop-blur-xl border border-white/10 text-card-foreground shadow-lg shadow-slate-950/20 rounded-2xl p-5 hover:shadow-xl hover:shadow-cyan-950/10 transition-shadow relative overflow-hidden group">
      <div className="flex flex-row items-center justify-between pb-2 relative z-10">
        <h3 className="tracking-tight text-sm font-medium text-slate-400">{title}</h3>
        <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-inner shadow-white/10">
          <Icon className={cn("h-4 w-4 text-cyan-200", iconClassName)} />
        </div>
      </div>
      <div className="relative z-10">
        {isSkeleton ? (
          <div className="mt-1 space-y-3">
            <div className="h-8 w-24 bg-white/10 rounded animate-pulse"></div>
            <div className="h-3 w-32 bg-white/8 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-slate-50">{value}</div>
            <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1.5 opacity-80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
              </span>
              Waiting for data...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
