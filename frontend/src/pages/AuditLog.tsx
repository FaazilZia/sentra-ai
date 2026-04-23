import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { User, Download, ShieldCheck, History } from 'lucide-react';
import { fetchAuditLogs, AuditLog as AuditLogType } from '../lib/api';

export default function AuditLog() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    framework: 'ALL',
    severity: 'ALL',
    status: 'ALL'
  });

  const loadHistory = async () => {
    try {
      const data = await fetchAuditLogs();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Audit Logs Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadHistory();
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const filteredHistory = history.filter(log => {
    const meta = log.metadata || {};
    const matchFramework = filters.framework === 'ALL' || meta.framework === filters.framework;
    const matchSeverity = filters.severity === 'ALL' || meta.severity === filters.severity;
    const matchStatus = filters.status === 'ALL' || (meta.status || log.action).toUpperCase() === filters.status;
    return matchFramework && matchSeverity && matchStatus;
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8 pt-8 bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 uppercase">
            <ShieldCheck className="h-8 w-8 text-cyan-400" />
            Audit Proof Log
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Immutable governance trail for all security remediation actions and data access decisions.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[#0d1424] border border-[#1e293b] px-6 py-2.5 text-xs font-black text-white hover:bg-white/5 transition-all uppercase tracking-widest shadow-2xl">
          <Download className="h-4 w-4 text-cyan-400" /> Export Trail
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0d1424] p-6 rounded-2xl border border-[#1e293b] shadow-xl">
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Regulatory Framework</label>
            <select 
              value={filters.framework}
              onChange={(e) => setFilters(f => ({ ...f, framework: e.target.value }))}
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
              value={filters.severity}
              onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
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

      <SurfaceCard 
        title="Remediation History" 
        description="Immutable record of every governance decision and system action."
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
             <thead className="border-b border-white/5 bg-slate-950/30 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
               <tr>
                 <th className="px-6 py-4 text-center">Status</th>
                 <th className="px-6 py-4">Event Context</th>
                 <th className="px-6 py-4">Action Details</th>
                 <th className="px-6 py-4">Operator</th>
                 <th className="px-6 py-4">Timestamp</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
               {loading ? (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mx-auto" />
                      <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Trail...</p>
                    </td>
                  </tr>
               ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16">
                      <EmptyState 
                        icon={History} 
                        title="No audit entries yet" 
                        description="Immutable remediation activity will appear here once AI interactions are evaluated by the governance engine." 
                        className="border-none bg-transparent shadow-none"
                      />
                    </td>
                  </tr>
               ) : filteredHistory.map(record => (
                 <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                   <td className="px-6 py-5 flex justify-center">
                     <StatusBadge 
                        label={(record.metadata?.status || record.action).toUpperCase()} 
                        tone={(record.metadata?.status?.toLowerCase() === 'blocked' || record.action.toLowerCase() === 'blocked') ? 'danger' : 'success'} 
                     />
                   </td>
                   <td className="px-6 py-5">
                     <div className="font-bold text-white uppercase tracking-tighter">{record.metadata?.target || 'System Engine'}</div>
                     <div className="text-[9px] text-slate-500 font-mono mt-1 opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-widest">UID: {record.id.slice(0, 8)}</div>
                   </td>
                   <td className="px-6 py-5 text-slate-300 max-w-sm leading-relaxed">
                     {record.metadata?.details || record.action}
                   </td>
                   <td className="px-6 py-5">
                     <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-white/5 text-slate-400">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-slate-200 text-[10px] uppercase tracking-wider">{record.metadata?.operator || 'Sentra AI'}</span>
                     </div>
                   </td>
                   <td className="px-6 py-5 text-[10px] font-mono text-slate-400 bg-slate-950/20">
                     {new Date(record.timestamp).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-white/5 bg-[#0a0f1a] px-6 py-4 text-[10px] text-slate-500 font-medium italic">
          Disclaimer: This log is immutable and protected for legal and compliance auditing purposes under DPDP / GDPR frameworks.
        </div>
      </SurfaceCard>
    </div>
  );
}
