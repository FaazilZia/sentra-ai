import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8", className)}>
      <div>
        <h1 className="text-[var(--text-xl)] font-black text-[var(--text-primary)] tracking-wide uppercase">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
