import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  MoreVertical,
  X,
  ShieldAlert,
  Sliders,
  Share,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { EvidenceSection } from '../components/shared/EvidenceSection';
import { ChangeHistoryTimeline } from '../components/shared/ChangeHistoryTimeline';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useSocketStore } from '@/store/useSocketStore';
import { 
  fetchGuardrailMetrics, GuardrailMetrics,
  fetchRiskPortfolio, fetchOrgRiskTrend, updateAgentRiskScore,
  RiskPortfolioResponse 
} from '@/lib/api';
import { ShareModal } from '@/components/shared/ShareModal';

const severityData = [
  { name: 'Critical Risk', value: 2, color: '#EF4444' },
  { name: 'High Risk', value: 5, color: '#F59E0B' },
  { name: 'Medium Risk', value: 8, color: '#3B82F6' },
  { name: 'Low Risk', value: 12, color: '#10B981' }
];

export default function RiskCenter() {
  const addToast = useStore((state) => state.addToast);
  const { riskEvents } = useSocketStore();
  
  // Guardrails metrics & portfolio states
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null);
  const [portfolio, setPortfolio] = useState<RiskPortfolioResponse | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog / Interaction states
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [overrideAgent, setOverrideAgent] = useState<any | null>(null);
  const [overrideLikelihood, setOverrideLikelihood] = useState(30);
  const [overrideImpact, setOverrideImpact] = useState(30);
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchData = async () => {
    try {
      const [metricsRes, portfolioRes, trendRes] = await Promise.all([
        fetchGuardrailMetrics(),
        fetchRiskPortfolio(),
        fetchOrgRiskTrend(30)
      ]);
      setMetrics(metricsRes);
      setPortfolio(portfolioRes);
      setTrendData(trendRes.map(t => ({ name: t.date, score: t.score })));
    } catch (err) {
      console.error('Failed to fetch risk center metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    addToast({ message: 'Generating Global Risk Report...', type: 'info' });
    setTimeout(() => addToast({ message: 'Report generated successfully. Download started.', type: 'success' }), 1500);
  };

  const openOverrideModal = (agent: any) => {
    setOverrideAgent(agent);
    setOverrideLikelihood(agent.likelihood);
    setOverrideImpact(agent.impact);
  };

  const handleSaveOverride = async () => {
    if (!overrideAgent) return;
    setSavingOverride(true);
    try {
      await updateAgentRiskScore(
        overrideAgent.agentId,
        overrideLikelihood,
        overrideImpact,
        'Manual override adjustment via Risk Center'
      );
      addToast({ message: `Successfully updated risk parameters for ${overrideAgent.agentName}`, type: 'success' });
      setOverrideAgent(null);
      fetchData(); // reload updated portfolio
    } catch (err) {
      console.error('Failed to update agent risk parameters:', err);
      addToast({ message: 'Failed to save manual override parameters', type: 'danger' });
    } finally {
      setSavingOverride(false);
    }
  };

  // Live Composite Score Preview
  const liveComposite = Math.round(((overrideLikelihood * overrideImpact) / 100) * 10) / 10;

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Risk Center</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Real-time Threat Detection & Mitigation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            <Share className="h-3.5 w-3.5 text-indigo-400" />
            Share
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Aggregate Risk Score" 
          value={portfolio ? String(portfolio.averageScore) : "0"} 
          icon="risks" 
          status={portfolio && portfolio.averageScore > 66 ? "danger" : portfolio && portfolio.averageScore > 33 ? "warning" : "success"} 
          isLoading={loading}
        />
        <KPICard 
          label="Critical Findings" 
          value={portfolio ? String(portfolio.highRiskCount) : "0"} 
          icon="risks" 
          status="danger" 
          isLoading={loading}
        />
        <KPICard 
          label="Medium Concerns" 
          value={portfolio ? String(portfolio.mediumRiskCount) : "0"} 
          icon="risks" 
          status="warning" 
          isLoading={loading}
        />
        <KPICard 
          label="Threat Auto-Mitigations" 
          value={metrics?.blockedCount ?? "0"} 
          icon="compliance" 
          status="success" 
          testId="threats-prevented-count"
          isLoading={loading}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Trend Chart */}
        <div className="lg:col-span-8 card-base p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] text-gray-400">Org-wide Risk Score Trend (30 Days)</h3>
            <div className="flex items-center gap-2">
              {portfolio && (
                <span className={cn(
                  "flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest",
                  portfolio.trend <= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
                )}>
                  <TrendingUp className={cn("h-3 w-3", portfolio.trend <= 0 && "rotate-180")} />
                  {portfolio.trend === 0 ? 'Stable' : `${portfolio.trend > 0 ? '+' : ''}${portfolio.trend} vs last week`}
                </span>
              )}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {trendData.length > 0 ? (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--royal-indigo)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--royal-indigo)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split('-')[2] || val}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}
                    itemStyle={{ color: 'var(--lavender)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--royal-indigo)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRisk)" 
                  />
                </AreaChart>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                  No historical risk logs recorded yet
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="lg:col-span-4 card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] mb-6 uppercase tracking-wider text-[11px] text-gray-400">Severity Breakdown</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(severityData || []).map((entry, index) => (
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
            {(severityData || []).map((item) => (
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

      {/* Quantitative Risk Score Portfolio Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-black/5">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Active AI Agent Risk Matrix</h3>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
              Live quantitative assessment scorecards
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-[var(--border-default)] font-mono text-[var(--text-secondary)] uppercase">
              <tr>
                <th className="px-6 py-4">Agent / System</th>
                <th className="px-6 py-4">Composite Risk Score</th>
                <th className="px-6 py-4">Likelihood Rate</th>
                <th className="px-6 py-4">Business Impact</th>
                <th className="px-6 py-4">Last Assessment</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {portfolio && portfolio.scoresByAgent && portfolio.scoresByAgent.length > 0 ? (
                portfolio.scoresByAgent.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        agent.compositeScore <= 33 ? "bg-emerald-400" : agent.compositeScore <= 66 ? "bg-amber-400" : "bg-red-400"
                      )} />
                      {agent.agentName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                        agent.compositeScore <= 33 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        agent.compositeScore <= 66 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                      )}>
                        {agent.compositeScore} - {agent.compositeScore <= 33 ? 'Low' : agent.compositeScore <= 66 ? 'Medium' : 'High'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-200">{agent.likelihood} / 100</td>
                    <td className="px-6 py-4 font-bold text-gray-200">{agent.impact} / 100</td>
                    <td className="px-6 py-4 text-[var(--text-muted)] font-mono">{new Date(agent.lastUpdated).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openOverrideModal(agent)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[var(--royal-indigo)] hover:bg-[var(--royal-indigo)]/10 text-[9px] font-black uppercase tracking-wider rounded-lg text-indigo-400 hover:text-white transition-all ml-auto"
                      >
                        <Sliders className="h-3 w-3" />
                        Override
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <ShieldAlert className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No agents mapped for assessment</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Events Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">Active Threat Alerts</h3>
          <button 
            onClick={() => addToast({ message: 'Navigating to full events ledger...', type: 'info' })}
            className="text-[var(--text-xs)] font-bold text-[var(--royal-indigo)] uppercase tracking-widest hover:underline"
          >
            View All Events
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-3">Agent / System</th>
                <th className="px-6 py-3">Detected Action</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {riskEvents.length > 0 ? riskEvents.map((event) => (
                <tr key={event.id} className="group hover:bg-[var(--bg-hover)] transition-colors cursor-default">
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{event.agent}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">{event.action}</span>
                      {event.aiSummary && (
                        <p className="max-w-xl text-[10px] leading-relaxed text-[var(--text-muted)]">
                          {event.aiSummary}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      event.severity === 'Critical' ? "bg-[var(--risk-critical)] text-[var(--risk-critical-text)] shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                      event.severity === 'High' ? "bg-[var(--risk-high)] text-[var(--risk-high-text)]" :
                      event.severity === 'Medium' ? "bg-[var(--risk-medium)] text-[var(--risk-medium-text)]" :
                      "bg-[var(--risk-low)] text-[var(--risk-low-text)]"
                    )}>
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{event.time}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      event.status === 'Blocked' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      event.status === 'Flagged' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    )}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedIncident(event)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-white/5 transition-all"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertTriangle className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No active risk events</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Sliders Modal */}
      {overrideAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setOverrideAgent(null)}
            className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" 
          />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Manual Risk Override</h3>
                <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
                  Adjust metrics for {overrideAgent.agentName}
                </p>
              </div>
              <button 
                onClick={() => setOverrideAgent(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Score Preview Badge */}
              <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Computed Composite Score</span>
                  <span className="text-3xl font-black text-white block mt-1">{liveComposite}</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  liveComposite <= 33 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  liveComposite <= 66 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {liveComposite <= 33 ? 'Low Risk' : liveComposite <= 66 ? 'Medium Risk' : 'High Risk'}
                </span>
              </div>

              {/* Likelihood Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-[var(--text-secondary)]">Threat Likelihood</span>
                  <span className="text-white font-mono">{overrideLikelihood} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overrideLikelihood}
                  onChange={(e) => setOverrideLikelihood(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--royal-indigo)]"
                />
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider block">
                  Estimates frequency of threat generation based on external integrations
                </span>
              </div>

              {/* Impact Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-[var(--text-secondary)]">Business Impact</span>
                  <span className="text-white font-mono">{overrideImpact} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overrideImpact}
                  onChange={(e) => setOverrideImpact(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--royal-indigo)]"
                />
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider block">
                  Measures data sensitivity, exposure limits, and potential compliance breach scope
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-default)]">
                <button
                  onClick={() => setOverrideAgent(null)}
                  className="flex-1 px-4 py-2 border border-[var(--border-default)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={savingOverride}
                  onClick={handleSaveOverride}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[var(--royal-indigo)] transition-colors disabled:opacity-50"
                >
                  {savingOverride ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Save Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident details Drawer */}
      {selectedIncident && (
        <div className="fixed inset-y-0 right-0 z-50 w-[440px] bg-white border-l border-[var(--border-default)] shadow-2xl p-6 flex flex-col justify-between animate-fade-in text-left">
          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Incident details</span>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all outline-none"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-[13px] font-black uppercase tracking-tight text-[var(--text-primary)]">Threat in {selectedIncident.agent}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <span>Severity: {selectedIncident.severity}</span>
                <span>•</span>
                <span>{selectedIncident.time}</span>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Detected Action</h4>
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-[var(--border-default)] break-words">{selectedIncident.action}</p>
            </div>

            {selectedIncident.aiSummary && (
              <div className="space-y-1 text-left">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">AI Insight Summary</h4>
                <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{selectedIncident.aiSummary}</p>
              </div>
            )}

            {/* Evidence Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <EvidenceSection entityType="incident" entityId={selectedIncident.id} />
            </div>

            {/* Change History Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <ChangeHistoryTimeline entityType="incident" entityId={selectedIncident.id} />
            </div>
          </div>
        </div>
      )}

      {/* Share Modal Integration */}
      <ShareModal
        resourceType="risk"
        resourceId={null}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
