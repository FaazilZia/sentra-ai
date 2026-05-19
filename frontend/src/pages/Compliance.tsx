import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  FileText,
  History,
  ArrowRight,
  Plus
} from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useStore } from '@/store/useStore';

const frameworkData: any[] = [
  {
    name: 'GDPR Compliance',
    status: 'Healthy',
    lastAudit: '2026-05-18',
    controls: '18 / 20',
    progress: 90
  },
  {
    name: 'HIPAA Security',
    status: 'Warning',
    lastAudit: '2026-05-15',
    controls: '12 / 15',
    progress: 80
  },
  {
    name: 'DPDP Act (India)',
    status: 'Healthy',
    lastAudit: '2026-05-19',
    controls: '8 / 10',
    progress: 80
  }
];

const auditLogs: any[] = [
  {
    id: '1',
    event: 'Access Policy Modification',
    user: 'admin@sentra.ai',
    role: 'ADMIN',
    time: '10 mins ago',
    status: 'Approved'
  },
  {
    id: '2',
    event: 'Credential Rotation Audit',
    user: 'sdk@sentra-production.com',
    role: 'SERVICE_AGENT',
    time: '1 hour ago',
    status: 'Completed'
  },
  {
    id: '3',
    event: 'Data Export Request',
    user: 'auditor@sentra.ai',
    role: 'AUDITOR',
    time: '2 hours ago',
    status: 'Flagged'
  }
];

const violationData: any[] = [
  { name: 'GDPR', value: 4, color: '#EF4444' },
  { name: 'HIPAA', value: 2, color: '#F59E0B' },
  { name: 'DPDP', value: 1, color: '#3B82F6' }
];

export default function Compliance() {
  const { addToast, openModal } = useStore();

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Compliance & Audit</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Governance Frameworks & Regulatory Tracking
          </p>
        </div>
        <button 
          onClick={() => openModal('ADD_FRAMEWORK')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Framework
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Aggregate Compliance" 
          value="0%" 
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Active Violations" 
          value="0" 
          icon="risks" 
          status="danger" 
        />
        <KPICard 
          label="Pending Audits" 
          value="0" 
          icon="compliance" 
          status="warning" 
        />
        <KPICard 
          label="Control Coverage" 
          value="0" 
          icon="systems" 
          status="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Framework Status Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {frameworkData.length > 0 ? frameworkData.map((fw) => (
            <div 
              key={fw.name} 
              onClick={() => addToast({ message: `Accessing ${fw.name} controls...`, type: 'info' })}
              className="card-base p-5 group hover:border-[var(--royal-indigo)] transition-all cursor-pointer relative overflow-hidden"
            >
              {/* ... existing card content ... */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--bg-page)] flex items-center justify-center">
                    <ShieldCheck className={cn(
                      "h-5 w-5",
                      fw.status === 'Healthy' ? "text-emerald-400" :
                      fw.status === 'Warning' ? "text-amber-400" : "text-rose-500"
                    )} />
                  </div>
                  <div>
                    <h4 className="text-[var(--text-sm)] font-black text-[var(--text-primary)] uppercase tracking-tight">{fw.name}</h4>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Last Audit: {fw.lastAudit}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                  fw.status === 'Healthy' ? "bg-emerald-500/10 text-emerald-400" :
                  fw.status === 'Warning' ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-500"
                )}>
                  {fw.status}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-[var(--text-secondary)]">Controls Implemented</span>
                  <span className="text-[var(--text-primary)]">{fw.controls}</span>
                </div>
                <div className="h-1 bg-[var(--bg-page)] rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      fw.progress > 80 ? "bg-emerald-500" :
                      fw.progress > 60 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${fw.progress}%` }}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )) : (
            <div className="col-span-full border-2 border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-12 text-[var(--text-muted)]">
              <ShieldCheck className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No active frameworks</p>
            </div>
          )}
        </div>

        {/* Violation Distribution */}
        <div className="lg:col-span-4 card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] mb-6 uppercase tracking-tight">Violation Backlog</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(violationData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '10px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {(violationData || []).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-black/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--royal-indigo)]" />
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">Governance Audit Log</h3>
          </div>
          <button 
            onClick={() => addToast({ message: 'Generating full compliance audit dump...', type: 'info' })}
            className="text-[var(--text-xs)] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--royal-indigo)] transition-colors flex items-center gap-2"
          >
            <FileText className="h-3.5 w-3.5" />
            Full Audit History
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-4">Audit Event</th>
                <th className="px-6 py-4">Subject / User</th>
                <th className="px-6 py-4">Entity Role</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {auditLogs.length > 0 ? auditLogs.map((log) => (
                <tr key={log.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{log.event}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--lavender)] font-medium">{log.user}</span>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-xs)]">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)] font-bold uppercase tracking-tighter">
                      {log.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{log.time}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      log.status === 'Approved' ? "text-emerald-400" :
                      log.status === 'Completed' ? "text-blue-400" :
                      log.status === 'Flagged' ? "text-amber-400" :
                      log.status === 'Draft' ? "text-slate-400" : "text-rose-500"
                    )}>
                      {log.status === 'Approved' && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {log.status === 'Flagged' && <AlertCircle className="h-2.5 w-2.5" />}
                      {log.status === 'Draft' && <Clock className="h-2.5 w-2.5" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[var(--text-xs)] font-bold text-[var(--royal-indigo)] hover:text-white transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <History className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No audit logs found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
