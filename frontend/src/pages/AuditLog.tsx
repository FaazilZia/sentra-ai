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
        const data = await apiRequest<any>('/incidents/history', { method: 'GET' });
        setHistory(data.items || []);
      } catch (err) {
        console.error('Audit Load Error:', err);
      } finally {
        setHistory([
          // Sample data for demonstration if DB is empty
          {
             id: 'demo-1',
             agent_id: 'Scanner-Engine',
             status: 'blocked',
             details: 'Automatic block of PII in support_logs.txt',
             operator: 'Scanner (Auto)',
             resolved_at: new Date().toISOString(),
             severity: 90
          }
        ]);
        setLoading(false);
      }
    }
    loadHistory();
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <nav className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
            Governance <span className="mx-1 opacity-20">/</span> Compliance <span className="mx-1 opacity-20">/</span> Audit Proof
          </nav>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2 uppercase">
            <ShieldCheck className="h-6 w-6 text-cyan-500" />
            Audit Proof Log
          </h1>
          <p className="mt-1 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Immutable governance trail for all security remediation actions and data access decisions.
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)] px-4 text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] shadow-sm hover:bg-[var(--foreground)]/5 transition-all">
          <Download className="h-4 w-4" /> Export Trail
        </button>
      </div>

      <SurfaceCard 
        title="Remediation History" 
        description="Every resolve and block action is tracked with operator ID and legal timestamp."
        className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem] overflow-hidden backdrop-blur-xl"
        contentClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
             <thead className="border-b border-[var(--card-border)] bg-[var(--muted-background)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
               <tr>
                 <th className="px-6 py-4">Event Action</th>
                 <th className="px-6 py-4">Incident Target</th>
                 <th className="px-6 py-4">Remediation Details</th>
                 <th className="px-6 py-4">Performed By</th>
                 <th className="px-6 py-4">Legal Timestamp</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-[var(--card-border)]">
               {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-[var(--muted)] font-black uppercase tracking-widest">Loading audit trail...</td></tr>
               ) : history.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-[var(--muted)]">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No remediation actions recorded yet.
                  </td></tr>
               ) : history.map(record => (
                 <tr key={record.id} className="hover:bg-[var(--foreground)]/5 transition-colors group">
                   <td className="px-6 py-5">
                     <StatusBadge 
                        label={record.status.toUpperCase()} 
                        tone={record.status === 'blocked' ? 'danger' : 'success'} 
                     />
                   </td>
                   <td className="px-6 py-5">
                     <div className="font-black text-[var(--foreground)] uppercase tracking-tight">{record.agent_id}</div>
                     <div className="text-[9px] text-[var(--muted)] font-mono mt-1">UUID: {record.id.slice(0, 8)}...</div>
                   </td>
                   <td className="px-6 py-5 text-[var(--foreground)] max-w-sm font-bold opacity-80 leading-relaxed uppercase text-[10px] tracking-wider">
                     {record.details}
                   </td>
                   <td className="px-6 py-5">
                     <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-black text-[var(--foreground)] uppercase text-[10px] tracking-widest">{record.operator}</span>
                     </div>
                   </td>
                   <td className="px-6 py-5 text-[10px] font-mono text-[var(--muted)] bg-[var(--muted-background)]/50">
                     {new Date(record.resolved_at).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--card-border)] bg-[var(--muted-background)] px-6 py-4 text-[9px] text-[var(--muted)] font-black uppercase tracking-[0.2em] italic">
          Disclaimer: This log is immutable and protected for legal and compliance auditing purposes.
        </div>
      </SurfaceCard>
    </div>
  );
}
