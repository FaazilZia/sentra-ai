import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ChevronRight, RefreshCw, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchFrameworkMap, fetchGapAnalysis, fetchOverlapScore, FrameworkMappingItem, GapAnalysisItem } from '@/lib/api';
import { NodePulseLoader } from '@/components/ui/NodePulseLoader';

export default function GovernanceOS() {
  const [mappings, setMappings] = useState<FrameworkMappingItem[]>([]);
  const [gaps, setGaps] = useState<GapAnalysisItem[]>([]);
  const [overlap, setOverlap] = useState<{ score: number; totalMapped: number; totalImplemented: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mapper' | 'gaps'>('mapper');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredMappings = mappings.filter(m => {
    if (statusFilter === 'ALL') return true;
    return m.overallStatus?.toLowerCase() === statusFilter.toLowerCase();
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mapData, gapData, overlapData] = await Promise.all([
        fetchFrameworkMap(),
        fetchGapAnalysis(),
        fetchOverlapScore()
      ]);
      setMappings(mapData);
      setGaps(gapData);
      setOverlap(overlapData);
    } catch (err) {
      console.error('Failed to load GovernanceOS mapper data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'implemented':
        return <span className="badge-pill bg-emerald-50 text-emerald-600 border border-emerald-100">Implemented</span>;
      case 'in_progress':
        return <span className="badge-pill bg-indigo-50 text-indigo-600 border border-indigo-100">In progress</span>;
      case 'not_applicable':
        return <span className="badge-pill bg-slate-100 text-slate-400 border border-slate-200">N/A</span>;
      default:
        return <span className="badge-pill bg-amber-50 text-amber-500 border border-amber-100">Not started</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return <span className="badge-pill bg-rose-50 border border-rose-200 text-rose-600 text-[8px]">High severity</span>;
      case 'medium':
        return <span className="badge-pill bg-amber-50 border border-amber-200 text-amber-600 text-[8px]">Medium risk</span>;
      default:
        return <span className="badge-pill bg-blue-50 border border-blue-200 text-blue-600 text-[8px]">Low discrepancy</span>;
    }
  };

  // Get dynamic direct navigation anchors for the Compliance.tsx tab lists
  const getComplianceAnchor = (framework: string) => {
    const formatted = framework?.toUpperCase();
    if (formatted.includes('GDPR')) return '/app/compliance?tab=gdpr';
    if (formatted.includes('DPDP')) return '/app/compliance?tab=dpdp';
    if (formatted.includes('HIPAA')) return '/app/compliance?tab=hipaa';
    if (formatted.includes('PCI')) return '/app/compliance?tab=pci-dss';
    if (formatted.includes('NIST')) return '/app/compliance?tab=nist-ai-rmf';
    return '/app/compliance';
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 bg-white px-4 py-3 rounded-[var(--radius)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl text-[var(--royal-indigo)]">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">GovernanceOS Framework Mapper</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Harmonize concern domains between GDPR, DPDP, HIPAA, PCI-DSS, and NIST AI RMF to resolve compliance gaps</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload Mapper
        </button>
      </div>

      {isLoading ? (
        <NodePulseLoader label="Compiling governance mapping matrix…" className="p-12" />
      ) : (
        <>
          {/* Posture Overlay Score & Gauge Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Radial Gauge */}
            <div className="card-base bg-white p-6 flex flex-col items-center justify-center gap-4 text-center">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Framework coverage overlap</h3>
              
              <div className="relative h-32 w-32 flex items-center justify-center mt-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="#F1F5F9"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="var(--royal-indigo)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={(2 * Math.PI * 52) * (1 - (overlap?.score || 0) / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-semibold text-slate-800">{overlap?.score || 0}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Overlap</span>
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed max-w-xs">
                Your consistent posture index reflects control overlap coverage across all 5 supported frameworks.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-base p-6 flex flex-col justify-between bg-white border-l-4 border-l-[var(--royal-indigo)]">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total concern areas mapped</div>
                  <div className="text-3xl font-semibold mt-2 text-slate-800">{overlap?.totalMapped || 15}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  GDPR, DPDP, HIPAA, PCI-DSS & NIST AI RMF mapped cleanly
                </div>
              </div>

              <div className="card-base p-6 flex flex-col justify-between bg-white border-l-4 border-l-teal-500">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Implemented controls</div>
                  <div className="text-3xl font-semibold mt-2 text-teal-600">{overlap?.totalImplemented || 0}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-4">
                  <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
                  Real-time status updates synced with DB evidence
                </div>
              </div>
            </div>

          </div>

          {/* Mapping Matrix tabs */}
          <div className="card-base bg-white overflow-hidden shadow-sm flex-1">
            <div className="border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center px-4 py-2 justify-between gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('mapper')}
                  className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all rounded ${
                    activeTab === 'mapper' ? 'bg-white text-[var(--royal-indigo)] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Cross-Framework mapper
                </button>
                <button
                  onClick={() => setActiveTab('gaps')}
                  className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all rounded flex items-center gap-1.5 ${
                    activeTab === 'gaps' ? 'bg-white text-[var(--royal-indigo)] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Gaps checklist
                  {gaps.length > 0 && (
                    <span className="badge-pill bg-rose-100 text-rose-600 font-semibold text-[9px]">{gaps.length}</span>
                  )}
                </button>
              </div>
              {activeTab === 'mapper' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-600 focus:outline-none focus:border-[var(--royal-indigo)]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="IMPLEMENTED">Implemented</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto overflow-x-auto relative">
              
              {/* Tab 1: Mappings Grid */}
              {activeTab === 'mapper' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">Concern Domain</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">GDPR</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">DPDP</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">HIPAA</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">PCI-DSS</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">NIST AI RMF</th>
                      <th className="px-4 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">Overall Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-[12px] text-slate-800 leading-normal">{m.concernDomain}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{m.description}</div>
                        </td>
                        
                        {/* GDPR */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-slate-600 block">{m.citations?.GDPR}</span>
                          {getStatusBadge(m.frameworkStatuses?.GDPR)}
                        </td>

                        {/* DPDP */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-indigo-600 block">{m.citations?.DPDP}</span>
                          {getStatusBadge(m.frameworkStatuses?.DPDP)}
                        </td>

                        {/* HIPAA */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-purple-600 block">{m.citations?.HIPAA}</span>
                          {getStatusBadge(m.frameworkStatuses?.HIPAA)}
                        </td>

                        {/* PCI-DSS */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-teal-600 block">{m.citations?.PCI_DSS}</span>
                          {getStatusBadge(m.frameworkStatuses?.PCI_DSS)}
                        </td>

                        {/* NIST AI RMF */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-emerald-600 block">{m.citations?.NIST_AI_RMF}</span>
                          {getStatusBadge(m.frameworkStatuses?.NIST_AI_RMF)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {getStatusBadge(m.overallStatus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab 2: Gap Checklist */}
              {activeTab === 'gaps' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gaps.length === 0 ? (
                    <div className="col-span-2 p-12 text-center text-slate-400 text-xs font-medium">
                      No redundant compliance gaps detected! All mapped controls are implementation-consistent.
                    </div>
                  ) : (
                    gaps.map((gap, i) => (
                      <div 
                        key={i} 
                        className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex flex-col justify-between gap-4 hover:border-indigo-300 transition-all hover:shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-[10px] text-[var(--royal-indigo)] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              {gap.framework} {'/'} {gap.controlCode}
                            </span>
                            {getSeverityBadge(gap.severity)}
                          </div>
                          
                          <h4 className="text-[12px] font-bold text-slate-800 leading-normal">{gap.controlTitle}</h4>
                          
                          {/* Mapping alignment detail */}
                          <div className="mt-3 bg-white border border-slate-200/40 rounded-lg p-2.5 space-y-1">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wide">Maturity overlap alignment</div>
                            <p className="text-[10px] text-slate-600 font-medium">
                              Equivalent control <span className="font-bold text-indigo-600">{gap.mappedControl}</span> is active, but {gap.framework} requires explicit verification.
                            </p>
                          </div>
                        </div>

                        {/* Navigation Anchor */}
                        <div className="flex justify-end pt-2 border-t border-slate-200/40">
                          <Link 
                            to={getComplianceAnchor(gap.framework)}
                            className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--royal-indigo)] hover:text-[var(--mid-indigo)] active:scale-95 transition-all"
                          >
                            Resolve in Framework
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
}
