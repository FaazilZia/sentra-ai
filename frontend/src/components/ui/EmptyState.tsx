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
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-page)] border border-[var(--border-default)] shadow-sm">
        <Icon className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
      <h3 className="mb-2 text-[var(--text-md)] font-black text-[var(--text-primary)] uppercase tracking-widest">{title}</h3>
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
