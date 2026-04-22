import { useEffect, useState } from 'react';
import { Activity, Download, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchAIActivityLogs, AIActivityLog } from '../lib/api';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { EmptyState } from '../components/ui/EmptyState';
import { socket, connectSocket } from '../lib/socket';

export default function AIActivityLogs() {
  const { accessToken, user } = useAuth();
  const [logs, setLogs] = useState<AIActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    compliance: 'ALL',
    risk: 'ALL',
    status: 'ALL'
  });

  useEffect(() => {
    if (user?.organizationId) {
      connectSocket(user.organizationId);
      
      socket.on('new_activity', (newLog: AIActivityLog) => {
        setLogs(prev => [newLog, ...prev]);
      });

      return () => {
        socket.off('new_activity');
      };
    }
  }, [user]);

  useEffect(() => {
    async function loadLogs() {
      if (!accessToken) return;
      try {
        const data = await fetchAIActivityLogs();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('AI Activity Logs Load Error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [accessToken]);

  const filteredLogs = logs.filter(log => {
    const matchCompliance = filters.compliance === 'ALL' || log.compliance?.includes(filters.compliance);
    const matchRisk = filters.risk === 'ALL' || log.risk_score?.toUpperCase() === filters.risk;
    const matchStatus = filters.status === 'ALL' || log.status?.toUpperCase() === filters.status;
    return matchCompliance && matchRisk && matchStatus;
  });

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-12 px-6 pt-8">
      {/* Audit Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-400" />
            Audit & Compliance Logs
          </h1>
          <p className="mt-2 text-slate-300 font-medium max-w-xl">
            Complete immutable trail of all AI agent interactions, including manual overrides and compliance mapping.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-700 transition-all uppercase tracking-widest shadow-xl">
          <Download className="h-4 w-4" /> Export Full Audit CSV
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Regulatory Framework</label>
            <select 
              value={filters.compliance}
              onChange={(e) => setFilters(f => ({ ...f, compliance: e.target.value }))}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
               <option value="ALL">All Frameworks</option>
               <option value="GDPR">GDPR</option>
               <option value="HIPAA">HIPAA</option>
               <option value="DPDP">DPDP</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Risk Severity</label>
            <select 
              value={filters.risk}
              onChange={(e) => setFilters(f => ({ ...f, risk: e.target.value }))}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
               <option value="ALL">All Levels</option>
               <option value="LOW">Low Risk</option>
               <option value="MEDIUM">Medium Risk</option>
               <option value="HIGH">High Risk</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Action Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
               <option value="ALL">All Actions</option>
               <option value="ALLOWED">Allowed</option>
               <option value="BLOCKED">Blocked</option>
            </select>
         </div>
      </div>

      <div className="relative min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Audit Records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="pt-12">
            <EmptyState 
              icon={ShieldCheck} 
              title="No active alerts" 
              description="Your system is currently stable. There are no recent logs matching your selected filters." 
              className="max-w-2xl mx-auto"
            />
          </div>
        ) : (
          <ActivityFeed 
            events={filteredLogs.map(log => ({
              id: log.id,
              agent: log.agent_id,
              action: log.action,
              status: log.status as 'allowed' | 'blocked',
              risk: log.risk_score as 'low' | 'medium' | 'high',
              timestamp: new Date(log.created_at).toLocaleString(),
              reason: log.reason,
              impact: log.impact,
              compliance: log.compliance as string[],
              explanation: log.explanation,
              isPendingApproval: (log as any).is_pending_approval,
              overriddenBy: (log as any).overriddenBy,
              overrideComment: (log as any).overrideComment
            }))} 
            onReplay={() => {}} 
          />
        )}
      </div>
    </div>
  );
}
