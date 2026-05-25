import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  FileText,
  History,
  X,
  Share,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Edit2,
  Paperclip,
  Check
} from 'lucide-react';
import { useState, useEffect } from 'react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useStore } from '@/store/useStore';
import { ShareModal } from '@/components/shared/ShareModal';
import { useEuAiAct } from '@/hooks/useEuAiAct';
import { uploadEuAiActEvidence, fetchAuditLogs, AuditLog } from '@/lib/api';

export default function Compliance() {
  const { addToast } = useStore();
  const { overview, stats, isLoading, error, updateImplementation } = useEuAiAct();
  
  const [selectedControl, setSelectedControl] = useState<any | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);
  
  // Slide-out panel form states
  const [editStatus, setEditStatus] = useState<string>('NOT_STARTED');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editOwner, setEditOwner] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  
  // Evidence upload form states
  const [evidenceType, setEvidenceType] = useState<string>('link');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceDesc, setEvidenceDesc] = useState<string>('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [isSavingControl, setIsSavingControl] = useState(false);

  // Fetch real audit logs on mount
  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const logs = await fetchAuditLogs();
        setAuditLogsList(logs || []);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      }
    }
    loadAuditLogs();
  }, [overview]); // Reload logs when implementations change

  // Sync form states when control is selected
  useEffect(() => {
    if (selectedControl) {
      const impl = selectedControl.implementation;
      setEditStatus(impl?.status || 'NOT_STARTED');
      setEditNotes(impl?.notes || '');
      setEditOwner(impl?.owner_user_id || '');
      
      if (impl?.due_date) {
        setEditDueDate(new Date(impl.due_date).toISOString().split('T')[0]);
      } else {
        setEditDueDate('');
      }
      
      // Reset evidence fields
      setEvidenceUrl('');
      setEvidenceDesc('');
    }
  }, [selectedControl]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading compliance hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-rose-500 animate-bounce" />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Error Loading Compliance Page</h3>
        <p className="text-xs text-gray-400 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold text-white uppercase hover:bg-indigo-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const summary = overview?.summary || {
    total_controls: 0,
    implemented: 0,
    in_progress: 0,
    not_started: 0,
    not_applicable: 0,
    compliance_score: 0
  };

  const articles = overview?.articles || [];

  // Parse Violation backlogs from stats
  const breakdown = stats?.breakdown || { GDPR: 0, HIPAA: 0, DPDP: 0 };
  const violationData = [
    { name: 'GDPR', value: breakdown.GDPR, color: '#EF4444' },
    { name: 'HIPAA', value: breakdown.HIPAA, color: '#F59E0B' },
    { name: 'DPDP', value: breakdown.DPDP, color: '#3B82F6' }
  ].filter(v => v.value > 0);

  const totalViolations = stats?.totalViolations || 0;

  const handleSaveControl = async () => {
    if (!selectedControl) return;
    setIsSavingControl(true);
    try {
      await updateImplementation(selectedControl.control_code, {
        status: editStatus,
        notes: editNotes,
        owner_user_id: editOwner,
        due_date: editDueDate ? editDueDate : null
      });

      // Find the updated control in local state and update it
      const updatedControl = {
        ...selectedControl,
        implementation: {
          ...selectedControl.implementation,
          status: editStatus,
          notes: editNotes,
          owner_user_id: editOwner,
          due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
          last_reviewed: new Date().toISOString()
        }
      };

      setSelectedControl(updatedControl);
      addToast({ message: `Successfully updated ${selectedControl.control_code}`, type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update control', type: 'error' });
    } finally {
      setIsSavingControl(false);
    }
  };

  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedControl) return;
    if (!evidenceUrl.trim()) {
      addToast({ message: 'Evidence source / link is required', type: 'warning' });
      return;
    }

    setIsSubmittingEvidence(true);
    try {
      await uploadEuAiActEvidence(selectedControl.control_code, {
        type: evidenceType,
        url: evidenceUrl,
        description: evidenceDesc
      });

      // Update local state to show newly attached evidence immediately
      const newEv = {
        type: evidenceType,
        url: evidenceUrl,
        description: evidenceDesc,
        uploaded_at: new Date().toISOString()
      };

      const existingEvidence = selectedControl.implementation?.evidence_links || [];
      const updatedControl = {
        ...selectedControl,
        implementation: {
          ...selectedControl.implementation,
          evidence_links: [...existingEvidence, newEv]
        }
      };

      setSelectedControl(updatedControl);
      setEvidenceUrl('');
      setEvidenceDesc('');
      addToast({ message: 'Evidence attached successfully', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to upload evidence', type: 'error' });
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'NOT_APPLICABLE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'NOT_STARTED':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Compliance & Audit</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            EU AI Act Control Hierarchy & Actionable Tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95"
          >
            <Share className="h-4 w-4 text-indigo-400" />
            Share
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Aggregate Score" 
          value={`${summary.compliance_score}%`} 
          icon="compliance" 
          status={summary.compliance_score >= 80 ? 'success' : summary.compliance_score >= 50 ? 'warning' : 'danger'} 
        />
        <KPICard 
          label="Implemented" 
          value={summary.implemented} 
          icon="systems" 
          status="success" 
        />
        <KPICard 
          label="In Progress" 
          value={summary.in_progress} 
          icon="compliance" 
          status="warning" 
        />
        <KPICard 
          label="Not Started" 
          value={summary.not_started} 
          icon="risks" 
          status="primary" 
        />
      </div>

      {/* Framework accordion & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* EU AI Act Articles Accordion */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="card-base p-6 bg-gradient-to-r from-indigo-950/20 to-black/10 border-indigo-500/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Standard</span>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">EU AI Act (Control Hierarchy)</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400">Total Controls: {summary.total_controls}</span>
                <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${summary.compliance_score}%` }} 
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Maintain regulatory compliance mapping to the European Union Artificial Intelligence Act. Drill down into specific articles, review operational expectations, assign ownership, and submit evidentiary proofs.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {articles.map((art) => {
              const isOpen = openArticle === art.article_number;
              const completedInArticle = art.controls.filter(c => c.implementation?.status === 'IMPLEMENTED').length;
              const totalInArticle = art.controls.length;

              return (
                <div 
                  key={art.article_number} 
                  className={cn(
                    "card-base overflow-hidden border transition-all duration-300",
                    isOpen ? "border-indigo-500/30 shadow-indigo-950/10 shadow-md bg-zinc-900/40" : "border-[var(--border-default)] hover:border-zinc-700 bg-zinc-950/20"
                  )}
                >
                  {/* Accordion Trigger */}
                  <button
                    onClick={() => setOpenArticle(isOpen ? null : art.article_number)}
                    className="w-full flex items-center justify-between p-5 text-left outline-none"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center border font-bold text-xs uppercase tracking-tight",
                        art.risk_tier === 'PROHIBITED' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        art.risk_tier === 'HIGH_RISK' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      )}>
                        {art.article_number.replace('Art. ', '')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-[12px] font-black text-white uppercase tracking-tight">{art.title}</h4>
                          <span className={cn(
                            "text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase",
                            art.risk_tier === 'PROHIBITED' ? "bg-rose-950/20 text-rose-400 border-rose-500/10" :
                            art.risk_tier === 'HIGH_RISK' ? "bg-amber-950/20 text-amber-400 border-amber-500/10" :
                            "bg-indigo-950/20 text-indigo-400 border-indigo-500/10"
                          )}>
                            {art.risk_tier.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide leading-tight">{art.chapter}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded uppercase tracking-tighter">
                        {completedInArticle} / {totalInArticle} Done
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="border-t border-[var(--border-default)] bg-black/10 divide-y divide-zinc-900">
                      {art.controls.map((c) => {
                        const status = c.implementation?.status || 'NOT_STARTED';
                        const evidenceCount = c.implementation?.evidence_links?.length || 0;

                        return (
                          <div 
                            key={c.control_code}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/5 transition"
                          >
                            <div className="flex-1 text-left min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-indigo-400 tracking-tight">{c.control_code}</span>
                                <h5 className="text-[12px] font-bold text-white uppercase tracking-tight truncate">{c.title}</h5>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed truncate">{c.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              {evidenceCount > 0 && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-300 bg-indigo-950/20 border border-indigo-500/10 px-2 py-0.5 rounded">
                                  <Paperclip className="h-3 w-3" />
                                  {evidenceCount} Evidence
                                </span>
                              )}
                              
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tight",
                                getStatusColor(status)
                              )}>
                                {status.replace('_', ' ')}
                              </span>

                              <button
                                onClick={() => setSelectedControl(c)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 rounded text-[9px] font-black text-white uppercase hover:bg-zinc-800 transition active:scale-95"
                              >
                                <Edit2 className="h-2.5 w-2.5 text-indigo-400" />
                                Update
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Backlog distribution & Incident Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Pie Chart Backlog */}
          <div className="card-base p-6">
            <h3 className="text-[var(--text-md)] font-black text-[var(--text-primary)] mb-4 uppercase tracking-tight">Active Backlog</h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6">Cross-Framework Violations</p>
            
            {violationData.length > 0 ? (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={violationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {violationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#09090b', 
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '10px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {violationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-white">{item.value} Incident{item.value > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Backlog Clean</p>
                <p className="text-[9px] text-gray-400 mt-1">No active compliance violations recorded.</p>
              </div>
            )}
          </div>

          {/* Quick Stats overview */}
          <div className="card-base p-6 bg-gradient-to-br from-zinc-950 to-indigo-950/10">
            <h3 className="text-sm font-black text-white uppercase tracking-tight mb-4">Integrations Scope</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <span className="text-xs text-gray-400">Total Violations</span>
                <span className="text-xs font-black text-white">{totalViolations}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <span className="text-xs text-gray-400">Not Applicable Controls</span>
                <span className="text-xs font-black text-blue-400">{summary.not_applicable}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <span className="text-xs text-gray-400">In Progress Audits</span>
                <span className="text-xs font-black text-amber-400">{summary.in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">System Mode</span>
                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Autonomous
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Audit Log Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-black/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">Governance Audit Log</h3>
          </div>
          <button 
            onClick={() => addToast({ message: 'Generating full compliance audit dump...', type: 'info' })}
            className="text-[var(--text-xs)] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center gap-2"
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
              {auditLogsList.length > 0 ? auditLogsList.slice(0, 8).map((log) => (
                <tr key={log.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--lavender)] font-medium">{(log as any).user?.email || log.user_id}</span>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-xs)]">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)] font-bold uppercase tracking-tighter">
                      {(log as any).user?.role || 'USER'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Success
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => addToast({ message: 'Viewing audit certificate file...', type: 'info' })}
                      className="text-[var(--text-xs)] font-bold text-indigo-400 hover:text-white transition-colors"
                    >
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

      {/* Control Configuration Slide-out Drawer */}
      {selectedControl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          {/* Backdrop closer */}
          <div className="flex-1" onClick={() => setSelectedControl(null)} />
          
          {/* Drawer Body */}
          <div className="w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full animate-slide-in text-left">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block">Control Safeguard Detail</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedControl.control_code}</h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedControl(null)}
                className="p-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Title & Description */}
              <div className="space-y-2 bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl">
                <h4 className="text-xs font-black text-white uppercase tracking-tight">{selectedControl.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{selectedControl.description}</p>
              </div>

              {/* Required Evidence Checklist */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Required Evidentiary Filings</h5>
                <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10">
                  {selectedControl.evidence_required.map((ev: string, idx: number) => (
                    <div key={idx} className="p-3 text-xs text-gray-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                      {ev}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Implementation Checklist */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Operational Checklist</h5>
                <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10">
                  {selectedControl.checklist_items.map((item: string, idx: number) => (
                    <div key={idx} className="p-3 text-xs text-gray-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="h-4 w-4 rounded border border-zinc-800 flex items-center justify-center bg-zinc-900 mt-0.5 flex-shrink-0">
                        {editStatus === 'IMPLEMENTED' ? <Check className="h-3 w-3 text-emerald-400" /> : <span className="text-[9px] text-zinc-700">{idx+1}</span>}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Implementation Fields */}
              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Compliance Status configuration</h5>
                
                {/* Status Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">safeguard Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                {/* Owner and Due Date Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <User className="h-3 w-3 text-zinc-500" /> Owner User
                    </label>
                    <input
                      type="text"
                      value={editOwner}
                      placeholder="e.g. user_id or email"
                      onChange={(e) => setEditOwner(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-500" /> Due Date
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Implementation Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">safeguard Notes</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    placeholder="Enter details on control actions, implementation steps, or exemptions justifications..."
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>

                {/* Save configuration button */}
                <button
                  onClick={handleSaveControl}
                  disabled={isSavingControl}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-xs font-black text-white uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2"
                >
                  {isSavingControl ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-white" />
                      Saving changes...
                    </>
                  ) : (
                    'Save safeguarding status'
                  )}
                </button>
              </div>

              {/* Attach Evidentiary Files / Links */}
              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Evidence filings</h5>
                
                {/* List Existing Evidence Links */}
                {(selectedControl.implementation?.evidence_links || []).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Attached Evidence Links</p>
                    <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl divide-y divide-zinc-900 overflow-hidden">
                      {(selectedControl.implementation?.evidence_links || []).map((ev: any, idx: number) => (
                        <div key={idx} className="p-3 text-xs flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 rounded uppercase">
                                {ev.type}
                              </span>
                              <span className="text-[10px] font-bold text-white truncate max-w-[200px]">{ev.description || 'Evidentiary Filing'}</span>
                            </div>
                            <a 
                              href={ev.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-zinc-500 hover:text-indigo-400 hover:underline truncate block"
                            >
                              {ev.url}
                            </a>
                          </div>
                          <span className="text-[8px] font-semibold text-zinc-600 text-right uppercase">
                            {ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-900 py-6 text-center text-zinc-600 text-xs rounded-xl uppercase tracking-tighter">
                    No evidence files uploaded.
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleAttachEvidence} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 space-y-3.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">Upload New Evidence</p>
                  
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-[9px] font-bold text-gray-400 uppercase col-span-1">Evidence Type</label>
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded-lg p-2 outline-none focus:border-indigo-500/50 col-span-2"
                    >
                      <option value="link">URL / LINK</option>
                      <option value="document">DOCUMENT DEPLOYMENT</option>
                      <option value="audit">AUDIT REPORT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Filing Location URL (e.g. https://...)"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="Brief Description of Evidence File"
                      value={evidenceDesc}
                      onChange={(e) => setEvidenceDesc(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEvidence}
                    className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 text-white hover:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition disabled:text-zinc-700 flex items-center justify-center gap-2"
                  >
                    {isSubmittingEvidence ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-white" />
                        Uploading evidence...
                      </>
                    ) : (
                      'Attach Evidentiary Link'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        resourceType="compliance"
        resourceId={null}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
