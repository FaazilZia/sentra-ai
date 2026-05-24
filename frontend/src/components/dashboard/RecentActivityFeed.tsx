import React, { useEffect, useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { fetchRecentHistory, ChangeHistory } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface RecentActivityFeedProps {
  isLoading?: boolean;
}

function getInitials(name?: string, email?: string): string {
  const str = name || email || 'SO';
  return str.split(' ').filter(Boolean).map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
}

function getEntityLink(type: string): string {
  switch (type) {
    case 'policy':
      return '/app/policies';
    case 'risk':
      return '/app/risk-assessment';
    case 'incident':
      return '/app/risk-center';
    case 'guardrail':
      return '/app/guardrails';
    case 'agent':
      return '/app/ai-systems';
    case 'compliance':
      return '/app/compliance';
    case 'workflow':
      return '/app/workflows';
    default:
      return '/app';
  }
}

export default function RecentActivityFeed({ isLoading: externalLoading = false }: RecentActivityFeedProps) {
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecentHistory = async () => {
    try {
      const data = await fetchRecentHistory(8);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load recent history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentHistory();
  }, []);

  const showLoading = loading || externalLoading;

  return (
    <div className="card-base p-6 flex flex-col h-full bg-white text-left">
      <div className="flex items-center justify-between mb-6 border-b border-[var(--border-default)]/60 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">Recent Activity Feed</h3>
        </div>
      </div>

      <div className="flex-1 space-y-5 relative min-h-[300px] overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
        {history.length > 0 && !showLoading && (
          <div className="absolute left-[17px] top-2 bottom-4 w-[1px] bg-[var(--border-default)]" />
        )}

        {showLoading ? (
          [...new Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-[var(--bg-page)]" />
              <div className="flex-1 py-1 space-y-2">
                <div className="h-3 bg-[var(--bg-page)] rounded w-3/4" />
                <div className="h-2 bg-[var(--bg-page)] rounded w-1/4" />
              </div>
            </div>
          ))
        ) : history.length > 0 ? (
          history.map((item) => (
            <div key={item.id} className="flex gap-4 relative group animate-fade-in text-left">
              {/* Avatar Circle */}
              <div className="h-9 w-9 rounded-full bg-[var(--bg-page)] border border-[var(--border-default)] flex items-center justify-center shrink-0 z-10 group-hover:border-[var(--royal-indigo)] group-hover:bg-[var(--ghost-violet)] transition-all">
                <span className="text-[10px] font-black text-[var(--royal-indigo)] uppercase tracking-tighter">
                  {getInitials(item.user?.full_name, item.user?.email)}
                </span>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-start">
                  <div className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-normal">
                    <span className="font-bold text-[var(--text-primary)]">
                      {item.user?.full_name || 'System Operator'}
                    </span>
                    {' '}
                    <span className="font-semibold text-slate-500 lowercase">
                      {item.changeType.replace('_', ' ')}
                    </span>
                    {' '}
                    <span>{item.entityType}</span>
                    {' '}
                    <Link 
                      to={getEntityLink(item.entityType)} 
                      className="font-bold text-[var(--royal-indigo)] hover:underline break-all"
                    >
                      {item.entityId.slice(0, 8)}...
                    </Link>
                  </div>
                  <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter shrink-0 ml-4">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {item.changeNote && (
                  <p className="mt-1.5 text-[9px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-100/80 rounded px-2 py-1 italic">
                    "{item.changeNote}"
                  </p>
                )}

                <div className="flex items-center gap-1.5 mt-2.5">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.changeType === 'created' ? 'bg-emerald-500' :
                    item.changeType === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                  )} />
                  <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {item.changeType.replace('_', ' ')} audit event
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-30 py-16 h-full text-center">
            <History className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              No recent governance events
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-[var(--border-default)]/60 pt-4">
        <Link 
          to="/app/audit"
          className="w-full text-center py-2 text-[9px] font-black text-[var(--text-muted)] hover:text-[var(--royal-indigo)] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5"
        >
          <span>Global Audit Explorer</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
