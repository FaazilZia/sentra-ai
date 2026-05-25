import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  X,
  Share,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Edit2,
  Paperclip,
  Check,
  TrendingUp,
  Award,
  Download,
  AlertTriangle,
  Activity,
  Server,
  Clock,
  ShieldAlert,
  RefreshCw,
  Info
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useStore } from '@/store/useStore';
import { ShareModal } from '@/components/shared/ShareModal';
import { useEuAiAct } from '@/hooks/useEuAiAct';
import { 
  fetchNistAiRmfOverview,
  updateNistAiRmfImplementation,
  fetchNistAiRmfCrossFrameworkImpact,
  fetchNistAiRmfHealth,
  exportNistAiRmfSignedConformity
} from '@/lib/api';

export default function Compliance() {
  const { addToast } = useStore();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'eu-ai-act' | 'nist-ai-rmf'>('eu-ai-act');
  const [isShareOpen, setIsShareOpen] = useState(false);

  // ==========================================
  // EU AI ACT STATES
  // ==========================================
  const { overview, stats, isLoading, error, updateImplementation } = useEuAiAct();
  const [selectedControl, setSelectedControl] = useState<any | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  
  // EU AI Act Slide-out panel form states
  const [editStatus, setEditStatus] = useState<string>('NOT_STARTED');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editOwner, setEditOwner] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  
  // EU AI Act Evidence upload form states
  const [isSavingControl, setIsSavingControl] = useState(false);

  // ==========================================
  // NIST AI RMF STATES & FETCHERS
  // ==========================================
  const [nistOverview, setNistOverview] = useState<any | null>(null);
  const [nistHealth, setNistHealth] = useState<any | null>(null);
  const [nistIsLoading, setNistIsLoading] = useState(true);
  const [nistIsSeeding, setNistIsSeeding] = useState(false);
  const [nistError, setNistError] = useState<string | null>(null);
  
  // NIST active control drawer state
  const [selectedNistSub, setSelectedNistSub] = useState<any | null>(null);
  const [nistCrossImpact, setNistCrossImpact] = useState<any[]>([]);
  const [isLoadingCrossImpact, setIsLoadingCrossImpact] = useState(false);

  // NIST Slide-out edit states
  const [editNistStatus, setEditNistStatus] = useState<string>('NOT_STARTED');
  const [editNistMaturity, setEditNistMaturity] = useState<number>(1);
  const [editNistEscalation, setEditNistEscalation] = useState<string>('NORMAL');
  const [editNistNotes, setEditNistNotes] = useState<string>('');
  const [isSavingNist, setIsSavingNist] = useState(false);
  const [isExportingConformity, setIsExportingConformity] = useState(false);

  // Load NIST AI RMF Core Dashboard Data
  const loadNistData = useCallback(async (showSilence = false) => {
    if (!showSilence) setNistIsLoading(true);
    try {
      const [overviewData, healthData] = await Promise.all([
        fetchNistAiRmfOverview(),
        fetchNistAiRmfHealth().catch(() => null)
      ]);
      
      setNistOverview(overviewData);
      setNistHealth(healthData);
      setNistIsSeeding(false);
      setNistError(null);
    } catch (err: any) {
      if (err.status === 503 || (err.message && err.message.includes('initialized'))) {
        setNistIsSeeding(true);
      } else {
        setNistError(err.message || 'Failed to connect to NIST scoring service');
      }
    } finally {
      setNistIsLoading(false);
    }
  }, []);



  useEffect(() => {
    if (activeTab === 'nist-ai-rmf') {
      loadNistData();
    }
  }, [activeTab, loadNistData]);

  // Sync EU AI Act drawer fields
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
    }
  }, [selectedControl]);

  // Sync NIST drawer fields & load cross-framework impact panel mappings
  useEffect(() => {
    if (selectedNistSub) {
      const impl = selectedNistSub.implementation;
      setEditNistStatus(impl?.status || 'NOT_STARTED');
      setEditNistMaturity(impl?.maturity_level || 1);
      setEditNistEscalation(impl?.risk_escalation_level || 'NORMAL');
      setEditNistNotes(impl?.notes || '');

      // Load cross-framework mappings concurrently
      setIsLoadingCrossImpact(true);
      fetchNistAiRmfCrossFrameworkImpact(selectedNistSub.subcategory_code)
        .then(res => {
          setNistCrossImpact(res?.mappings || []);
        })
        .catch(err => {
          console.error('Failed to fetch cross framework mappings:', err);
          setNistCrossImpact([]);
        })
        .finally(() => {
          setIsLoadingCrossImpact(false);
        });
    }
  }, [selectedNistSub]);

  // ==========================================
  // EU AI ACT HANDLERS
  // ==========================================
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



  // ==========================================
  // NIST AI RMF HANDLERS
  // ==========================================
  const handleSaveNistControl = async () => {
    if (!selectedNistSub) return;
    setIsSavingNist(true);
    try {
      await updateNistAiRmfImplementation(selectedNistSub.subcategory_code, {
        status: editNistStatus,
        maturity_level: editNistMaturity,
        risk_escalation_level: editNistEscalation,
        notes: editNistNotes
      });

      addToast({ message: `Successfully updated NIST RMF ${selectedNistSub.subcategory_code}`, type: 'success' });
      
      // Close drawer & reload state silenly
      setSelectedNistSub(null);
      await loadNistData(true);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save subcategory', type: 'error' });
    } finally {
      setIsSavingNist(false);
    }
  };

  const handleExportConformity = async () => {
    setIsExportingConformity(true);
    addToast({ message: 'Executing cryptographic conformity audit scans...', type: 'info' });
    try {
      const res = await exportNistAiRmfSignedConformity();
      
      if (res?.integrity_check?.all_signatures_valid) {
        addToast({ message: 'Conformity verified! All signature signatures match.', type: 'success' });
      } else {
        addToast({ message: `Signature discrepancy found on ${res?.integrity_check?.corrupted_record_count} evidence records!`, type: 'warning' });
      }

      // Download conformant package JSON file
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sentra-rmf-conformity-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      addToast({ message: err.message || 'Audit export failed', type: 'error' });
    } finally {
      setIsExportingConformity(false);
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

  const getNistReasonIcon = (type: string) => {
    switch (type) {
      case 'decay':
        return <Clock className="h-4.5 w-4.5 text-amber-400" />;
      case 'improvement':
        return <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />;
      case 'incident_breach':
        return <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />;
      case 'health_penalty':
        return <AlertTriangle className="h-4.5 w-4.5 text-red-400" />;
      default:
        return <Info className="h-4.5 w-4.5 text-indigo-400" />;
    }
  };

  // ==========================================
  // RENDER BLOCKS
  // ==========================================
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
  const piiBreakdown = stats?.piiViolations || { GDPR: 0, HIPAA: 0, DPDP: 0 };
  const totalPii = (piiBreakdown.GDPR || 0) + (piiBreakdown.HIPAA || 0) + (piiBreakdown.DPDP || 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Compliance & Audit</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Continuous Operational Governance Framework Maps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95"
          >
            <Share className="h-4 w-4 text-indigo-400" />
            Share Portal
          </button>
        </div>
      </div>

      {/* Modern Premium Tabs Switcher */}
      <div className="flex border-b border-[var(--border-default)] bg-[var(--bg-card)]/50 p-1.5 rounded-xl gap-2 w-fit">
        <button
          onClick={() => setActiveTab('eu-ai-act')}
          className={cn(
            "px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'eu-ai-act' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
        >
          🇪🇺 EU AI Act Obligations
        </button>
        <button
          onClick={() => setActiveTab('nist-ai-rmf')}
          className={cn(
            "px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'nist-ai-rmf' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
          )}
        >
          🇺🇸 NIST AI RMF 1.0 Dashboard
        </button>
      </div>

      {/* =======================================================
          TAB 1: EU AI ACT
          ======================================================= */}
      {activeTab === 'eu-ai-act' && (
        <>
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard 
              label="EU Compliance Score" 
              value={`${summary.compliance_score}%`} 
              icon="compliance" 
              status={summary.compliance_score >= 80 ? 'success' : summary.compliance_score >= 50 ? 'warning' : 'danger'} 
            />
            <KPICard 
              label="Implemented Articles" 
              value={summary.implemented} 
              icon="systems" 
              status="success" 
            />
            <KPICard 
              label="In Progress Items" 
              value={summary.in_progress} 
              icon="compliance" 
              status="warning" 
            />
            <KPICard 
              label="Not Started Controls" 
              value={summary.not_started} 
              icon="risks" 
              status="primary" 
            />
          </div>

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

              {/* PII Compliance Scan Card */}
              <div className="card-base p-6 border border-red-500/20 bg-gradient-to-br from-zinc-950 to-red-950/10">
                <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">PII Compliance Scan</h3>
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-4">Realtime Interceptor Violations</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-xs text-gray-400">GDPR Violations</span>
                    <span className={`text-xs font-black ${piiBreakdown.GDPR > 0 ? 'text-red-400' : 'text-gray-400'}`}>{piiBreakdown.GDPR}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-xs text-gray-400">HIPAA Violations</span>
                    <span className={`text-xs font-black ${piiBreakdown.HIPAA > 0 ? 'text-red-400' : 'text-gray-400'}`}>{piiBreakdown.HIPAA}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-xs text-gray-400">DPDP Violations</span>
                    <span className={`text-xs font-black ${piiBreakdown.DPDP > 0 ? 'text-red-400' : 'text-gray-400'}`}>{piiBreakdown.DPDP}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Total Blocked/Flagged</span>
                    <span className={`text-xs font-black ${totalPii > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{totalPii}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =======================================================
          TAB 2: NIST AI RMF 1.0 (PRODUCTION governance GRADE)
          ======================================================= */}
      {activeTab === 'nist-ai-rmf' && (
        <>
          {nistIsSeeding ? (
            /* Startup Seeding Progress Card overlay */
            <div className="card-base p-10 flex flex-col items-center justify-center text-center gap-6 border-indigo-500/20 bg-gradient-to-br from-indigo-950/10 to-zinc-950">
              <RefreshCw className="h-12 w-12 text-indigo-400 animate-spin" />
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Framework Data Seeding in Progress</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-md">
                  NIST AI RMF 1.0 standard policies, severity weights, and cross-framework mappings are currently initializing in the secure database ledger.
                </p>
              </div>
              <div className="w-full max-w-xs h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-indigo-500 rounded-full animate-pulse" />
              </div>
              <button 
                onClick={() => loadNistData()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white uppercase rounded-lg tracking-widest active:scale-95 transition"
              >
                Check Seeder Status
              </button>
            </div>
          ) : nistIsLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compiling NIST Governance telemetry data...</p>
            </div>
          ) : nistError ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6 border border-zinc-900 rounded-xl bg-zinc-950/10">
              <ShieldAlert className="h-10 w-10 text-rose-500 animate-pulse" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">NIST Scoring Engine Disconnected</h3>
              <p className="text-xs text-gray-400">{nistError}</p>
              <button 
                onClick={() => loadNistData()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white uppercase rounded-lg tracking-widest transition"
              >
                Reconnect scoring
              </button>
            </div>
          ) : (
            <>
              {/* NIST KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard 
                  label="Unified RMF Score" 
                  value={`${nistOverview?.score}%`} 
                  icon="compliance" 
                  status={nistOverview?.score >= 80 ? 'success' : nistOverview?.score >= 50 ? 'warning' : 'danger'} 
                />
                <KPICard 
                  label="Controls Implemented" 
                  value={nistOverview?.summary?.implemented || 0} 
                  icon="systems" 
                  status="success" 
                />
                <KPICard 
                  label="In Progress Subcategories" 
                  value={nistOverview?.summary?.in_progress || 0} 
                  icon="compliance" 
                  status="warning" 
                />
                <KPICard 
                  label="Freshness Status" 
                  value={nistOverview?.data_freshness_status || 'CURRENT'} 
                  icon="risks" 
                  status={nistOverview?.data_freshness_status === 'CURRENT' ? 'success' : nistOverview?.data_freshness_status === 'STALE' ? 'warning' : 'danger'} 
                />
              </div>

              {/* NIST Posture Gauge, health, incidents grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Score Gauge & Explainability Change Log */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                  <div className="card-base p-6 flex flex-col gap-5 bg-gradient-to-b from-zinc-950 to-indigo-950/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Governance Posture</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Continuous AI RMF Assurance</p>
                      </div>
                      
                      <button 
                        onClick={handleExportConformity}
                        disabled={isExportingConformity}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/50 rounded-lg text-[9px] font-black text-indigo-400 hover:text-white uppercase transition active:scale-95 disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                        {isExportingConformity ? 'Signing...' : 'Conformity Package'}
                      </button>
                    </div>

                    {/* Circular Posture Ring Gauge */}
                    <div className="flex flex-col items-center justify-center py-6 border border-zinc-900 rounded-xl bg-black/15">
                      <div className="relative h-32 w-32 flex items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                          <circle cx="64" cy="64" r="54" className="stroke-zinc-800" strokeWidth="6" fill="transparent" />
                          <circle 
                            cx="64" 
                            cy="64" 
                            r="54" 
                            className={cn(
                              "transition-all duration-1000 ease-out",
                              (nistOverview?.score || 0) >= 80 ? "stroke-emerald-500" : (nistOverview?.score || 0) >= 50 ? "stroke-amber-500" : "stroke-rose-500"
                            )} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 54}
                            strokeDashoffset={2 * Math.PI * 54 * (1 - (nistOverview?.score || 0) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="text-center">
                          <span className="text-3xl font-black text-white">{nistOverview?.score || 0}</span>
                          <span className="text-zinc-500 text-xs block uppercase font-black">Score</span>
                        </div>
                      </div>

                      {nistOverview?.score === 0 && (
                        <div className="mt-4 text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          No governance evidence ingested
                        </div>
                      )}
                    </div>

                    {/* Explainability Change logs */}
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Score Explainability Ledger</h4>
                      <div className="space-y-2">
                        {(nistOverview?.reasons || []).length > 0 ? (
                          (nistOverview?.reasons || []).map((reason: any, idx: number) => (
                            <div key={idx} className="p-3 text-xs bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-start gap-3">
                              <span className="mt-0.5 flex-shrink-0">{getNistReasonIcon(reason.type)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-white font-bold leading-tight uppercase text-[10px]">
                                  {reason.type.replace('_', ' ')} ({reason.value > 0 ? `+${reason.value}` : reason.value})
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{reason.msg}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs border border-dashed border-zinc-900 text-zinc-500 rounded-xl text-center uppercase tracking-tighter">
                            No posture modifications registered.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workers Health & Incidents */}
                <div className="xl:col-span-7 flex flex-col gap-6">
                  
                  {/* Workers Uptime heartbeats */}
                  <div className="card-base p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Self-Monitoring Diagnostics</h3>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Worker Health & Reliability</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {nistHealth?.workers?.length > 0 ? (
                        nistHealth.workers.map((w: any) => (
                          <div key={w.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition">
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-3 w-3">
                                <span className={cn(
                                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                  w.health_status === 'HEALTHY' ? "bg-emerald-400" : w.health_status === 'DEGRADED' ? "bg-amber-400" : "bg-rose-400"
                                )} />
                                <span className={cn(
                                  "relative inline-flex rounded-full h-3 w-3",
                                  w.health_status === 'HEALTHY' ? "bg-emerald-500" : w.health_status === 'DEGRADED' ? "bg-amber-500" : "bg-rose-500"
                                )} />
                              </div>
                              
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-tight">{w.worker_name.replace('_', ' ')}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase">
                                    <Clock className="h-2.5 w-2.5" />
                                    {w.processing_latency_ms}ms latency
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase">
                                    <Server className="h-2.5 w-2.5" />
                                    Depth: {w.queue_depth}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest",
                              w.health_status === 'HEALTHY' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              w.health_status === 'DEGRADED' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                              {w.health_status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 border border-dashed border-zinc-900 rounded-xl text-center text-zinc-500 text-xs uppercase tracking-tighter col-span-2 py-6">
                          No workers currently registered. Uptime checks will boot on active BullMQ queues.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Incidents (Governance SOC Hub) */}
                  <div className="card-base p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Governance SOC Incidents Hub</h3>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Violations & SLAs</p>
                    </div>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {nistOverview?.incidents?.length > 0 ? (
                        nistOverview.incidents.map((inc: any) => (
                          <div key={inc.id} className="p-3 bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-4 transition">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className={cn(
                                "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                                inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? "bg-rose-500" : "bg-amber-500"
                              )} />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-white truncate uppercase tracking-tight">{inc.title}</h4>
                                <div className="flex items-center gap-2.5 mt-0.5">
                                  <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase">
                                    <Clock className="h-2.5 w-2.5" />
                                    SLA: {new Date(inc.sla_deadline).toLocaleDateString()}
                                  </span>
                                  {inc.sla_breach && (
                                    <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-950/20 px-1 border border-rose-500/10 rounded">
                                      SLA Breached
                                    </span>
                                  )}
                                  <span className="text-[8px] font-bold text-zinc-600 uppercase bg-zinc-900 px-1.5 py-0.5 rounded">
                                    {inc.incident_type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest",
                              inc.status === 'OPEN' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            )}>
                              {inc.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                          <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">No active incidents cataloged</p>
                          <p className="text-[9px] text-gray-500 mt-1">All telemetry events are within healthy SLA parameters.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* NIST AI RMF Maturity Matrix Accordion */}
              <div className="flex flex-col gap-4">
                <div className="card-base p-6 bg-gradient-to-r from-indigo-950/20 to-black/10 border-indigo-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Operational Maturity Matrix</span>
                      <h2 className="text-lg font-black text-white uppercase tracking-tight">NIST RMF 1.0 Subcategory Status</h2>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Continuous operational verification mapped directly to live system telemetry (interceptor, drift scans, evaluation). Click subcategories to patch compliance settings, notes, and view cross-framework GDPR/EU impact analyses.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {(nistOverview?.functions || []).map((fn: any) => {
                    const totalSub = fn.categories.flatMap((c: any) => c.subcategories).length;
                    const compSub = fn.categories.flatMap((c: any) => c.subcategories).filter((s: any) => s.status === 'IMPLEMENTED').length;

                    return (
                      <div key={fn.function_code} className="card-base p-5 border border-zinc-950 bg-zinc-950/40">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Function Group</span>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                              {fn.title}
                              <span className="text-[10px] font-bold text-gray-400">({fn.score}%)</span>
                            </h3>
                          </div>
                          
                          <span className="text-[9px] font-black text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded uppercase tracking-widest">
                            {compSub} / {totalSub} Mapped
                          </span>
                        </div>

                        {/* Expandable Categories list */}
                        <div className="space-y-4">
                          {fn.categories.map((cat: any) => (
                            <div key={cat.category_code} className="bg-black/15 rounded-xl border border-zinc-900 p-4 space-y-3">
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                                  <span className="text-[10px] text-indigo-400">{cat.category_code}</span>
                                  {cat.title}
                                </h4>
                                <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{cat.description}</p>
                              </div>

                              {/* Subcategories list */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-900/50">
                                {cat.subcategories.map((sub: any) => (
                                  <div key={sub.code} className="bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 p-3 rounded-lg flex items-center justify-between gap-4 group">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[9px] font-black text-indigo-400">{sub.code}</span>
                                        <h5 className="text-[11px] font-bold text-white truncate max-w-[200px] uppercase tracking-tight">{sub.title}</h5>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mt-1">
                                        {/* Progress fill visual bar */}
                                        <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                          <div 
                                            className={cn(
                                              "h-full rounded-full transition-all duration-300",
                                              sub.status === 'IMPLEMENTED' ? "bg-emerald-500 w-full" : sub.status === 'IN_PROGRESS' ? "bg-amber-500 w-1/2" : "w-0 bg-slate-700"
                                            )}
                                          />
                                        </div>
                                        <span className="text-[8px] font-semibold text-zinc-500 uppercase">
                                          Mat: {sub.maturityLevel}/5
                                        </span>
                                        {sub.telemetryLinked > 0 && (
                                          <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-950/20 px-1 rounded flex items-center gap-0.5">
                                            <Activity className="h-2 w-2" />
                                            {sub.telemetryLinked}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        // Package subcategory data for update drawer
                                        setSelectedNistSub({
                                          subcategory_code: sub.code,
                                          title: sub.title,
                                          description: sub.description || '',
                                          severity_weight: 5,
                                          depends_on_control: '',
                                          implementation_examples: [],
                                          suggested_evidence: [],
                                          implementation: {
                                            status: sub.status,
                                            maturity_level: sub.maturityLevel,
                                            risk_escalation_level: 'NORMAL',
                                            notes: '',
                                            owner_user_id: '',
                                            due_date: '',
                                            last_reviewed: sub.lastEvidenceAt
                                          }
                                        });
                                      }}
                                      className="flex items-center justify-center p-2 bg-zinc-900 border border-zinc-800 group-hover:border-indigo-500/30 rounded-lg text-gray-400 group-hover:text-white transition active:scale-95"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* =======================================================
          SLIDE-OUT DRAWER 1: EU AI ACT UPDATE
          ======================================================= */}
      {selectedControl && activeTab === 'eu-ai-act' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="flex-1" onClick={() => setSelectedControl(null)} />
          <div className="w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full animate-slide-in text-left">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block">Control Safeguard Detail</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedControl.control_code}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedControl(null)} className="p-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-2 bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl">
                <h4 className="text-xs font-black text-white uppercase tracking-tight">{selectedControl.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{selectedControl.description}</p>
              </div>

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

              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Compliance Status</h5>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none">
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><User className="h-3 w-3" /> Owner</label>
                    <input type="text" value={editOwner} placeholder="user_id" onChange={(e) => setEditOwner(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</label>
                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Notes</label>
                  <textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none resize-none" />
                </div>

                <button onClick={handleSaveControl} disabled={isSavingControl} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 rounded-lg text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                  {isSavingControl ? 'Saving...' : 'Save status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          SLIDE-OUT DRAWER 2: NIST AI RMF SUBCATEGORY UPDATE
          ======================================================= */}
      {selectedNistSub && activeTab === 'nist-ai-rmf' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="flex-1" onClick={() => setSelectedNistSub(null)} />
          <div className="w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full animate-slide-in text-left">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block">NIST Governance Control</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedNistSub.subcategory_code}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedNistSub(null)} className="p-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Context Summary */}
              <div className="space-y-2 bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl">
                <h4 className="text-xs font-black text-white uppercase tracking-tight">{selectedNistSub.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{selectedNistSub.description}</p>
              </div>

              {/* Cross-Framework Impact Side Panel Mapping */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cross-Framework Impact</h5>
                {isLoadingCrossImpact ? (
                  <div className="p-4 border border-zinc-900 rounded-xl flex justify-center text-zinc-500 text-xs">
                    Scanning cross mappings...
                  </div>
                ) : nistCrossImpact.length > 0 ? (
                  <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10">
                    {nistCrossImpact.map((map: any, idx: number) => (
                      <div key={idx} className="p-3 text-xs text-gray-300 flex items-start gap-2.5 leading-relaxed justify-between">
                        <div className="flex items-start gap-2 pr-4">
                          <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                          <div>
                            <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-950/20 px-1 border border-indigo-500/10 rounded mr-2">
                              {map.targetFramework}
                            </span>
                            <span className="font-bold text-white">{map.targetControlCode}</span>
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{map.description}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 shrink-0">
                          {Math.round(map.mappingStrength * 100)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-zinc-900 text-zinc-600 text-xs rounded-xl uppercase tracking-tighter text-center">
                    No mapped cross-framework controls.
                  </div>
                )}
              </div>

              {/* Actionable Examples Checklist */}
              {selectedNistSub.implementation_examples?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Implementation Guidelines</h5>
                  <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10">
                    {selectedNistSub.implementation_examples.map((item: string, idx: number) => (
                      <div key={idx} className="p-3 text-xs text-gray-300 flex items-start gap-2.5 leading-relaxed">
                        <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Governance Fields */}
              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Governance Settings</h5>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Operational Status</label>
                  <select 
                    value={editNistStatus} 
                    onChange={(e) => setEditNistStatus(e.target.value)} 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Award className="h-3 w-3 text-zinc-500" /> Maturity Level (1-5)
                    </label>
                    <select
                      value={editNistMaturity}
                      onChange={(e) => setEditNistMaturity(parseInt(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none"
                    >
                      <option value="1">1 - Initial / Ad-Hoc</option>
                      <option value="2">2 - Repeatable</option>
                      <option value="3">3 - Defined Process</option>
                      <option value="4">4 - Managed / Quantifiable</option>
                      <option value="5">5 - Optimizing / Continuous</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-zinc-500" /> Escalation Tier
                    </label>
                    <select
                      value={editNistEscalation}
                      onChange={(e) => setEditNistEscalation(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none"
                    >
                      <option value="NORMAL">NORMAL OPERATION</option>
                      <option value="WARNING">RISK WARNING</option>
                      <option value="CRITICAL">CRITICAL BREACH ESCALATION</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Assurance Action Notes</label>
                  <textarea 
                    rows={3} 
                    value={editNistNotes} 
                    onChange={(e) => setEditNistNotes(e.target.value)} 
                    placeholder="Enter details on control actions, implementation steps, or exemptions justifications..."
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2.5 outline-none resize-none focus:border-indigo-500/50" 
                  />
                </div>

                <button 
                  onClick={handleSaveNistControl} 
                  disabled={isSavingNist} 
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 rounded-lg text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isSavingNist ? 'Saving details...' : 'Save governance settings'}
                </button>
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
