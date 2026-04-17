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
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-4">
        <div>
          <nav className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Control Layer <span className="mx-1 text-slate-300">/</span> Governance <span className="mx-1 text-slate-300">/</span> Activity Logs
          </nav>
          <h1 className="mt-1.5 text-3xl font-black tracking-tighter text-slate-950 flex items-center gap-2">
            <Activity className="h-7 w-7 text-indigo-600" />
            AI Activity Control
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Real-time monitoring of AI agent actions and automated policy enforcement.
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-3 flex items-center gap-3 shadow-sm">
            <XCircle className="h-5 w-5 text-rose-600" />
            <div>
              <p className="text-[10px] uppercase font-black text-rose-600 leading-none tracking-widest">Blocked</p>
              <p className="text-2xl font-black text-rose-950 mt-1">{blockedCount}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-[10px] uppercase font-black text-amber-600 leading-none tracking-widest">High Risk</p>
              <p className="text-2xl font-black text-amber-950 mt-1">{highRiskCount}</p>
            </div>
          </div>
        </div>
      </div>

      <SurfaceCard 
        title="Audit-Ready Activity Trail" 
        description="Every action requested by AI agents is intercepted and validated against your defined policies. Use this trail for compliance reporting."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest">
            <Download className="h-3.5 w-3.5" /> Export History
          </button>
        }
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
               <tr>
                 <th className="px-6 py-4">Status & Reason</th>
                 <th className="px-6 py-4">AI Agent</th>
                 <th className="px-6 py-4">Business Impact</th>
                 <th className="px-6 py-4">Compliance</th>
                 <th className="px-6 py-4">Risk</th>
                 <th className="px-6 py-4 text-right">Timestamp</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {loading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex justify-center mb-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    </div>
                    Syncing control logs...
                  </td></tr>
               ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 text-center text-slate-400">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium text-slate-600">No AI activity recorded yet</p>
                    <p className="text-xs mt-1 font-medium">Integration with the Sentra SDK will populate this trail automatically.</p>
                  </td></tr>
               ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${log.status === 'blocked' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {log.status === 'blocked' ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className={`font-black uppercase text-[10px] tracking-widest ${log.status === 'blocked' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {log.status}
                          </p>
                          <p className="text-[11px] text-slate-900 font-bold truncate max-w-[150px]">
                            {log.action}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 uppercase text-xs tracking-tight">{log.agent_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-[200px]">
                        {log.status === 'blocked' ? (log.impact || 'Prevented potential data breach') : 'Action authorized'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {log.compliance && log.compliance.length > 0 ? (
                          log.compliance.map(tag => (
                            <span key={tag} className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-200/50">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">General</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge 
                        label={log.risk_score.toUpperCase()} 
                        tone={log.risk_score === 'high' ? 'danger' : log.risk_score === 'medium' ? 'warning' : 'success'} 
                      />
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-[11px] text-slate-400 tabular-nums">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Sentra AI Governance Log v2.0 • Audit-Ready Trail
          </p>
          <div className="flex gap-1.5 items-center">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Feed Active</span>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
