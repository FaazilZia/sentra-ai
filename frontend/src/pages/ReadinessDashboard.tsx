import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Zap, 
  ArrowRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface Control {
  code: string;
  title: string;
  description?: string;
  status: 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
  maturityLevel?: number;
  score?: number;
  clause?: string;
  function?: string;
  category?: string;
  createdAt?: string | null;
}

interface FrameworkInfo {
  id: string;
  name: string;
  endpoint: string;
  icon: any;
  description: string;
}

const FRAMEWORKS: FrameworkInfo[] = [
  { id: 'gdpr', name: 'GDPR', endpoint: '/gdpr', icon: Shield, description: 'General Data Protection Regulation AI Governance & Privacy Controls.' },
  { id: 'hipaa', name: 'HIPAA', endpoint: '/hipaa', icon: Shield, description: 'Health Insurance Portability and Accountability Act Security & Privacy Safeguards.' },
  { id: 'soc2', name: 'SOC2', endpoint: '/soc2', icon: Shield, description: 'System and Organization Controls Trust Services Criteria.' },
  { id: 'pci', name: 'PCI-DSS', endpoint: '/pci', icon: Shield, description: 'Payment Card Industry Data Security Standard technical controls.' },
  { id: 'dpdp', name: 'DPDP', endpoint: '/dpdp', icon: Shield, description: 'India Digital Personal Data Protection Act compliance controls.' },
  { id: 'eu-ai-act', name: 'EU AI Act', endpoint: '/compliance/eu-ai-act', icon: Shield, description: 'Compliance status under the European Union AI Act risk frameworks.' },
  { id: 'nist-ai-rmf', name: 'NIST AI RMF 1.0', endpoint: '/compliance/nist-ai-rmf', icon: Zap, description: 'National Institute of Standards & Technology AI Risk Management Framework.' },
  { id: 'iso-42001', name: 'ISO/IEC 42001', endpoint: '/iso42001', icon: FileCheck, description: 'Artificial Intelligence Management System (AIMS) standard.' },
  { id: 'iso-27001', name: 'ISO/IEC 27001', endpoint: '/iso27001', icon: Shield, description: 'Information Security Management System standard.' },
  { id: 'ccpa', name: 'CCPA', endpoint: '/ccpa', icon: FileCheck, description: 'California Consumer Privacy Act AI regulations.' },
  { id: 'dora', name: 'DORA', endpoint: '/dora', icon: Zap, description: 'Digital Operational Resilience Act for financial entities.' },
  { id: 'oecd', name: 'OECD AI Principles', endpoint: '/oecd', icon: Shield, description: 'OECD principles for trustworthy artificial intelligence.' },
  { id: 'ftc', name: 'FTC AI Guidelines', endpoint: '/ftc', icon: AlertTriangle, description: 'Federal Trade Commission regulatory guidance on AI truthfulness.' }
];

export default function ReadinessDashboard() {
  const { addToast } = useStore();
  const [selectedFramework, setSelectedFramework] = useState<FrameworkInfo>(FRAMEWORKS[0]);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<Control[]>([]);
  const [score, setScore] = useState<number>(0);
  const [overallStats, setOverallStats] = useState({
    total: 0,
    implemented: 0,
    inProgress: 0,
    notStarted: 0,
  });

  const loadFrameworkData = useCallback(async (fw: FrameworkInfo) => {
    setLoading(true);
    try {
      // Fetch overview score & controls
      const [overviewRes, controlsRes] = await Promise.all([
        apiRequest<any>(`${fw.endpoint}/overview`).catch(() => null),
        apiRequest<any>(`${fw.endpoint}/controls`).catch(() => [])
      ]);

      let calculatedScore = 0;
      if (overviewRes) {
        if (overviewRes.summary?.compliance_score !== undefined) {
          calculatedScore = Math.round(overviewRes.summary.compliance_score);
        } else if (overviewRes.compliance_score !== undefined) {
          calculatedScore = Math.round(overviewRes.compliance_score);
        } else if (overviewRes.overallScore !== undefined) {
          calculatedScore = Math.round(overviewRes.overallScore);
        } else if (overviewRes.summary?.readiness_score !== undefined) {
          calculatedScore = Math.round(overviewRes.summary.readiness_score);
        } else {
          // fallback calculation from controls
          const list = controlsRes?.data || controlsRes || [];
          if (list.length > 0) {
            const imp = list.filter((c: any) => c.status === 'IMPLEMENTED').length;
            const ip = list.filter((c: any) => c.status === 'IN_PROGRESS').length;
            calculatedScore = Math.round(((imp + ip * 0.5) / list.length) * 100);
          }
        }
      }

      const rawControls = controlsRes?.data || controlsRes || [];
      const normalizedControls = rawControls.map((c: any) => ({
        code: c.code || c.control_code || c.id || '',
        title: c.title || c.name || 'Untitled Control',
        description: c.description || c.notes || '',
        status: c.status || c.implementation?.status || 'NOT_STARTED',
        maturityLevel: c.maturityLevel || c.maturity_level || 0,
        score: c.score !== undefined ? c.score : 0,
        clause: c.clause || c.function || c.category || 'General',
        createdAt: c.createdAt || c.created_at || c.implementation?.created_at || c.implementation?.createdAt || null
      }));

      setControls(normalizedControls);
      setScore(calculatedScore);

      // Compute statistics
      const total = normalizedControls.length;
      const implemented = normalizedControls.filter((c: Control) => c.status === 'IMPLEMENTED').length;
      const inProgress = normalizedControls.filter((c: Control) => c.status === 'IN_PROGRESS').length;
      const notStarted = total - implemented - inProgress;

      setOverallStats({
        total,
        implemented,
        inProgress,
        notStarted
      });
    } catch (err: any) {
      addToast({
        message: `Failed to load ${fw.name} data: ${err.message || 'Server error'}`,
        type: 'error'
      });
      setControls([]);
      setScore(0);
      setOverallStats({ total: 0, implemented: 0, inProgress: 0, notStarted: 0 });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadFrameworkData(selectedFramework);
  }, [selectedFramework, loadFrameworkData]);

  // Color mapping based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle className="h-2.5 w-2.5" /> Implemented
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <Clock className="h-2.5 w-2.5" /> In Progress
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/30">
            <AlertTriangle className="h-2.5 w-2.5" /> Not Started
          </span>
        );
    }
  };

  const getStatusColorClass = (ctrl: Control) => {
    switch (ctrl.status) {
      case 'IMPLEMENTED':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      default: {
        // NOT_STARTED checks if overdue (>30 days)
        const isOverdue = ctrl.createdAt 
          ? (Date.now() - new Date(ctrl.createdAt).getTime()) / (1000 * 60 * 60 * 24) > 30 
          : false;
        if (isOverdue) {
          return 'bg-red-500/20 border-red-500/50 text-red-400';
        }
        return 'bg-zinc-900 border-zinc-800 text-zinc-500';
      }
    }
  };

  const weakestControls = controls
    .filter(c => c.status !== 'IMPLEMENTED')
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 bg-[#0c0c14] min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-800/60">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--royal-indigo)]" />
            AI Readiness & Posture Dashboard
          </h1>
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
            Real-time cross-framework compliance metrics & gap analysis
          </p>
        </div>
        <button
          onClick={() => loadFrameworkData(selectedFramework)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all active:scale-95"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Recalculate
        </button>
      </div>

      {/* Grid: Framework Tabs Left / Contents Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Framework Selector */}
        <div className="lg:col-span-3 space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-2 px-2">
            Target Standards
          </span>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0">
            {FRAMEWORKS.map((fw) => {
              const Icon = fw.icon;
              const isSelected = selectedFramework.id === fw.id;
              return (
                <button
                  key={fw.id}
                  onClick={() => setSelectedFramework(fw)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border text-left min-w-[160px] lg:min-w-0 transition-all duration-200 active:scale-95 shrink-0",
                    isSelected 
                      ? "bg-[var(--mid-indigo)]/10 border-[var(--royal-indigo)] text-white shadow-lg shadow-[var(--royal-indigo)]/5" 
                      : "bg-zinc-950/20 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-[var(--royal-indigo)]" : "text-zinc-500")} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider truncate">{fw.name}</p>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5 block lg:hidden xl:block">
                      {fw.id === 'eu-ai-act' ? 'AI Act Standard' : 'Risk Framework'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Display */}
        <div className="lg:col-span-9 space-y-6">
          {/* Active Framework Context */}
          <div className="card-base p-6 bg-zinc-950/20 border-zinc-900">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {selectedFramework.name} Readiness
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {selectedFramework.description}
            </p>
          </div>

          {/* Stats & Circular Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Score Gauge */}
            <div className="md:col-span-4 card-base p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                Overall Readiness
              </span>
              
              {/* SVG circular progress indicator */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    className="text-zinc-800"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="38"
                    cx="50"
                    cy="50"
                  />
                  {/* Active Indicator */}
                  <circle
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      score > 75 ? "text-emerald-500" : score > 40 ? "text-amber-500" : "text-rose-500"
                    )}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - score / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="38"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white font-mono">{score}%</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 -mt-1">Ready</span>
                </div>
              </div>

              <div className="mt-4 text-[10px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-widest">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                {score > 70 ? 'Optimal Posture' : 'Gaps Identified'}
              </div>
            </div>

            {/* Core Stats Details */}
            <div className="md:col-span-8 grid grid-cols-2 gap-4">
              <div className="card-base p-4 bg-zinc-950/10 border-zinc-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Total Controls</span>
                  <h3 className="text-2xl font-black text-white mt-1 font-mono">{loading ? '...' : overallStats.total}</h3>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase mt-2">Mapped requirements</p>
              </div>

              <div className="card-base p-4 bg-zinc-950/10 border-zinc-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Implemented</span>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{loading ? '...' : overallStats.implemented}</h3>
                </div>
                <p className="text-[9px] text-emerald-500/70 uppercase mt-2">Fully verified</p>
              </div>

              <div className="card-base p-4 bg-zinc-950/10 border-zinc-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">In Progress</span>
                  <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{loading ? '...' : overallStats.inProgress}</h3>
                </div>
                <p className="text-[9px] text-amber-500/70 uppercase mt-2">Under remediation</p>
              </div>

              <div className="card-base p-4 bg-zinc-950/10 border-zinc-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Not Started</span>
                  <h3 className="text-2xl font-black text-zinc-400 mt-1 font-mono">{loading ? '...' : overallStats.notStarted}</h3>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase mt-2">Pending assessment</p>
              </div>
            </div>
          </div>

          {/* Heatmap Control Blocks Grid */}
          <div className="card-base p-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-4">
              Control Status Visual Map
            </span>

            {loading ? (
              <div className="py-12 flex justify-center items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
                Aggregating Controls...
              </div>
            ) : controls.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs italic">
                No controls found for this framework.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2">
                  {controls.map((ctrl) => (
                    <div
                      key={ctrl.code}
                      title={`${ctrl.code}: ${ctrl.title} (${ctrl.status})`}
                      className={cn(
                        "aspect-square rounded border flex items-center justify-center text-[9px] font-bold font-mono transition-all hover:scale-110 cursor-help select-none",
                        getStatusColorClass(ctrl)
                      )}
                    >
                      {ctrl.code.slice(-3)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-6 justify-end text-[8px] font-black uppercase tracking-widest text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/50 block" /> Implemented
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/50 block" /> In Progress
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/50 block" /> Overdue
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800 block" /> Not Started
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gap Analysis / Weakest Controls list */}
          <div className="card-base p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Actionable Gap Analysis / Weakest Controls
              </span>
              <span className="text-[8px] font-bold text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                Needs Attention
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
                Analyzing gaps...
              </div>
            ) : weakestControls.length === 0 ? (
              <div className="py-8 text-center text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs font-bold uppercase tracking-widest">
                🎉 Framework is 100% compliant! No gaps identified.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50 space-y-4">
                {weakestControls.map((ctrl) => (
                  <div key={ctrl.code} className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded">
                          {ctrl.code}
                        </span>
                        <h4 className="text-xs font-bold text-white tracking-wide">{ctrl.title}</h4>
                      </div>
                      <p className="text-[10px] text-zinc-400 max-w-2xl">
                        {ctrl.description || 'No description or mitigation instructions specified.'}
                      </p>
                      <p className="text-[9px] text-zinc-600 font-mono">
                        Clause / Section: {ctrl.clause}
                      </p>
                    </div>
                    
                    <div className="shrink-0 flex items-center gap-3">
                      {getStatusBadge(ctrl.status)}
                      <button 
                        onClick={() => addToast({ message: 'Select compliance framework detail view from Sidebar to edit controls.', type: 'info' })}
                        className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 rounded transition-all active:scale-95"
                        title="Configure control implementation"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
