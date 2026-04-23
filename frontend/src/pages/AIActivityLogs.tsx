import { useEffect, useState } from 'react';
import { ShieldAlert, Download, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchViolations, IncidentResponse } from '../lib/api';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { EmptyState } from '../components/ui/EmptyState';

export default function AIActivityLogs() {
  const { accessToken } = useAuth();
  const [violations, setViolations] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    compliance: 'ALL',
    risk: 'ALL',
    status: 'ALL'
  });

  const loadViolations = async () => {
    try {
      const data = await fetchViolations();
      setViolations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Violations Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadViolations();
    const interval = setInterval(loadViolations, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const filteredLogs = violations.filter(v => {
    // Basic mapping for filters
    const severity = v.severity >= 80 ? 'HIGH' : (v.severity >= 40 ? 'MEDIUM' : 'LOW');
    const matchRisk = filters.risk === 'ALL' || severity === filters.risk;
    const matchStatus = filters.status === 'ALL' || v.status.toUpperCase() === filters.status;
    return matchRisk && matchStatus;
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8 pt-8 bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 uppercase">
            <ShieldAlert className="h-8 w-8 text-rose-500" />
            Live Violations Control
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Real-time feed of detected security violations and policy breaches across all AI channels.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-[#0d1424] border border-[#1e293b] px-6 py-2.5 text-xs font-black text-white hover:bg-white/5 transition-all uppercase tracking-widest shadow-2xl">
          <Download className="h-4 w-4 text-cyan-400" /> Export CSV Report
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0d1424] p-6 rounded-2xl border border-[#1e293b] shadow-xl">
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Regulatory Framework</label>
            <select 
              value={filters.compliance}
              onChange={(e) => setFilters(f => ({ ...f, compliance: e.target.value }))}
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
               <option value="ALL">All Frameworks</option>
               <option value="GDPR">GDPR</option>
               <option value="HIPAA">HIPAA</option>
               <option value="DPDP">DPDP</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Risk Severity</label>
            <select 
              value={filters.risk}
              onChange={(e) => setFilters(f => ({ ...f, risk: e.target.value }))}
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
               <option value="ALL">All Levels</option>
               <option value="LOW">Low Risk</option>
               <option value="MEDIUM">Medium Risk</option>
               <option value="HIGH">High Risk</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Action Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
               <option value="ALL">All Actions</option>
               <option value="ALLOWED">Allowed</option>
               <option value="BLOCKED">Blocked</option>
            </select>
         </div>
      </div>

      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing Violations...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="pt-12">
            <EmptyState 
              icon={ShieldCheck} 
              title="No active violations" 
              description="Your system is secure. No violations found matching your current filters." 
              className="max-w-2xl mx-auto"
            />
          </div>
        ) : (
          <ActivityFeed 
            events={filteredLogs.map(v => ({
              id: v.id,
              agent: v.agent_id,
              action: v.action,
              status: (v.status.toLowerCase() === 'blocked' ? 'blocked' : 'allowed') as 'allowed' | 'blocked',
              risk: (v.severity >= 80 ? 'high' : (v.severity >= 40 ? 'medium' : 'low')) as 'low' | 'medium' | 'high',
              timestamp: new Date(v.created_at).toLocaleString(),
              reason: v.details,
              impact: v.metadata?.impact || 'High risk interaction',
              compliance: v.metadata?.compliance || [],
              explanation: v.prompt_excerpt,
              isPendingApproval: v.status === 'PENDING'
            }))} 
            onReplay={() => {}} 
          />
        )}
      </div>
    </div>
  );
}
