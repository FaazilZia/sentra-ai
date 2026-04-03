import React from 'react';
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
    <div className="bg-white/70 backdrop-blur-md border text-card-foreground shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex flex-row items-center justify-between pb-2 relative z-10">
        <h3 className="tracking-tight text-sm font-medium text-slate-500">{title}</h3>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </div>
      <div className="relative z-10">
        {isSkeleton ? (
          <div className="mt-1 space-y-3">
            <div className="h-8 w-24 bg-slate-200/60 rounded animate-pulse"></div>
            <div className="h-3 w-32 bg-slate-200/50 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1.5 opacity-80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
              </span>
              Waiting for data...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
