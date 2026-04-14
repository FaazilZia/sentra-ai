import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { User, Download, ShieldCheck, History } from 'lucide-react';

interface AuditRecord {
  id: string;
  agent_id: string;
  status: string;
  details: string;
  operator: string;
  resolved_at: string;
  severity: number;
}

export default function AuditLog() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!accessToken) return;
      try {
        const data = await apiRequest<{ items: AuditRecord[] }>('/incidents/history', {
          method: 'GET',
        });
        setHistory(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error('Audit Load Error:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-[10px] font-medium text-slate-500">
            Governance <span className="mx-1 text-slate-300">/</span> Compliance <span className="mx-1 text-slate-300">/</span> Audit Proof
          </nav>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Audit Proof Log
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Immutable governance trail for all security remediation actions and data access decisions.
          </p>
        </div>
        <button className="inline-flex h-8 items-center gap-2 rounded-md bg-white border border-slate-200 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
          <Download className="h-3.5 w-3.5" /> Export Trail
        </button>
      </div>

      <SurfaceCard 
        title="Remediation History" 
        description="Every resolve and block action is tracked with operator ID and legal timestamp."
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
             <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
               <tr>
                 <th className="px-4 py-3">Event Action</th>
                 <th className="px-4 py-3">Incident Target</th>
                 <th className="px-4 py-3">Remediation Details</th>
                 <th className="px-4 py-3">Performed By</th>
                 <th className="px-4 py-3">Legal Timestamp</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading audit trail...</td></tr>
               ) : history.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No remediation actions recorded yet.
                  </td></tr>
               ) : history.map(record => (
                 <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-4 py-4">
                     <StatusBadge 
                        label={record.status.toUpperCase()} 
                        tone={record.status === 'blocked' ? 'danger' : 'success'} 
                     />
                   </td>
                   <td className="px-4 py-4">
                     <div className="font-bold text-slate-900">{record.agent_id}</div>
                     <div className="text-[9px] text-slate-400 font-mono mt-0.5">UUID: {record.id.slice(0, 8)}...</div>
                   </td>
                   <td className="px-4 py-4 text-slate-600 max-w-sm font-medium">
                     {record.details}
                   </td>
                   <td className="px-4 py-4">
                     <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="font-semibold text-slate-700">{record.operator}</span>
                     </div>
                   </td>
                   <td className="px-4 py-4 text-[10px] font-mono text-slate-500 bg-slate-50/30">
                     {new Date(record.resolved_at).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[9px] text-slate-400 font-medium italic">
          Disclaimer: This log is immutable and protected for legal and compliance auditing purposes under DPDP / GDPR frameworks.
        </div>
      </SurfaceCard>
    </div>
  );
}
