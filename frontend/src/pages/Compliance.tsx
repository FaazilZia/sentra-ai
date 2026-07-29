import { 
  CheckCircle2, 
  ShieldCheck, 
  X,
  Share,
  Edit2,
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
import { useStore } from '@/store/useStore';
import { ShareModal } from '@/components/shared/ShareModal';
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
  const [activeTab, setActiveTab] = useState<'gdpr' | 'dpdp' | 'hipaa' | 'pci-dss' | 'nist-ai-rmf'>('nist-ai-rmf');
  const [isShareOpen, setIsShareOpen] = useState(false);

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



  // Sync NIST drawer fields
  useEffect(() => {
    if (selectedNistSub) {
      const impl = selectedNistSub.implementation;
      setEditNistStatus(impl?.status || 'NOT_STARTED');
      setEditNistMaturity(impl?.maturity_level || 1);
      setEditNistEscalation(impl?.risk_escalation_level || 'NORMAL');
      setEditNistNotes(impl?.notes || '');

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
  // SAVE HANDLERS
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

  // ==========================================
  // RENDER BLOCKS
  // ==========================================




  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Compliance & Audit</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Continuous Operational Governance Framework Maps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] uppercase tracking-widest hover:bg-[var(--bg-page)] transition-all active:scale-95 shadow-lg"
          >
            <Share className="h-4 w-4 text-indigo-400" />
            Share Portal
          </button>
        </div>
      </div>

      {/* Modern Premium Tabs Switcher */}
      <div className="flex flex-wrap border-b border-[var(--border-default)] bg-[var(--bg-card)]/50 p-1.5 rounded-xl gap-2 w-fit">
        <button
          onClick={() => setActiveTab('nist-ai-rmf')}
          className={cn(
            "px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'nist-ai-rmf' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          )}
        >
          🇺🇸 NIST AI RMF 1.0
        </button>
        <button
          onClick={() => setActiveTab('gdpr')}
          className={cn(
            "px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'gdpr' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          )}
        >
          🇪🇺 GDPR
        </button>
        <button
          onClick={() => setActiveTab('dpdp')}
          className={cn(
            "px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'dpdp' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          )}
        >
          🇮🇳 DPDP Act
        </button>
        <button
          onClick={() => setActiveTab('hipaa')}
          className={cn(
            "px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'hipaa' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          )}
        >
          🏥 HIPAA
        </button>
        <button
          onClick={() => setActiveTab('pci-dss')}
          className={cn(
            "px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2",
            activeTab === 'pci-dss'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          )}
        >
          💳 PCI-DSS
        </button>
      </div>

      {/* =======================================================
          NIST AI RMF 1.0 TAB
          ======================================================= */}
      {activeTab === 'nist-ai-rmf' && (
        <NistAiRmfTab
          nistIsSeeding={nistIsSeeding}
          nistIsLoading={nistIsLoading}
          nistError={nistError}
          nistOverview={nistOverview}
          nistHealth={nistHealth}
          loadNistData={loadNistData}
          handleExportConformity={handleExportConformity}
          isExportingConformity={isExportingConformity}
          setSelectedNistSub={setSelectedNistSub}
        />
      )}

      {/* =======================================================
          UNIFIED FRAMEWORK VIEW TAB (GDPR, DPDP, HIPAA, PCI-DSS)
          ======================================================= */}
      {activeTab !== 'nist-ai-rmf' && (
        <div className="card-base bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">
                {activeTab.toUpperCase()} Compliance & Security Posture
              </h3>
              <p className="text-xs text-slate-500">
                Unified posture findings and runtime AIDR block events for {activeTab.toUpperCase()}
              </p>
            </div>
            <span className="badge-pill bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-xs">
              ACTIVE SCOPE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Target Framework</div>
              <div className="text-xl font-bold text-slate-800 mt-1 uppercase">{activeTab}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-[10px] font-bold uppercase text-emerald-600">Framework Status</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">ENFORCED</div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="text-[10px] font-bold uppercase text-indigo-600">Interception Mode</div>
              <div className="text-xl font-bold text-indigo-700 mt-1">REAL-TIME AIDR</div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          SLIDE-OUT DRAWER 2: NIST AI RMF SUBCATEGORY UPDATE
          ======================================================= */}
      {selectedNistSub && activeTab === 'nist-ai-rmf' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="flex-1" onClick={() => setSelectedNistSub(null)} onKeyDown={(e) => { if (e.key === 'Escape') setSelectedNistSub(null); }} role="button" tabIndex={0} aria-label="Close drawer" />
          <div className="w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full animate-slide-in text-left">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 block">NIST Governance Control</span>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-tight">{selectedNistSub.subcategory_code}</h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNistSub(null)} 
                aria-label="Close details drawer"
                className="p-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              <div className="space-y-2 bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl">
                <h4 className="text-xs font-semibold text-white uppercase tracking-tight">{selectedNistSub.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{selectedNistSub.description}</p>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Cross-Framework Impact</h5>
                {isLoadingCrossImpact ? (
                  <div className="p-4 border border-zinc-900 rounded-xl flex justify-center text-zinc-500 text-xs">
                    Scanning cross mappings...
                  </div>
                ) : nistCrossImpact.length > 0 ? (
                  <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10 animate-fade-in">
                    {nistCrossImpact.map((map: any, idx: number) => (
                      <div key={idx} className="p-3 text-xs text-[var(--text-secondary)] flex items-start gap-2.5 leading-relaxed justify-between">
                        <div className="flex items-start gap-2 pr-4">
                          <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                          <div>
                            <span className="text-[9px] font-semibold uppercase text-indigo-400 bg-indigo-950/20 px-1 border border-indigo-500/10 rounded mr-2">
                              {map.targetFramework}
                            </span>
                            <span className="font-bold text-white">{map.targetControlCode}</span>
                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-0.5">{map.description}</p>
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

              {selectedNistSub.implementation_examples?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Implementation Guidelines</h5>
                  <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden bg-black/10">
                    {selectedNistSub.implementation_examples.map((item: string, idx: number) => (
                      <div key={idx} className="p-3 text-xs text-[var(--text-secondary)] flex items-start gap-2.5 leading-relaxed">
                        <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <h5 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Governance Settings</h5>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Operational Status</label>
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
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase flex items-center gap-1">
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
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase flex items-center gap-1">
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
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Assurance Action Notes</label>
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 rounded-lg text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-center gap-2"
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
// TAB SUB-COMPONENTS
// ==========================================


interface NistAiRmfTabProps {
  nistIsSeeding: boolean;
  nistIsLoading: boolean;
  nistError: string | null;
  nistOverview: any;
  nistHealth: any;
  loadNistData: (showSilence?: boolean) => Promise<void>;
  handleExportConformity: () => Promise<void>;
  isExportingConformity: boolean;
  setSelectedNistSub: (sub: any) => void;
}

function NistAiRmfTab({
  nistIsSeeding,
  nistIsLoading,
  nistError,
  nistOverview,
  nistHealth,
  loadNistData,
  handleExportConformity,
  isExportingConformity,
  setSelectedNistSub
}: NistAiRmfTabProps) {
  if (nistIsSeeding) {
    return (
      <div className="card-base p-10 flex flex-col items-center justify-center text-center gap-6 border-indigo-500/20 bg-gradient-to-br from-indigo-950/10 to-zinc-950">
        <RefreshCw className="h-12 w-12 text-indigo-400 animate-spin" />
        <div>
          <h3 className="text-lg font-semibold text-white uppercase tracking-wider">Framework Data Seeding in Progress</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md">
            NIST AI RMF 1.0 standard policies, severity weights, and cross-framework mappings are currently initializing in the secure database ledger.
          </p>
        </div>
        <div className="w-full max-w-xs h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-indigo-500 rounded-full animate-pulse" />
        </div>
        <button 
          onClick={() => loadNistData()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white uppercase rounded-lg tracking-widest active:scale-95 transition shadow-lg"
        >
          Check Seeder Status
        </button>
      </div>
    );
  }

  if (nistIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Compiling NIST Governance telemetry data...</p>
      </div>
    );
  }

  if (nistError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6 border border-zinc-900 rounded-xl bg-zinc-950/10">
        <ShieldAlert className="h-10 w-10 text-rose-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">NIST Scoring Engine Disconnected</h3>
        <p className="text-xs text-[var(--text-secondary)]">{nistError}</p>
        <button 
          onClick={() => loadNistData()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white uppercase rounded-lg tracking-widest transition shadow-lg"
        >
          Reconnect scoring
        </button>
      </div>
    );
  }

  return (
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

      {/* Grid content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Score explainability change ledger */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="card-base p-6 flex flex-col gap-5 bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-tight">Governance Posture</h3>
                <p className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Continuous AI RMF Assurance</p>
              </div>
              
              <button 
                onClick={handleExportConformity}
                disabled={isExportingConformity}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/50 rounded-lg text-[9px] font-semibold text-indigo-400 hover:text-[var(--text-primary)] uppercase transition active:scale-95 disabled:opacity-50 shadow-md"
              >
                <Download className="h-3 w-3" />
                {isExportingConformity ? 'Signing...' : 'Conformity Package'}
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-6 border border-[var(--border-default)] rounded-xl bg-[var(--bg-page)]">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                  <circle cx="64" cy="64" r="54" className="stroke-[var(--border-strong)]" strokeWidth="6" fill="transparent" />
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
                  <span className="text-3xl font-semibold text-[var(--text-primary)]">{nistOverview?.score || 0}</span>
                  <span className="text-[var(--text-muted)] text-xs block uppercase font-semibold">Score</span>
                </div>
              </div>

              {nistOverview?.score === 0 && (
                <div className="mt-4 text-rose-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  No governance evidence ingested
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-3">Score Explainability Ledger</h4>
              <div className="space-y-2">
                {(nistOverview?.reasons || []).length > 0 ? (
                  (nistOverview?.reasons || []).map((reason: any, idx: number) => (
                    <div key={idx} className="p-3 text-xs bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl flex items-start gap-3 hover:border-[var(--border-strong)] transition">
                      <span className="mt-0.5 flex-shrink-0">{getNistReasonIcon(reason.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--text-primary)] font-bold leading-tight uppercase text-[10px]">
                          {reason.type.replace('_', ' ')} ({reason.value > 0 ? `+${reason.value}` : reason.value})
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{reason.msg}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs border border-dashed border-[var(--border-default)] text-[var(--text-muted)] rounded-xl text-center uppercase tracking-tighter">
                    No posture modifications registered.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Self-monitoring diagnostics & incident logs */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* self-monitoring diagnostics */}
          <div className="card-base p-6 flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-tight">Self-Monitoring Diagnostics</h3>
              <p className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Worker Health & Reliability</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nistHealth?.workers?.length > 0 ? (
                nistHealth.workers.map((w: any) => (
                  <div key={w.id} className="p-4 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl flex items-center justify-between hover:border-[var(--border-strong)] transition">
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
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">{w.worker_name.replace('_', ' ')}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1 uppercase">
                            <Clock className="h-2.5 w-2.5" />
                            {w.processing_latency_ms}ms latency
                          </span>
                          <span className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1 uppercase">
                            <Server className="h-2.5 w-2.5" />
                            Depth: {w.queue_depth}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[8px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-widest",
                      w.health_status === 'HEALTHY' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      w.health_status === 'DEGRADED' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {w.health_status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-[var(--border-default)] rounded-xl text-center text-[var(--text-muted)] text-xs uppercase tracking-tighter col-span-2 py-6">
                  No workers currently registered. Uptime checks will boot on active BullMQ queues.
                </div>
              )}
            </div>
          </div>

          {/* Incidents */}
          <div className="card-base p-6 flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-tight">Governance SOC Incidents Hub</h3>
              <p className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Active Violations & SLAs</p>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
              {nistOverview?.incidents?.length > 0 ? (
                nistOverview.incidents.map((inc: any) => (
                  <div key={inc.id} className="p-3 bg-[var(--bg-page)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-xl flex items-center justify-between gap-4 transition shadow-sm">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className={cn(
                        "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                        inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? "bg-rose-500 shadow" : "bg-amber-500"
                      )} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate uppercase tracking-tight">{inc.title}</h4>
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <span className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1 uppercase">
                            <Clock className="h-2.5 w-2.5" />
                            SLA: {new Date(inc.sla_deadline).toLocaleDateString()}
                          </span>
                          {inc.sla_breach && (
                            <span className="text-[8px] font-semibold uppercase text-rose-400 bg-rose-950/20 px-1 border border-rose-500/10 rounded">
                              SLA Breached
                            </span>
                          )}
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase bg-[var(--border-default)] px-1.5 py-0.5 rounded">
                            {inc.incident_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[8px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-widest",
                      inc.status === 'OPEN' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {inc.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-[10px] font-semibold text-[var(--text-primary)] uppercase tracking-widest">No active incidents cataloged</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">All telemetry events are within healthy SLA parameters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NIST AI RMF Maturity Accordion */}
      <div className="flex flex-col gap-4">
        <div className="card-base p-6 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Operational Maturity Matrix</span>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] uppercase tracking-tight">NIST RMF 1.0 Subcategory Status</h2>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Continuous operational verification mapped directly to live system telemetry (interceptor, drift scans, evaluation). Click subcategories to patch compliance settings, notes, and view cross-framework GDPR/EU impact analyses.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {(nistOverview?.functions || []).map((fn: any) => (
            <NistFunctionBlock key={fn.function_code} fn={fn} setSelectedNistSub={setSelectedNistSub} />
          ))}
        </div>
      </div>
    </>
  );
}

function NistFunctionBlock({ fn, setSelectedNistSub }: { fn: any; setSelectedNistSub: (sub: any) => void }) {
  const totalSub = (fn.categories || []).flatMap((c: any) => c.subcategories || []).length;
  const compSub = (fn.categories || []).flatMap((c: any) => c.subcategories || []).filter((s: any) => s.status === 'IMPLEMENTED').length;

  return (
    <div className="card-base p-5 border border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-4">
        <div>
          <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest">Function Group</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
            {fn.title}
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">({fn.score}%)</span>
          </h3>
        </div>
        
        <span className="text-[9px] font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-0.5 rounded uppercase tracking-widest">
          {compSub} / {totalSub} Mapped
        </span>
      </div>

      <div className="space-y-4">
        {(fn.categories || []).map((cat: any) => (
          <NistCategoryBlock key={cat.category_code} cat={cat} setSelectedNistSub={setSelectedNistSub} />
        ))}
      </div>
    </div>
  );
}

function NistCategoryBlock({ cat, setSelectedNistSub }: { cat: any; setSelectedNistSub: (sub: any) => void }) {
  return (
    <div className="bg-[var(--bg-page)] rounded-xl border border-[var(--border-default)] p-4 space-y-3">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
          <span className="text-[10px] text-indigo-400">{cat.category_code}</span>
          {cat.title}
        </h4>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{cat.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-default)]">
        {(cat.subcategories || []).map((sub: any) => (
          <div key={sub.code} className="bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-strong)] p-3 rounded-lg flex items-center justify-between gap-4 group transition shadow-sm animate-fade-in">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-semibold text-indigo-600">{sub.code}</span>
                <h5 className="text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[200px] uppercase tracking-tight">{sub.title}</h5>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1 w-12 bg-[var(--border-default)] rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      sub.status === 'IMPLEMENTED' ? "bg-emerald-500 w-full" : sub.status === 'IN_PROGRESS' ? "bg-amber-500 w-1/2" : "w-0 bg-slate-700"
                    )}
                  />
                </div>
                <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">
                  Mat: {sub.maturityLevel}/5
                </span>
                {sub.telemetryLinked > 0 && (
                  <span className="text-[8px] font-semibold uppercase text-indigo-400 bg-indigo-950/20 px-1 rounded flex items-center gap-0.5 animate-pulse">
                    <Activity className="h-2 w-2" />
                    {sub.telemetryLinked}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
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
              aria-label={`Edit ${sub.code} subcategory`}
              className="flex items-center justify-center p-2 bg-[var(--bg-page)] border border-[var(--border-default)] group-hover:border-indigo-500/30 rounded-lg text-[var(--text-secondary)] group-hover:text-indigo-500 transition active:scale-95"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}





