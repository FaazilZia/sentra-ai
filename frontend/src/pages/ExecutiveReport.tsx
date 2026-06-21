import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useEffect, useState } from 'react';
import { apiRequest, apiBaseUrl } from '@/lib/api';
import { 
  BarChart3, FileDown, ShieldCheck, ClipboardCheck, 
  Building2, AlertTriangle, Award, ShieldAlert, Cpu, Share
} from 'lucide-react';
import { ShareModal } from '@/components/shared/ShareModal';

interface ExecutiveStats {
  totalSystems: number;
  systemsByTier: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  totalObligations: number;
  obligationsByStatus: {
    PENDING: number;
    IN_PROGRESS: number;
    MET: number;
    NOT_APPLICABLE: number;
  };
  activeControls: number;
  totalControls: number;
  totalVendors: number;
  vendorsByStatus: {
    PENDING: number;
    APPROVED: number;
    FLAGGED: number;
  };
  driftAlertsCount: number;
}

export default function ExecutiveReport() {
  const [stats, setStats] = useState<ExecutiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ExecutiveStats>('/reports/executive');
      setStats(res);
    } catch (err) {
      console.error('Failed to load executive statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`${apiBaseUrl}/reports/compliance/pdf`, '_blank');
  };

  const handleDownloadDocx = () => {
    window.open(`${apiBaseUrl}/reports/compliance/docx`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40  ">
        <NodePulseLoader label="Assembling executive governance report..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)] text-xs">
        Failed to load executive report metrics.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-400" />
            EXECUTIVE GOVERNANCE REPORT
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Consolidated enterprise AI risk distribution, compliance obligation status, and operational controls library metrics.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--bg-page)] transition-all hover:scale-105 active:scale-95"
          >
            <Share className="h-4 w-4 text-indigo-400" />
            Share
          </button>

          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--bg-page)] transition-all hover:scale-105 active:scale-95"
          >
            <FileDown className="h-4 w-4 text-teal-400" />
            Download Word
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95 animate-pulse"
          >
            <FileDown className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Total Systems */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">Total AI Systems</span>
            <span className="text-2xl font-semibold text-white mt-1 block">{stats.totalSystems}</span>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3">
            <Cpu className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        {/* Active Controls */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">Active Controls MET</span>
            <span className="text-2xl font-semibold text-emerald-400 mt-1 block">{stats.activeControls} <span className="text-xs text-[var(--text-muted)] font-normal">/ {stats.totalControls}</span></span>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        {/* Obligations MET */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">Obligations Resolved</span>
            <span className="text-2xl font-semibold text-indigo-400 mt-1 block">{stats.obligationsByStatus.MET} <span className="text-xs text-[var(--text-muted)] font-normal">/ {stats.totalObligations}</span></span>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3">
            <ClipboardCheck className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        {/* Vendor tools */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">External Vendor Tools</span>
            <span className="text-2xl font-semibold text-purple-400 mt-1 block">{stats.totalVendors}</span>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3">
            <Building2 className="h-6 w-6 text-purple-400" />
          </div>
        </div>

      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Systems by risk tier */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-indigo-400" />
            AI Risk Distribution
          </h3>
          
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
              <span className="font-bold text-red-400 text-xs">CRITICAL TIER</span>
              <span className="font-semibold text-red-300 text-sm">{stats.systemsByTier.CRITICAL}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <span className="font-bold text-orange-400 text-xs">HIGH TIER</span>
              <span className="font-semibold text-orange-300 text-sm">{stats.systemsByTier.HIGH}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <span className="font-bold text-yellow-400 text-xs">MEDIUM TIER</span>
              <span className="font-semibold text-yellow-300 text-sm">{stats.systemsByTier.MEDIUM}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="font-bold text-emerald-400 text-xs">LOW TIER</span>
              <span className="font-semibold text-emerald-300 text-sm">{stats.systemsByTier.LOW}</span>
            </div>
          </div>
        </div>

        {/* Compliance obligations statuses */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            Obligations Performance
          </h3>
          
          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Total MET (Compliant)</span>
              <span className="font-bold text-emerald-400">{stats.obligationsByStatus.MET}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">In Progress (Active)</span>
              <span className="font-bold text-indigo-400">{stats.obligationsByStatus.IN_PROGRESS}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Pending Review</span>
              <span className="font-bold text-yellow-400">{stats.obligationsByStatus.PENDING}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Not Applicable (Exempt)</span>
              <span className="font-bold text-[var(--text-muted)]">{stats.obligationsByStatus.NOT_APPLICABLE}</span>
            </div>
          </div>
        </div>

        {/* Third-party vendors review status */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-400" />
            External Vendors Review
          </h3>
          
          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Approved SaaS Tools</span>
              <span className="font-bold text-emerald-400">{stats.vendorsByStatus.APPROVED}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Pending Safety Audits</span>
              <span className="font-bold text-yellow-400">{stats.vendorsByStatus.PENDING}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Flagged / Restricted Integrations</span>
              <span className="font-bold text-red-400">{stats.vendorsByStatus.FLAGGED}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60">
              <span className="text-[var(--text-secondary)]">Dynamic Drift Alerts Logged</span>
              <span className="font-bold text-red-400/90 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {stats.driftAlertsCount}
              </span>
            </div>
          </div>
        </div>

      </div>

      <ShareModal
        resourceType="report"
        resourceId={null}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
