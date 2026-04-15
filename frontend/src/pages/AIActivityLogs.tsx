import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchAIActivityLogs, AIActivityLog } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Download, ShieldAlert, Bot, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function AIActivityLogs() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AIActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      if (!accessToken) return;
      try {
        const data = await fetchAIActivityLogs();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('AI Activity Logs Load Error:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [accessToken]);

  const blockedCount = logs.filter(l => l.status === 'blocked').length;
  const highRiskCount = logs.filter(l => l.risk_score === 'high').length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
            Control Layer <span className="mx-1 text-slate-300">/</span> Governance <span className="mx-1 text-slate-300">/</span> Activity Logs
          </nav>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <Activity className="h-7 w-7 text-indigo-600" />
            AI Activity Control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time monitoring of AI agent actions and automated policy enforcement.
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-600 leading-none">Blocked</p>
              <p className="text-xl font-bold text-rose-950">{blockedCount}</p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-600 leading-none">High Risk</p>
              <p className="text-xl font-bold text-amber-950">{highRiskCount}</p>
            </div>
          </div>
        </div>
      </div>

      <SurfaceCard 
        title="Agent Activity Trail" 
        description="Every action requested by AI agents is intercepted and validated against your defined policies."
        action={
          <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all">
            <Download className="h-3.5 w-3.5" /> Export History
          </button>
        }
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
               <tr>
                 <th className="px-6 py-4">Status & Decision</th>
                 <th className="px-6 py-4">AI Agent</th>
                 <th className="px-6 py-4">Requested Action</th>
                 <th className="px-6 py-4">Risk Level</th>
                 <th className="px-6 py-4 text-right">Timestamp</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="flex justify-center mb-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    </div>
                    Loading control logs...
                  </td></tr>
               ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 text-center text-slate-400">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium text-slate-600">No AI activity recorded yet</p>
                    <p className="text-xs mt-1">Integration with the Sentra SDK will populate this trail automatically.</p>
                  </td></tr>
               ) : logs.map(log => (
                 <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {log.status === 'blocked' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className={`font-bold uppercase text-[10px] tracking-wider ${log.status === 'blocked' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {log.status === 'blocked' ? 'Blocked' : 'Allowed'}
                          </p>
                          {log.reason && (
                            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                              {log.reason}
                            </p>
                          )}
                        </div>
                      </div>
                   </td>
                   <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                           <Bot className="h-4 w-4" />
                         </div>
                         <span className="font-bold text-slate-900">{log.agent_id}</span>
                      </div>
                   </td>
                   <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 w-fit">
                          {log.action}
                        </code>
                      </div>
                   </td>
                   <td className="px-6 py-5">
                     <StatusBadge 
                        label={log.risk_score.toUpperCase()} 
                        tone={log.risk_score === 'high' ? 'danger' : log.risk_score === 'medium' ? 'warning' : 'success'} 
                     />
                   </td>
                   <td className="px-6 py-5 text-right font-mono text-[11px] text-slate-500 tabular-nums">
                     {new Date(log.created_at).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium italic">
            Sentra AI Governance Log v2.0 • Cryptographically verified trail
          </p>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Live Monitor Active</span>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
