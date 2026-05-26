import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ChevronRight, RefreshCw, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchFrameworkMap, fetchGapAnalysis, fetchOverlapScore, FrameworkMappingItem, GapAnalysisItem } from '@/lib/api';

export default function GovernanceOS() {
  const [mappings, setMappings] = useState<FrameworkMappingItem[]>([]);
  const [gaps, setGaps] = useState<GapAnalysisItem[]>([]);
  const [overlap, setOverlap] = useState<{ score: number; totalMapped: number; totalImplemented: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mapper' | 'gaps'>('mapper');

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
        return <span className="badge-pill bg-emerald-50 text-emerald-600 border border-emerald-100">IMPLEMENTED</span>;
      case 'in_progress':
        return <span className="badge-pill bg-indigo-50 text-indigo-600 border border-indigo-100">IN PROGRESS</span>;
      case 'not_applicable':
        return <span className="badge-pill bg-slate-100 text-slate-400 border border-slate-200">N/A</span>;
      default:
        return <span className="badge-pill bg-amber-50 text-amber-500 border border-amber-100">NOT STARTED</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return <span className="badge-pill bg-rose-50 border border-rose-200 text-rose-600 text-[8px]">HIGH SEVERITY</span>;
      case 'medium':
        return <span className="badge-pill bg-amber-50 border border-amber-200 text-amber-600 text-[8px]">MEDIUM RISK</span>;
      default:
        return <span className="badge-pill bg-blue-50 border border-blue-200 text-blue-600 text-[8px]">LOW DISCREPANCY</span>;
    }
  };

  // Get dynamic direct navigation anchors for the Compliance.tsx tab lists
  const getComplianceAnchor = (framework: string) => {
    const formatted = framework?.toUpperCase();
    if (formatted.includes('EU')) return '/app/compliance?tab=eu-ai-act';
    if (formatted.includes('NIST')) return '/app/compliance?tab=nist-ai-rmf';
    if (formatted.includes('42001')) return '/app/compliance?tab=iso-42001';
    if (formatted.includes('27001')) return '/app/compliance?tab=iso-27001';
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
            <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">GovernanceOS framework Mapper</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Harmonize controls between NIST AI RMF, EU AI Act, ISO 42001, and ISO 27001 to resolve double-work gaps</p>
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
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2 font-mono">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--royal-indigo)]" />
          COMPILING GOVERNANCE MAPPING MATRIX...
        </div>
      ) : (
        <>
          {/* Posture Overlay Score & Gauge Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Radial Gauge */}
            <div className="card-base bg-white p-6 flex flex-col items-center justify-center gap-4 text-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Framework Coverage Overlap</h3>
              
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
                  <span className="text-2xl font-black text-slate-800">{overlap?.score || 0}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Overlap</span>
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed max-w-xs">
                Your consistent posture index reflects control overlap coverage across all 4 frameworks.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-base p-6 flex flex-col justify-between bg-white border-l-4 border-l-[var(--royal-indigo)]">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total concern areas Mapped</div>
                  <div className="text-3xl font-black mt-2 text-slate-800">{overlap?.totalMapped || 15}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  NIST AI RMF mapped cleanly to EU AI Act & ISO 42001
                </div>
              </div>

              <div className="card-base p-6 flex flex-col justify-between bg-white border-l-4 border-l-teal-500">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Implemented Controls</div>
                  <div className="text-3xl font-black mt-2 text-teal-600">{overlap?.totalImplemented || 0}</div>
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
            <div className="border-b border-slate-100 bg-slate-50 flex items-center px-4 py-2 justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('mapper')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded ${
                    activeTab === 'mapper' ? 'bg-white text-[var(--royal-indigo)] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Cross-Framework mapper
                </button>
                <button
                  onClick={() => setActiveTab('gaps')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded flex items-center gap-1.5 ${
                    activeTab === 'gaps' ? 'bg-white text-[var(--royal-indigo)] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Gaps checklist
                  {gaps.length > 0 && (
                    <span className="badge-pill bg-rose-100 text-rose-600 font-black text-[9px]">{gaps.length}</span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              
              {/* Tab 1: Mappings Grid */}
              {activeTab === 'mapper' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Concern Area</th>
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">NIST AI RMF</th>
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">EU AI Act</th>
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">ISO/IEC 42001</th>
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">ISO/IEC 27001</th>
                      <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Unified Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[12px] text-slate-800 leading-normal">{m.concernArea}</div>
                        </td>
                        
                        {/* NIST */}
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-[10px] text-slate-600 block">{m.nistCode}</span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[120px]">{m.nistTitle}</span>
                        </td>

                        {/* EU */}
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-[10px] text-indigo-600 block">{m.euArticle}</span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[120px]">{m.euTitle}</span>
                        </td>

                        {/* ISO 42001 */}
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-[10px] text-purple-600 block">{m.iso42001Control}</span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[120px]">{m.iso42001Title}</span>
                        </td>

                        {/* ISO 27001 */}
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-[10px] text-teal-600 block">{m.iso27001Control}</span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[120px]">{m.iso27001Title}</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(m.status)}
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
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[var(--royal-indigo)] hover:text-[var(--mid-indigo)] active:scale-95 transition-all"
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
