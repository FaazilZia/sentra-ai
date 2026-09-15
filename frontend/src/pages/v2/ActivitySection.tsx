import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest } from '@/lib/api';
import { useSocketStore } from '@/store/useSocketStore';
import { useStore } from '@/store/useStore';
import { 
  Activity, 
  Ban, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Eye,
  History
} from 'lucide-react';

export interface FeedEvent {
  id: string;
  timestamp: string;
  agentName: string;
  actionType: string;
  status: 'BLOCKED' | 'FLAGGED' | 'ALLOWED';
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  promptSnippet?: string;
  rawTimestamp?: number;
}

export const formatRelativeTime = (dateInput?: string | Date | number): string => {
  if (!dateInput) return 'Just now';
  const timestamp = new Date(dateInput).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(timestamp).toISOString().split('T')[0];
};

export const resolveIncidentSeverity = (severity?: number | string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (typeof severity === 'number') {
    if (severity >= 80) return 'CRITICAL';
    if (severity >= 60) return 'HIGH';
    if (severity >= 40) return 'MEDIUM';
    return 'LOW';
  }
  const s = String(severity || '').toUpperCase();
  if (s === 'CRITICAL') return 'CRITICAL';
  if (s === 'HIGH') return 'HIGH';
  if (s === 'MEDIUM') return 'MEDIUM';
  if (s === 'LOW') return 'LOW';
  return 'HIGH';
};

export const mapIncidentToFeedEvent = (inc: any, index = 0): FeedEvent => {
  const sev = resolveIncidentSeverity(inc.severity);
  const action = String(inc.action || 'Security Incident');
  const isBlocked = sev === 'CRITICAL' || action.toLowerCase().includes('block');
  const createdAt = inc.created_at || inc.timestamp;
  const rawTimestamp = createdAt ? new Date(createdAt).getTime() : Date.now();

  return {
    id: inc.id ? String(inc.id) : `inc-${index}-${rawTimestamp}`,
    timestamp: formatRelativeTime(createdAt),
    agentName: inc.agent_id || inc.agentName || 'Monitored Agent',
    actionType: action,
    status: isBlocked ? 'BLOCKED' : 'FLAGGED',
    reason: inc.details || inc.reason || 'Automated policy violation detected',
    severity: sev,
    promptSnippet: inc.prompt_excerpt || inc.response_excerpt || undefined,
    rawTimestamp: Number.isNaN(rawTimestamp) ? 0 : rawTimestamp
  };
};

export const mapAuditLogToFeedEvent = (log: any, index = 0): FeedEvent => {
  const s = String(log.severity || '').toUpperCase();
  const sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
    s === 'CRITICAL' ? 'CRITICAL' :
    s === 'HIGH' || s === 'ERROR' ? 'HIGH' :
    s === 'MEDIUM' || s === 'WARNING' ? 'MEDIUM' : 'LOW';

  const outcome = String(log.outcome || '').toLowerCase();
  let status: 'BLOCKED' | 'FLAGGED' | 'ALLOWED' = 'ALLOWED';
  if (outcome === 'blocked' || outcome === 'denied' || outcome === 'failure') {
    status = sev === 'CRITICAL' ? 'BLOCKED' : 'FLAGGED';
  } else if (sev === 'CRITICAL' || sev === 'HIGH') {
    status = 'FLAGGED';
  }

  const timestamp = log.timestamp || log.created_at;
  const rawTimestamp = timestamp ? new Date(timestamp).getTime() : Date.now();

  return {
    id: log.id ? String(log.id) : `audit-${index}-${rawTimestamp}`,
    timestamp: formatRelativeTime(timestamp),
    agentName:
      log.metadata?.agent_name ||
      log.metadata?.agent_id ||
      log.user?.full_name ||
      log.user?.email ||
      'System Pipeline',
    actionType: log.action || log.event_type || 'Audit Log',
    status,
    reason: log.metadata?.reason || log.metadata?.detail || log.action || 'Recorded system audit event',
    severity: sev,
    promptSnippet: log.metadata?.prompt || log.metadata?.query || log.metadata?.payload || undefined,
    rawTimestamp: Number.isNaN(rawTimestamp) ? 0 : rawTimestamp
  };
};

export const mapAiLogToFeedEvent = (log: any, index = 0): FeedEvent => {
  const statusStr = String(log.status || '').toUpperCase();
  const isFlagged = statusStr === 'FLAGGED' || log.isPendingApproval === true || log.metadata?.isPendingApproval === true;
  const status: 'BLOCKED' | 'FLAGGED' | 'ALLOWED' =
    statusStr === 'BLOCKED' ? 'BLOCKED' : (isFlagged ? 'FLAGGED' : 'ALLOWED');

  const riskStr = String(log.risk || '').toUpperCase();
  const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
    riskStr === 'HIGH' ? 'CRITICAL' :
    riskStr === 'MEDIUM' ? 'MEDIUM' : 'LOW';

  const timestamp = log.timestamp || log.created_at;
  const rawTimestamp = timestamp ? new Date(timestamp).getTime() : Date.now();
  const meta = log.metadata || {};
  const snippet = meta.prompt || meta.file || meta.resource || meta.destination || (typeof meta.amount === 'number' ? `Amount: $${meta.amount.toLocaleString()}` : undefined) || log.explanation || undefined;

  return {
    id: log.id ? String(log.id) : `ai-log-${index}-${rawTimestamp}`,
    timestamp: formatRelativeTime(timestamp),
    agentName: log.agent || log.agent_id || 'Monitored Agent',
    actionType: log.action || 'AI Action',
    status,
    reason: log.reason || log.explanation || (status === 'BLOCKED' ? 'Blocked by governance policy' : status === 'FLAGGED' ? 'Flagged for human review' : 'Authorized action'),
    severity,
    promptSnippet: snippet,
    rawTimestamp: Number.isNaN(rawTimestamp) ? 0 : rawTimestamp
  };
};

export const mergeAndSortFeedEvents = (incidents: any[], auditLogs: any[]): FeedEvent[] => {
  const incList = Array.isArray(incidents) ? incidents : [];
  const audList = Array.isArray(auditLogs) ? auditLogs : [];

  const incEvents = incList.map((inc, i) => mapIncidentToFeedEvent(inc, i));
  const audEvents = audList.map((log, i) => mapAuditLogToFeedEvent(log, i));

  const combined = [...incEvents, ...audEvents];
  combined.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));

  return combined.slice(0, 50);
};

export default function ActivitySection() {
  const { addToast } = useStore();
  const { alerts } = useSocketStore();
  const [activeTab, setActiveTab] = useState<string>('live');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [rawAuditLogs, setRawAuditLogs] = useState<any[]>([]);
  const [rawIncidents, setRawIncidents] = useState<any[]>([]);

  const loadActivityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aiLogsRes, auditRes, incidentsRes] = await Promise.all([
        apiRequest<any>('/ai/logs').catch((err) => {
          console.error('Failed to fetch /ai/logs:', err);
          return null;
        }),
        apiRequest<any>('/audit').catch((err) => {
          console.error('Failed to fetch /audit:', err);
          return null;
        }),
        apiRequest<any>('/incidents').catch((err) => {
          console.error('Failed to fetch /incidents:', err);
          return null;
        })
      ]);

      if (!aiLogsRes && !auditRes && !incidentsRes) {
        throw new Error('Unable to connect to activity and audit services. Please verify your connection.');
      }

      const fetchedIncidents = Array.isArray(incidentsRes?.data?.data)
        ? incidentsRes.data.data
        : Array.isArray(incidentsRes?.data)
        ? incidentsRes.data
        : Array.isArray(incidentsRes)
        ? incidentsRes
        : [];
      const fetchedAudit = Array.isArray(auditRes?.logs)
        ? auditRes.logs
        : Array.isArray(auditRes?.data)
        ? auditRes.data
        : Array.isArray(auditRes)
        ? auditRes
        : [];
      const fetchedAiLogs = Array.isArray(aiLogsRes?.data)
        ? aiLogsRes.data
        : Array.isArray(aiLogsRes)
        ? aiLogsRes
        : [];

      setRawIncidents(fetchedIncidents);
      setRawAuditLogs(fetchedAudit);

      if (fetchedAiLogs.length > 0) {
        const mappedAiEvents = fetchedAiLogs.map((log: any, i: number) => mapAiLogToFeedEvent(log, i));
        mappedAiEvents.sort((a: FeedEvent, b: FeedEvent) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
        setEvents(mappedAiEvents);
      } else {
        const mergedFeed = mergeAndSortFeedEvents(fetchedIncidents, fetchedAudit);
        setEvents(mergedFeed);
      }
    } catch (err: any) {
      console.error('Error loading activity feed:', err);
      setError(err?.message || 'Failed to load activity stream. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

  // Handle incoming real-time socket alerts
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latest = alerts[0] as any;
      const newEv: FeedEvent = {
        id: `socket-${Date.now()}`,
        timestamp: 'Just now',
        agentName: latest.agentName || latest.source || 'Monitored Agent',
        actionType: latest.title || latest.type || 'Threat Detection',
        status: (latest.severity || '').toString().toLowerCase() === 'critical' ? 'BLOCKED' : 'FLAGGED',
        reason: latest.message || latest.description || 'Real-time security event',
        severity: (latest.severity || 'HIGH').toString().toUpperCase() as any
      };
      setEvents(prev => [newEv, ...prev.slice(0, 49)]);
    }
  }, [alerts]);

  const today = new Date().toDateString();
  const todayEvents = events.filter(e => !e.rawTimestamp || new Date(e.rawTimestamp).toDateString() === today);
  const blockedCount = todayEvents.filter(e => e.status === 'BLOCKED').length;
  const flaggedCount = todayEvents.filter(e => e.status === 'FLAGGED').length;
  const allowedCount = todayEvents.filter(e => e.status === 'ALLOWED').length;

  const feedColumns: Column<FeedEvent>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {item.timestamp}
        </span>
      )
    },
    {
      header: 'Agent Source',
      accessorKey: 'agentName',
      sortable: true,
      cell: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.agentName}</span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{item.actionType}</span>
        </div>
      )
    },
    {
      header: 'Action Verdict',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => (
        <StatusBadge 
          status={item.status === 'BLOCKED' ? 'blocked' : item.status === 'FLAGGED' ? 'warning' : 'active'}
          label={item.status}
        />
      )
    },
    {
      header: 'Enforcement Reason & Snippet',
      accessorKey: 'reason',
      cell: (item) => (
        <div className="max-w-md">
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">{item.reason}</span>
          {item.promptSnippet && (
            <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 truncate block mt-0.5 max-w-full">
              {item.promptSnippet}
            </code>
          )}
        </div>
      )
    },
    {
      header: 'Action',
      cell: (item) => (
        <button
          onClick={() => addToast({ message: `Viewing full payload for event ${item.id}`, type: 'info' })}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1"
        >
          <Eye className="h-3 w-3" /> Inspect
        </button>
      )
    }
  ];

  return (
    <PageContainer
      title="Activity"
      subtitle="Real-time live action feed, audit explorer, and security incident logs."
      badge={
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live Stream Active
        </span>
      }
      actions={
        <button
          onClick={loadActivityData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Stream
        </button>
      }
    >
      {/* Activity Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Real-Time Feed Stream"
          value={todayEvents.length || events.length}
          subtitle="Monitored pipeline events today"
          status="primary"
          icon={Activity}
        />
        <MetricCard
          label="Blocked Actions"
          value={blockedCount}
          subtitle="Critical policy interventions today"
          status="danger"
          icon={Ban}
        />
        <MetricCard
          label="Flagged / Human-in-Loop"
          value={flaggedCount}
          subtitle="Pending manual approval today"
          status="warning"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Allowed Executions"
          value={allowedCount}
          subtitle="Safe policy transactions today"
          status="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
          <button
            onClick={loadActivityData}
            className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Activity Sub-Tabs */}
      <TabBar
        tabs={[
          { id: 'live', label: 'Live Action Feed', count: events.length, icon: Activity },
          { id: 'audit', label: 'Historical Audit Log', count: rawAuditLogs.length, icon: History },
          { id: 'incidents', label: 'Incidents & Remediation', count: rawIncidents.length, icon: AlertTriangle }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Live Action Feed */}
      {activeTab === 'live' && (
        <DataTable
          columns={feedColumns}
          data={events}
          keyExtractor={(item) => item.id}
          rowStyle={(item) =>
            item.status === 'BLOCKED'
              ? 'bg-rose-950/10 dark:bg-rose-950/15 border-l-4 border-l-rose-500'
              : item.status === 'FLAGGED'
              ? 'bg-amber-950/10 dark:bg-amber-950/15 border-l-4 border-l-amber-500'
              : ''
          }
          isLoading={loading}
          emptyMessage="No security or audit events recorded yet"
          searchPlaceholder="Watch live... Filter by agent, reason, or status..."
        />
      )}

      {/* Tab 2: Audit Explorer */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-500" /> Historical System & User Audit Explorer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Immutable ledger recording all configuration edits, policy deployments, and user logins.
              </p>
            </div>
            <button
              onClick={() => addToast({ message: 'Exporting audit CSV log...', type: 'success' })}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
            >
              Export CSV Audit Log
            </button>
          </div>

          <div className="space-y-3">
            {rawAuditLogs.length === 0 ? (
              <div className="text-center py-8 text-xs font-medium text-slate-500 dark:text-slate-400">
                No historical audit logs recorded yet.
              </div>
            ) : (
              rawAuditLogs.slice(0, 15).map((log: any, i: number) => (
                <div key={log.id || `audit-${i}`} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {formatRelativeTime(log.timestamp || log.created_at)}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{log.action || log.event_type || 'SYSTEM_ACTION'}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {log.metadata?.detail || log.metadata?.reason || log.resource_type || 'System transaction recorded'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {log.user?.full_name || log.user?.email || 'System Service'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Incidents & Remediation */}
      {activeTab === 'incidents' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Escalated Governance Incidents
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Open threat incidents requiring SOC investigation and remediation assignment.
              </p>
            </div>
            <StatusBadge
              status={rawIncidents.length > 0 ? 'critical' : 'compliant'}
              label={`${rawIncidents.length} Incident${rawIncidents.length === 1 ? '' : 's'} Open`}
            />
          </div>

          <div className="space-y-3">
            {rawIncidents.length === 0 ? (
              <div className="text-center py-8 text-xs font-medium text-slate-500 dark:text-slate-400">
                No escalated governance incidents recorded.
              </div>
            ) : (
              rawIncidents.slice(0, 10).map((inc: any, i: number) => (
                <div key={inc.id || `inc-${i}`} className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                      <Ban className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {inc.id ? `INC-${String(inc.id).slice(0, 8).toUpperCase()}` : `INC-${i + 1}`}: {inc.action || 'Security Incident'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {inc.details || inc.reason || 'Security violation detected across connected endpoints.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToast({ message: `Incident ${inc.id || i + 1} assigned to SOC team`, type: 'success' })}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    Assign Remediation Task
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
