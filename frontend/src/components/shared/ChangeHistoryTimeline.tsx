import { useState, useEffect } from 'react';
import { 
  Clock, User, MessageSquare, LoaderCircle, 
  Plus, CheckSquare, Trash, Settings, Activity 
} from 'lucide-react';
import { fetchEntityHistory, ChangeHistory } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

interface ChangeHistoryTimelineProps {
  entityType: 'policy' | 'risk' | 'incident' | 'guardrail' | 'agent' | 'compliance' | 'workflow';
  entityId: string;
  className?: string;
}

function getActionIcon(changeType: string) {
  switch (changeType) {
    case 'created':
      return <Plus className="h-3.5 w-3.5 text-emerald-600" />;
    case 'updated':
      return <Settings className="h-3.5 w-3.5 text-blue-600" />;
    case 'deleted':
      return <Trash className="h-3.5 w-3.5 text-rose-600" />;
    case 'status_changed':
      return <CheckSquare className="h-3.5 w-3.5 text-violet-600" />;
    case 'assigned':
      return <User className="h-3.5 w-3.5 text-amber-600" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-slate-600" />;
  }
}

function getActionColor(changeType: string) {
  switch (changeType) {
    case 'created':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-emerald-500/20';
    case 'updated':
      return 'bg-blue-50 border-blue-200 text-blue-700 ring-blue-500/20';
    case 'deleted':
      return 'bg-rose-50 border-rose-200 text-rose-700 ring-rose-500/20';
    case 'status_changed':
      return 'bg-violet-50 border-violet-200 text-violet-700 ring-violet-500/20';
    case 'assigned':
      return 'bg-amber-50 border-amber-200 text-amber-700 ring-amber-500/20';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-700 ring-slate-500/20';
  }
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}

function getFieldNameLabel(key: string): string {
  // Convert camelCase or snake_case to Space Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

export function ChangeHistoryTimeline({ entityType, entityId, className }: ChangeHistoryTimelineProps) {
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEntityHistory(entityType, entityId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load entity history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadHistory();
    }
  }, [entityType, entityId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2.5">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--royal-indigo)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
          Retrieving audit trail...
        </span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-[var(--border-default)] rounded-[var(--radius)] bg-white/40">
        <Clock className="h-8 w-8 text-[var(--text-muted)] opacity-55 mx-auto mb-2" />
        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
          No audit history logged for this {entityType}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 text-left", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)]/60 pb-3">
        <Clock className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
        <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">
          System Audit Trail ({history.length} events)
        </h4>
      </div>

      {/* Timeline Wrapper */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-default)]">
        {history.map((item) => {
          const prevObj = item.previousValue || {};
          const newObj = item.newValue || {};
          const changedKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(newObj)]));

          return (
            <div key={item.id} className="relative group animate-fade-in">
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-[24px] top-1.5 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm shrink-0 ring-4 ring-white transition-all group-hover:scale-110",
                getActionColor(item.changeType)
              )}>
                {getActionIcon(item.changeType)}
              </div>

              {/* Event Card */}
              <div className="bg-white/70 border border-[var(--border-default)]/80 hover:border-[var(--border-default)] rounded-[var(--radius)] p-4 shadow-sm space-y-3 transition-all">
                {/* Meta details */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--text-primary)]">
                      {item.user?.full_name || 'System Operator'}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-medium">
                      ({item.user?.email || 'automated@sentra.ai'})
                    </span>
                    <Badge variant={item.changeType === 'created' ? 'success' : item.changeType === 'deleted' ? 'danger' : 'royal'} className="text-[8px] scale-90 origin-left">
                      {item.changeType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Change Note */}
                {item.changeNote && (
                  <div className="flex gap-1.5 items-start bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 text-[10px] text-slate-600">
                    <MessageSquare className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                    <span>
                      <strong className="font-bold text-slate-700 uppercase tracking-tight text-[8px] block">Annotation:</strong>
                      {item.changeNote}
                    </span>
                  </div>
                )}

                {/* Diff Viewer */}
                {changedKeys.length > 0 && (
                  <div className="border border-[var(--border-default)]/60 rounded bg-slate-50/30 overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[var(--border-default)]/60 text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="px-3 py-1.5 w-1/3">Property</th>
                          <th className="px-3 py-1.5 w-1/3">Previous State</th>
                          <th className="px-3 py-1.5 w-1/3">New State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]/40 font-medium">
                        {changedKeys.map((key) => {
                          const prevVal = prevObj[key];
                          const newVal = newObj[key];
                          
                          return (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                                {getFieldNameLabel(key)}
                                <span className="block text-[8px] text-[var(--text-muted)] font-mono tracking-tight">{key}</span>
                              </td>
                              <td className="px-3 py-2 text-rose-600 bg-rose-50/20 font-mono break-all leading-normal whitespace-pre-wrap">
                                {prevVal !== undefined ? formatValue(prevVal) : <span className="italic text-slate-400 text-[8px] font-sans">N/A</span>}
                              </td>
                              <td className="px-3 py-2 text-emerald-600 bg-emerald-50/20 font-mono break-all leading-normal whitespace-pre-wrap">
                                {newVal !== undefined ? formatValue(newVal) : <span className="italic text-slate-400 text-[8px] font-sans">Removed</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
