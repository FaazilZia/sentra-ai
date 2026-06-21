import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      {/* Node motif: three dots above the icon */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--royal-indigo)] opacity-30" />
        <span className="h-2 w-2 rounded-full bg-[var(--royal-indigo)] opacity-60" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--royal-indigo)] opacity-30" />
      </div>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-page)] border border-[var(--border-default)] shadow-sm">
        <Icon className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
      <h3 className="mb-2 text-[var(--text-md)] font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mb-8 max-w-sm text-[var(--text-sm)] font-medium text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="btn-primary !px-8 !py-3 shadow-lg shadow-[var(--royal-indigo)]/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
