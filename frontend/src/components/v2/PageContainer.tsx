import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className
}) => {
  return (
    <div className={cn("p-6 flex flex-col gap-6 animate-fade-in min-h-screen pb-24", className)}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] dark:text-slate-100 opacity-100 uppercase">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {children}
      </div>
    </div>
  );
};
