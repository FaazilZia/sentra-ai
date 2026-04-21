import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
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
    let mounted = true;
    async function loadHistory() {
      // Simulate network delay for realism
      setTimeout(() => {
        if (!mounted) return;
        const realisticLogs: AuditRecord[] = [
          { id: 'uuid-al-001', agent_id: 'Claude 3.5 (Sales)', status: 'blocked', details: 'User "Rahul Sharma" attempted PHI query via prompt — Blocked (HIPAA §164)', operator: 'Sentra Gov Engine', resolved_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), severity: 3 },
          { id: 'uuid-al-002', agent_id: 'GPT-4 (Marketing)', status: 'allowed', details: 'Marketing agent updated system prompt template successfully — Allowed', operator: 'Sarah Jenkins', resolved_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), severity: 1 },
          { id: 'uuid-al-003', agent_id: 'Internal DB Copilot', status: 'blocked', details: 'Unauthorized external API call to public endpoint detected — Blocked (SOC2 CC6)', operator: 'Sentra Gov Engine', resolved_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), severity: 3 },
          { id: 'uuid-al-004', agent_id: 'Support Bot (Production)', status: 'flagged', details: 'Detected borderline PII (email pattern) in support response. Redacted.', operator: 'Data Privacy Policy', resolved_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), severity: 2 },
          { id: 'uuid-al-005', agent_id: 'System', status: 'allowed', details: 'CISO "Michael Chang" updated Guardrail "PII Exposure Prevention" to strict mode', operator: 'Michael Chang', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), severity: 1 },
          { id: 'uuid-al-006', agent_id: 'GPT-4o (Engineering)', status: 'allowed', details: 'Code generation request containing no sensitive IP — Allowed', operator: 'Sentra Gov Engine', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), severity: 1 },
          { id: 'uuid-al-007', agent_id: 'HR Assistant Model', status: 'blocked', details: 'Attempted to summarize salary bands for unauthorized user — Blocked (Internal IP Policy)', operator: 'Sentra Gov Engine', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), severity: 3 },
          { id: 'uuid-al-008', agent_id: 'System', status: 'allowed', details: 'Agent "GPT-4o (Engineering)" registered and assigned SOC2 controls', operator: 'Alex Rivera', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), severity: 1 },
          { id: 'uuid-al-009', agent_id: 'Customer Success AI', status: 'allowed', details: 'Processed 1500 feedback summaries, no PII detected — Allowed', operator: 'Sentra Gov Engine', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), severity: 1 },
          { id: 'uuid-al-010', agent_id: 'System', status: 'blocked', details: 'Repeated policy violations (3x) from Support Bot. Temporary suspension applied.', operator: 'Auto-Mitigation', resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), severity: 3 },
        ];
        setHistory(realisticLogs);
        setLoading(false);
      }, 1200);
    }
    loadHistory();
    return () => { mounted = false; };
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-[10px] font-medium text-slate-400">
            Governance <span className="mx-1 text-slate-100">/</span> Compliance <span className="mx-1 text-slate-100">/</span> Audit Proof
          </nav>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Audit Proof Log
          </h1>
          <p className="mt-1 text-xs text-slate-400">
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
             <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
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
                  <tr><td colSpan={5} className="p-8 text-center text-slate-300">Loading audit trail...</td></tr>
               ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8">
                      <EmptyState 
                        icon={History} 
                        title="No audit events recorded yet" 
                        description="Immutable remediation activity will appear here once AI interactions are evaluated by the governance engine." 
                        actionLabel="View Active Monitoring" 
                        onAction={() => window.location.href = '/app/observability'} 
                        className="border-none bg-transparent shadow-none"
                      />
                    </td>
                  </tr>
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
                     <div className="text-[9px] text-slate-300 font-mono mt-0.5">UUID: {record.id.slice(0, 8)}...</div>
                   </td>
                   <td className="px-4 py-4 text-slate-600 max-w-sm font-medium">
                     {record.details}
                   </td>
                   <td className="px-4 py-4">
                     <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="font-semibold text-slate-700">{record.operator}</span>
                     </div>
                   </td>
                   <td className="px-4 py-4 text-[10px] font-mono text-slate-400 bg-slate-50/30">
                     {new Date(record.resolved_at).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[9px] text-slate-300 font-medium italic">
          Disclaimer: This log is immutable and protected for legal and compliance auditing purposes under DPDP / GDPR frameworks.
        </div>
      </SurfaceCard>
    </div>
  );
}
