import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { User, Download, ShieldCheck, History, ChevronLeft, ChevronRight, FileJson } from 'lucide-react';
import { fetchGuardrailLogs, exportGuardrailLogs, InterceptionLog } from '../lib/api';


export default function AuditLog() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState<InterceptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  
  const [filters, setFilters] = useState({
    decision: '',
  });

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchGuardrailLogs({
        page,
        limit: 20,
        ...(filters.decision ? { decision: filters.decision } : {})
      });
      setHistory(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Audit Logs Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadHistory();
  }, [accessToken, page, filters]);

  const handleExportCSV = () => exportGuardrailLogs('csv', filters);
  const handleExportJSON = () => exportGuardrailLogs('json', filters);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8 pt-8 bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 uppercase">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            AI Audit Ledger
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Immutable governance trail for all agent actions, API calls, and pre-execution validations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportJSON}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg"
          >
            <FileJson className="h-4 w-4 text-emerald-400" /> Export JSON
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl w-fit">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Filter By:</span>
        <select 
          value={filters.decision}
          onChange={(e) => { setFilters({ decision: e.target.value }); setPage(1); }}
          className="bg-[#0a0f1a] border border-slate-800 rounded-xl px-4 py-2 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
            <option value="">All Decisions</option>
            <option value="ALLOW">Allowed</option>
            <option value="BLOCK">Blocked</option>
            <option value="MODIFY">Modified</option>
        </select>
      </div>

      <SurfaceCard 
        title="Interception History" 
        description={`Showing ${history.length} of ${meta.total} records`}
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4">Triggered Policy</th>
                  <th className="px-6 py-4">Action Context</th>
                  <th className="px-6 py-4">Agent/User ID</th>
                  <th className="px-6 py-4 text-right">Timestamp</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/50">
               {loading ? (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
                      <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Ledger...</p>
                    </td>
                  </tr>
               ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16">
                      <EmptyState 
                        icon={History} 
                        title="No audit entries yet" 
                        description="AI interactions will appear here once evaluated by the governance engine." 
                        className="border-none bg-transparent shadow-none"
                      />
                    </td>
                  </tr>
               ) : history.map(record => (
                 <tr key={record.id} className="hover:bg-slate-800/50 transition-colors group">
                   <td className="px-6 py-5">
                     <StatusBadge 
                        label={record.decision} 
                        tone={record.decision === 'BLOCK' ? 'danger' : record.decision === 'ALLOW' ? 'success' : 'warning'} 
                     />
                   </td>
                   <td className="px-6 py-5">
                     <div className="font-semibold text-white">{record.policy_triggered || 'None'}</div>
                     <div className="text-xs text-slate-500 mt-1">{record.reason || 'Safe Evaluation'}</div>
                   </td>
                   <td className="px-6 py-5 text-slate-300 max-w-sm truncate font-mono text-xs">
                     {record.input_text}
                   </td>
                   <td className="px-6 py-5">
                     <div className="flex items-center gap-2 text-slate-400">
                        <User className="h-4 w-4" />
                        <span className="font-mono text-xs">{record.user_id || 'anonymous'}</span>
                     </div>
                   </td>
                   <td className="px-6 py-5 text-xs text-slate-400 text-right whitespace-nowrap">
                     {new Date(record.timestamp).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-slate-800 bg-[#0a0f1a] px-6 py-4 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            Page {page} of {meta.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
