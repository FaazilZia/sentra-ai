import { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  Lock,
  Download,
  Terminal,
  Activity,
  UserCheck,
  Eye,
  Bell,
  Check,
  Play,
  Zap
} from 'lucide-react';
import { 
  fetchAuditProof, 
  ComplianceFeature, 
  fetchFixTasks, 
  ComplianceFixTask, 
  createFixTasks, 
  reEvaluateCompliance,
  fetchComplianceHistory,
  ComplianceSnapshot,
  fetchAuditLogs,
  AuditLog,
  fetchAlerts,
  markAlertRead,
  exportComplianceReport,
  Alert as ComplianceAlert
} from '../lib/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { DEMO_INITIAL_DATA, DEMO_FINAL_DATA } from '../lib/demoData';
import { DemoOverlay } from '../components/demo/DemoOverlay';
import { GuardrailMonitor } from '../components/guardrails/GuardrailMonitor';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Reveal } from '../components/ui/Reveal';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { FixChecklist } from '../components/compliance/FixChecklist';
import { ProgressBar } from '../components/compliance/ProgressBar';
import { useAuth } from '../lib/auth';

export default function AuditProofPage() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<ComplianceFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [remediationMode, setRemediationMode] = useState(false);
  const [tasks, setTasks] = useState<ComplianceFixTask[]>([]);
  const [reEvaluationResult, setReEvaluationResult] = useState<any>(null);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [history, setHistory] = useState<ComplianceSnapshot[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Demo Mode State
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showFinalImpact, setShowFinalImpact] = useState(false);

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAuditProof();
        setFeatures(data);
        if (data.length > 0) {
          setExpandedFeature(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch audit proof:', err);
      } finally {
        setLoading(false);
      }
      loadAlerts();
    }
    loadData();
  }, []);

  // Use demo data only if enabled and real data is missing
  useEffect(() => {
    if (isDemoMode && !loading && features.length === 0) {
      setFeatures(DEMO_INITIAL_DATA.features as any);
      if (DEMO_INITIAL_DATA.features.length > 0) {
        setExpandedFeature(DEMO_INITIAL_DATA.features[0].id);
      }
    }
  }, [isDemoMode, loading, features.length]);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAlertRead(id);
      loadAlerts();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDownloadReport = async () => {
    if (!expandedFeature && !demoMode) return;
    setIsExporting(true);
    try {
      if (demoMode) {
        // Mock download delay
        await new Promise(r => setTimeout(r, 1000));
        alert("Demo Mode: Audit Report exported successfully!");
      } else {
        const blob = await exportComplianceReport(expandedFeature!);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance_report_${expandedFeature}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const startDemo = () => {
    if (!isDemoMode) return; // Guard start demo action
    setDemoMode(true);
    setDemoStep(0);
    setIsAutoPlaying(true);
    setShowFinalImpact(false);
    setFeatures(DEMO_INITIAL_DATA.features as any);
    setExpandedFeature(DEMO_INITIAL_DATA.features[0].id);
    setRemediationMode(false);
    setTasks(DEMO_INITIAL_DATA.tasks as any);
    setReEvaluationResult(null);
    setHistory([]); 
  };

  const handleDemoNext = async () => {
    const nextStep = demoStep + 1;
    
    if (nextStep === 6) {
      setIsAutoPlaying(false);
      setShowFinalImpact(true);
      return;
    }

    setDemoStep(nextStep);

    // Step 2: Guardrail Blocking
    if (nextStep === 1) {
      // Simulate a block event in the monitor (if we had state for it)
      setLogs(prev => [...DEMO_INITIAL_DATA.guardrailLogs as any, ...prev]);
    }

    // Step 3: Override Flow
    if (nextStep === 2) {
      // Simulate admin approval
      setLogs(DEMO_FINAL_DATA.guardrailLogs as any);
    }

    // Step 4: Open Remediation
    if (nextStep === 3) setRemediationMode(true);
    
    // Step 5: Simulate Fix
    if (nextStep === 4) {
      setTasks(DEMO_FINAL_DATA.tasks as any);
      setIsReEvaluating(true);
      await new Promise(r => setTimeout(r, 2000));
      setIsReEvaluating(false);
      setFeatures(DEMO_FINAL_DATA.features as any);
      setReEvaluationResult(DEMO_FINAL_DATA.reEvaluation);
    }
  };

  useEffect(() => {
    if (expandedFeature && !demoMode) {
      loadHistory();
      loadLogs();
    }
  }, [expandedFeature]);

  const loadHistory = async () => {
    if (!expandedFeature) return;
    try {
      const data = await fetchComplianceHistory(expandedFeature);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const loadLogs = async () => {
    if (!expandedFeature) return;
    try {
      const data = await fetchAuditLogs(expandedFeature);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    if (expandedFeature && remediationMode) {
      loadTasks();
    }
  }, [expandedFeature, remediationMode]);

  const loadTasks = async () => {
    if (!expandedFeature) return;
    try {
      const data = await fetchFixTasks(expandedFeature);
      setTasks(data);
      
      // If no tasks exist, we might need to initialize them from an action plan
      // In this demo, we'll auto-initialize if empty
      if (data.length === 0) {
        // Mock action plan based on the feature
        const mockActionPlan = {
          priority_1: ["Sign BAA with sub-processors", "Verify encryption-at-rest"],
          priority_2: ["Add DPO contact to policy"],
          priority_3: ["Automate log checksums"]
        };
        const newTasks = await createFixTasks(expandedFeature, mockActionPlan);
        setTasks(newTasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const handleReEvaluate = async () => {
    if (!expandedFeature) return;
    setIsReEvaluating(true);
    try {
      const result = await reEvaluateCompliance(expandedFeature);
      setReEvaluationResult(result);
      // Wait 1.5s to simulate deep AI analysis
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error('Re-evaluation failed:', err);
    } finally {
      setIsReEvaluating(false);
    }
  };

  const renderEvidence = (evidence: any) => {
    switch (evidence.type) {
      case 'consent_log':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">User Consent Log</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {Object.entries(evidence.content).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-slate-400 uppercase font-black tracking-tighter">{key.replace(/_/g, ' ')}</span>
                  <span className="text-slate-200 font-mono">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'api_response':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-blue-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">API Verification</h4>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-4 font-mono text-[11px] text-blue-300 border border-blue-500/20">
              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold">{evidence.content.method}</span>
                <span>{evidence.content.endpoint}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 text-slate-300">
                {JSON.stringify(evidence.content, null, 2)}
              </div>
            </div>
          </div>
        );
      case 'auth_code':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="h-5 w-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Implementation Logic</h4>
            </div>
            <pre className="bg-slate-900/80 rounded-lg p-4 font-mono text-[11px] text-slate-100 border border-white/10 overflow-x-auto">
              <code>{evidence.content}</code>
            </pre>
          </div>
        );
      case 'privacy_policy':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Policy Compliance</h4>
            </div>
            <div className="space-y-2">
              {Object.entries(evidence.content).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-[10px] text-slate-300 uppercase font-bold tracking-widest">{key.replace(/_/g, ' ')}</span>
                  {typeof value === 'boolean' ? (
                    value ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <span className="text-xs text-white font-bold">{String(value)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'audit_log':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-orange-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Audit Trail Evidence</h4>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span className="text-[8px] font-black text-emerald-400 uppercase">Integrity Verified</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
               <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">SHA-256 Valid</span>
               </div>
               <span className="text-[9px] font-mono text-emerald-500/60 uppercase">
                 {evidence.content.hash ? evidence.content.hash.slice(0, 16) + '...' : 'VERIFIED'}
               </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
               <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                 evidence.validation_status === 'valid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                 evidence.validation_status === 'invalid' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                 'bg-orange-500/10 border-orange-500/20 text-orange-400'
               }`}>
                 {evidence.validation_status || 'Pending'}
               </div>
               {evidence.verified && (
                 <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">
                   <Check className="h-3 w-3" /> Validated
                 </div>
               )}
            </div>
            <div className="space-y-3 mt-4">
               {Object.entries(evidence.content).map(([key, value]) => (
                 <div key={key} className="flex justify-between items-center text-[11px]">
                   <span className="text-slate-400 uppercase font-bold">{key}</span>
                   <span className="text-slate-100 font-mono">{String(value)}</span>
                 </div>
               ))}
            </div>
          </div>
        );
      case 'breach_policy':
        return (
          <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Breach Response SLA</h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
               <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Response Timeframe</p>
                  <p className="text-2xl font-black text-white">{evidence.content.notification_time_hours} Hours</p>
               </div>
               <div className="flex items-center gap-2 px-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] text-slate-300 uppercase font-bold tracking-widest">Automatic User Notification Enabled</span>
               </div>
            </div>
          </div>
        );
      default:
        return <div className="text-slate-400 text-xs italic">Unknown evidence type: {evidence.type}</div>;
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-12 px-6 pt-10">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <nav className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Audit Control <span className="mx-2 text-slate-700">/</span> Compliance Proof
              </nav>
              <StatusBadge label={user?.role || 'AUDITOR'} tone="info" />
              <div className="relative">
                <button 
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="p-2 rounded-lg bg-slate-800 border border-white/5 relative hover:bg-slate-700 transition-all"
                >
                  <Bell className="h-4 w-4 text-slate-100" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse" />
                  )}
                </button>
                {showAlerts && (
                  <div className="absolute top-full right-0 mt-4 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Active Alerts</span>
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">{alerts.length} New</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-[10px] uppercase font-black">No unread alerts</div>
                      ) : (
                        alerts.map(alert => (
                          <div key={alert.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-all group">
                             <div className="flex gap-3">
                                <div className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${alert.severity === 'high' ? 'bg-rose-500' : 'bg-orange-400'}`} />
                                <div className="space-y-1 flex-1">
                                   <p className="text-[11px] text-white font-medium leading-tight">{alert.message}</p>
                                   <div className="flex justify-between items-center">
                                      <span className="text-[9px] text-slate-400 uppercase font-bold">{alert.type.replace('_', ' ')}</span>
                                      <button 
                                        onClick={() => handleMarkRead(alert.id)}
                                        className="text-[9px] text-emerald-400 font-black uppercase opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        Mark Read
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
              <ShieldCheck className="h-10 w-10 text-white" />
              Governance Audit Proof
            </h1>
            <p className="text-slate-300 font-medium max-w-2xl text-lg">
              Automated evidence collection for regulatory frameworks. Every control is mapped to a real-time system verification.
            </p>
          </div>
          <div className="flex gap-4">
             {isDemoMode && !demoMode && (
               <button 
                 onClick={startDemo}
                 className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2"
               >
                 <Play className="h-4 w-4 fill-current" /> Start Guided Demo
               </button>
             )}
             {['ADMIN', 'ENGINEER'].includes(user?.role || '') && (
               <button 
                 onClick={() => setRemediationMode(!remediationMode)}
                 className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${
                   remediationMode ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-white border-white/5'
                 }`}
               >
                  <Zap className={`h-4 w-4 ${remediationMode ? 'fill-current' : ''}`} /> 
                  {remediationMode ? 'Exit Remediation' : 'Enter Remediation'}
               </button>
             )}
             <button 
               onClick={handleDownloadReport}
               disabled={isExporting}
               className="px-6 py-3 rounded-xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 shadow-xl shadow-white/5 disabled:opacity-50"
             >
                <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} /> 
                {isExporting ? 'Generating PDF...' : 'Export Audit Report'}
             </button>
          </div>
        </div>
      </Reveal>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="h-8 w-8 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Feature Sidebar */}
          <div className={`lg:col-span-4 space-y-4 transition-all duration-500 ${demoMode && demoStep === 1 ? 'ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] rounded-3xl p-2' : ''}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">Audit Features</p>
            {features.map((feature) => (
              <SpotlightCard
                key={feature.id}
                onClick={() => setExpandedFeature(feature.id)}
                className={`cursor-pointer transition-all border-l-4 ${
                  expandedFeature === feature.id 
                    ? 'bg-white/5 border-white ring-1 ring-white/10' 
                    : 'border-transparent bg-slate-900/40 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between p-1">
                  <div className="space-y-1">
                    <h3 className="font-black text-white uppercase tracking-tight text-sm">{feature.feature_name}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{feature.description}</p>
                  </div>
                  <StatusBadge 
                    label={feature.status.replace(/_/g, ' ')} 
                    tone={feature.status === 'compliant' ? 'success' : 'warning'} 
                  />
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Evidence Details / Remediation Details */}
          <div className="lg:col-span-8">
            {expandedFeature ? (
              <div className="space-y-8">
                {remediationMode ? (
                  <Reveal>
                    <div className="grid grid-cols-1 gap-8">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Remediation Checklist</h2>
                            <p className="text-slate-300 text-sm">Upload evidence to resolve compliance gaps.</p>
                         </div>
                         {user?.role === 'ADMIN' && (
                           <button 
                             onClick={handleReEvaluate}
                             disabled={isReEvaluating}
                             className="px-6 py-3 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50 transition-all flex items-center gap-2"
                           >
                             {isReEvaluating ? (
                               <div className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                             ) : <Zap className="h-3 w-3" />}
                             Trigger AI Re-Evaluation
                           </button>
                         )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className={`space-y-4 transition-all duration-500 ${demoMode && demoStep === 3 ? 'ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] rounded-[2.5rem] p-4' : ''}`}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fix Tasks</p>
                          <FixChecklist tasks={tasks} onTaskUpdated={loadTasks} />
                        </div>
                        <div className="space-y-8">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Live Readiness</p>
                           <div className={`transition-all duration-500 ${demoMode && (demoStep === 0 || demoStep === 5) ? 'ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] rounded-[2.5rem]' : ''}`}>
                              <ProgressBar 
                                progress={parseInt(reEvaluationResult?.progress_percentage || (tasks.length > 0 ? ((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100).toFixed(0) : "0"))} 
                                completedCount={reEvaluationResult?.completed_count || `${tasks.filter(t => t.status === 'completed').length}/${tasks.length}`}
                                status={reEvaluationResult?.status || "Pending Evidence"}
                              />
                           </div>
                           
                            {history.length > 0 && (
                             <div className="space-y-4">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Compliance History</p>
                                 <div className="h-[200px] w-full bg-slate-900/40 border border-white/5 rounded-3xl p-4">
                                   <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={history.map(h => ({
                                       name: new Date(h.created_at).toLocaleDateString(),
                                       GDPR: h.gdpr_score,
                                       DPDP: h.dpdp_score,
                                       HIPAA: h.hipaa_score
                                     }))}>
                                       <XAxis dataKey="name" hide />
                                       <YAxis domain={[0, 100]} hide />
                                       <Tooltip 
                                         contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "10px" }}
                                       />
                                       <Line type="monotone" dataKey="GDPR" stroke="#10b981" strokeWidth={3} dot={false} />
                                       <Line type="monotone" dataKey="DPDP" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                       <Line type="monotone" dataKey="HIPAA" stroke="#a855f7" strokeWidth={3} dot={false} />
                                     </LineChart>
                                   </ResponsiveContainer>
                                 </div>
                              </div>
                            )}

                            {demoMode && (demoStep === 1 || demoStep === 2 || demoStep === 5) && (
                              <div className={`mt-12 mb-12 space-y-6 animate-in slide-in-from-bottom-8 duration-700 ${demoMode && (demoStep === 1 || demoStep === 2 || demoStep === 5) ? "ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)] rounded-[2.5rem] p-6 bg-slate-900/40" : ""}`}>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                  <Lock className="h-6 w-6 text-cyan-400" />
                                  Real-time Guardrail Enforcement
                                </h3>
                                <GuardrailMonitor />
                              </div>
                            )}
                           
                           {reEvaluationResult && (
                             <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-white font-bold uppercase tracking-tight">AI Re-Check Complete</p>
                                  <StatusBadge 
                                    label={`Confidence: ${reEvaluationResult.confidence}`} 
                                    tone={reEvaluationResult.confidence === 'High' ? 'success' : 'warning'} 
                                  />
                                </div>
                                <p className="text-sm text-emerald-400 leading-relaxed">
                                  Your score has improved by <span className="font-black">+{reEvaluationResult.new_score_improvement.toFixed(1)}%</span>. 
                                  Based on the uploaded evidence, your risk level has decreased significantly.
                                </p>
                             </div>
                           )}

                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Recent Activity Log</p>
                              <div className="glass-card rounded-3xl p-6 bg-slate-950/40 border-white/5 space-y-3">
                                 {logs.slice(0, 5).map((log) => (
                                   <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                      <div className="flex items-center gap-3">
                                         <div className="h-2 w-2 rounded-full bg-cyan-400" />
                                         <span className="text-[10px] font-bold text-white uppercase tracking-tight">{log.action.replace('_', ' ')}</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                         {features.find(f => f.id === expandedFeature)?.feature_name}
                       </h2>
                       <p className="text-slate-300 text-sm">
                         {features.find(f => f.id === expandedFeature)?.description}
                       </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {features.find(f => f.id === expandedFeature)?.evidence.map((evidence, idx) => (
                        <Reveal key={idx} delay={idx * 0.1}>
                           {renderEvidence(evidence)}
                        </Reveal>
                      ))}
                    </div>
                    
                    <SurfaceCard 
                      title="Auditor Notes" 
                      description="Automated system verification log"
                      className="mt-12 bg-emerald-500/5 border-emerald-500/20"
                    >
                       <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                             <ShieldCheck className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className="space-y-1">
                             <p className="text-xs text-white font-bold uppercase tracking-tight">All Evidence Validated</p>
                             <p className="text-[11px] text-emerald-400/70 leading-relaxed">
                               This feature control was last verified on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}. 
                               The system has matched the actual runtime behavior against the defined governance policies with 100% confidence.
                             </p>
                          </div>
                       </div>
                    </SurfaceCard>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-4 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                 <Eye className="h-12 w-12 opacity-20" />
                 <p className="font-bold uppercase tracking-widest text-[10px]">Select a feature to view audit proof</p>
              </div>
            )}
          </div>
        </div>
      )}

      {demoMode && (
        <DemoOverlay 
          step={demoStep}
          onNext={handleDemoNext}
          onPrev={() => setDemoStep(Math.max(0, demoStep - 1))}
          onClose={() => { setDemoMode(false); setIsAutoPlaying(false); }}
          isAutoPlaying={isAutoPlaying}
          onToggleAutoPlay={setIsAutoPlaying}
        />
      )}

      {showFinalImpact && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
           <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 max-w-xl w-full text-center space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-cyan-400" />
              <div className="flex justify-center">
                 <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-bounce">
                    <ShieldCheck className="h-10 w-10 text-emerald-400" />
                 </div>
              </div>
              <div className="space-y-2">
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Demo Complete</h2>
                 <p className="text-slate-300 font-medium">Compliance improved from <span className="text-rose-400">82%</span> to <span className="text-emerald-400">96%</span> in minutes using AI-driven remediation.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Time Saved</p>
                    <p className="text-2xl font-black text-white">~40 Hours</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Manual Audit Gaps</p>
                    <p className="text-2xl font-black text-white">0 Issues</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowFinalImpact(false)}
                className="w-full py-4 bg-white text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Return to Dashboard
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
