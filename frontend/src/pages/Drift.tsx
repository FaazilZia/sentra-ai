import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  Clock, 
  TrendingUp,
  Sparkles,
  FileText,
  X,
  Inbox,
  ShieldAlert
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiRequest } from '@/lib/api';
import { fetchAIAgents, fetchDriftAlerts, triggerDriftScan, resolveDriftAlert, DriftAlert, AIAgent } from '@/lib/api';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';

export default function Drift() {
  const addToast = useStore((state) => state.addToast);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');

  // Post-Market States
  const [postMarketDashboard, setPostMarketDashboard] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [postMarketReport, setPostMarketReport] = useState<any | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [postMarketError, setPostMarketError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadData = async (showToast = false) => {
    try {
      setLoading(true);
      let pmError: string | null = null;
      const [allAlerts, allAgents, pmRes] = await Promise.all([
        fetchDriftAlerts(filter === 'all' ? undefined : filter).catch(() => []),
        fetchAIAgents().catch(() => []),
        apiRequest<any>('/post-market-monitoring/dashboard').catch((err: any) => {
          pmError = err.message || 'Failed to load post-market telemetry overview.';
          return null;
        })
      ]);
      setAlerts(Array.isArray(allAlerts) ? allAlerts : []);
      setAgents(Array.isArray(allAgents) ? allAgents : []);
      setPostMarketError(pmError);
      if (pmRes) {
        setPostMarketDashboard(pmRes);
      } else {
        setPostMarketDashboard(null);
      }
      if (showToast) {
        addToast({ message: 'Drift data successfully synced.', type: 'success' });
      }
    } catch (err) {
      console.error('Drift load error:', err);
      setAlerts([]);
      setAgents([]);
      setPostMarketDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 15000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleScan = async () => {
    try {
      setScanning(true);
      addToast({ message: 'Initiating full system behavioral drift scan...', type: 'info' });
      await triggerDriftScan();
      await loadData();
      addToast({ message: 'Behavioral drift scan completed successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Manual drift scan failed:', err);
      addToast({ message: err.message || 'Manual drift scan failed', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: string, agentName: string) => {
    try {
      addToast({ message: `Resolving drift alert for ${agentName}...`, type: 'info' });
      await resolveDriftAlert(id);
      await loadData();
      addToast({ message: `Drift alert for ${agentName} resolved successfully.`, type: 'success' });
    } catch (err: any) {
      console.error('Failed to resolve drift alert:', err);
      addToast({ message: err.message || 'Failed to resolve drift alert', type: 'error' });
    }
  };

  const handleSeedBaselines = async () => {
    try {
      addToast({ message: 'Seeding behavioral baselines for all agents...', type: 'info' });
      const result = await apiRequest<any>('/drift/baseline/backfill-all', { method: 'POST' });
      addToast({ message: `Baselines seeded for ${result.data?.seeded || 0} agents. Running scan...`, type: 'success' });
      await handleScan();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to seed baselines', type: 'error' });
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);
    setPostMarketReport(null);
    addToast({ message: 'Compiling Drift, Incidents, and Evaluation Telemetry...', type: 'info' });
    try {
      const res = await apiRequest<any>('/post-market-monitoring/report');
      setPostMarketReport(res);
      setIsReportOpen(true);
      addToast({ message: 'Article 72 report compiled successfully!', type: 'success' });
      // Reload stats
      loadData();
    } catch (err: any) {
      console.error('Report compilation failed:', err);
      setReportError(err.message || 'Failed to compile Article 72 compliance report.');
      setIsReportOpen(true);
      addToast({ message: err.message || 'Report generation failed', type: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unknown Agent';
  };

  const getAgentModel = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.model : 'Unknown Model';
  };

  const openAlertsCount = alerts.filter(a => a.status === 'open').length;
  const averageDriftScore = alerts.length > 0 
    ? Math.round((alerts.reduce((acc, a) => acc + a.driftScore, 0) / alerts.length) * 100)
    : 0;
  const criticalDriftCount = alerts.filter(a => a.status === 'open' && a.driftScore >= 0.7).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6  ">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-400 animate-pulse" />
            Behavioral Drift Detection
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Real-time Agent Behavioral Analysis & Baseline Alignment
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Filter Tabs */}
          <div className="flex bg-[var(--bg-page)]/60 border border-[var(--border-default)] rounded-xl p-1">
            {(['open', 'resolved', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all",
                  filter === t 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Post-Market trigger report */}
          <button 
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-[10px] font-semibold text-white uppercase tracking-widest hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-pink-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
            {generatingReport ? 'Compiling...' : 'Compile Art. 72 Report'}
          </button>

          {/* Seed Baselines Button */}
          <button
            onClick={handleSeedBaselines}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-[var(--border-default)] rounded-xl text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest hover:bg-gray-700 transition-all active:scale-95"
          >
            <Activity className="h-4 w-4" />
            Seed Baselines
          </button>

          {/* Trigger Scan Button */}
          <button 
            onClick={handleScan}
            disabled={scanning || loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-xl text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              scanning && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} />
            {scanning ? 'Scanning...' : 'Run Scan Now'}
          </button>
        </div>
      </div>

      {/* Grid container for KPIs + Post Market Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: KPIs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard 
              label="Active Drift Alerts" 
              value={openAlertsCount.toString()} 
              icon="risks" 
              status={openAlertsCount > 0 ? "danger" : "success"} 
              isLoading={loading}
            />
            <KPICard 
              label="Average Drift Score" 
              value={`${averageDriftScore}%`} 
              icon="risks" 
              status={averageDriftScore > 50 ? "danger" : (averageDriftScore > 20 ? "warning" : "success")} 
              isLoading={loading}
            />
            <KPICard 
              label="Critical Anomalies" 
              value={criticalDriftCount.toString()} 
              icon="risks" 
              status={criticalDriftCount > 0 ? "danger" : "primary"} 
              isLoading={loading}
            />
            <KPICard 
              label="Behavioral Integrity" 
              value={`${100 - averageDriftScore}%`} 
              icon="compliance" 
              status={100 - averageDriftScore > 80 ? "success" : "warning"} 
              isLoading={loading}
            />
          </div>
        </div>

        {/* Right Side: Post-Market Widget */}
        <div className="lg:col-span-4 flex">
          <div className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-500/5 blur-xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">EU AI Act Post-Market</span>
                <span className="text-[9px] font-semibold uppercase text-purple-400 bg-purple-950/20 px-2 py-0.5 rounded border border-purple-500/10">
                  Article 72
                </span>
              </div>
              
              <h3 className="font-bold text-white text-sm mt-3">Post-Market Telemetry Overview</h3>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-1">
                Aggregated drift, incidents, and evaluation benchmarks from the last 30 days are automatically mapped into continuous reports.
              </p>
            </div>

            {postMarketError ? (
              <div className="my-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] flex items-start gap-2 text-left">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold block text-white uppercase text-[9px] tracking-wider">Telemetry Load Failed</span>
                  {postMarketError}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 my-4 pt-3.5 border-t border-[var(--border-default)] text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">30d Drift Count</span>
                  <span className="text-sm font-semibold text-white">{postMarketDashboard?.driftAlerts30d || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Open SLA Incidents</span>
                  <span className="text-sm font-semibold text-white">{postMarketDashboard?.openIncidents || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Avg Eval Score</span>
                  <span className="text-sm font-semibold text-indigo-400">{postMarketDashboard?.avgEvalScore || 80}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Days Since Eval</span>
                  <span className="text-sm font-semibold text-white">
                    {postMarketDashboard?.daysSinceLastEvaluation === -1 ? 'None run' : postMarketDashboard?.daysSinceLastEvaluation}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Alert List */}
      <div className="card-base overflow-hidden border border-[var(--border-default)] bg-[var(--bg-page)]/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-page)]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">
              Behavioral Drift Registry ({alerts.length})
            </h3>
          </div>
          {alerts.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
              <TrendingUp className="h-3 w-3" />
              Real-time monitoring active
            </span>
          )}
        </div>

        <div className="overflow-x-auto text-xs">
          {loading && alerts.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Analyzing baselines...</span>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-12 text-[var(--text-secondary)]">
              <Inbox className="h-12 w-12 mb-4 text-[var(--text-muted)] opacity-30" />
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1">Behavioral baselines fully aligned</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium max-w-sm text-center">
                All registered AI systems are operating perfectly within their approved permission and scope limits.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-950/20 border-b border-[var(--border-default)]">
                <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="px-6 py-4">AI Agent</th>
                  <th className="px-6 py-4">Unexpected Actions Detected</th>
                  <th className="px-6 py-4">Drift Severity</th>
                  <th className="px-6 py-4">Last Detected</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30 text-[var(--text-secondary)]">
                {alerts.map((alert) => {
                  const agentName = getAgentName(alert.agentId);
                  const agentModel = getAgentModel(alert.agentId);
                  const isCritical = alert.driftScore >= 0.7;

                  return (
                    <tr key={alert.id} className="group hover:bg-white/[0.01] transition-all">
                      {/* Agent Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded flex items-center justify-center shadow-lg border",
                            alert.status === 'resolved' 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                              : (isCritical ? "bg-rose-500/10 text-rose-500 border-rose-500/15" : "bg-amber-500/10 text-amber-400 border-amber-500/15")
                          )}>
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{agentName}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">{agentModel}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unexpected Actions list */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex flex-wrap gap-1.5">
                          {(alert.unexpectedActions || []).map((act) => (
                            <span 
                              key={act} 
                              className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                                alert.status === 'resolved'
                                  ? "bg-slate-500/5 text-slate-400 border-slate-500/10"
                                  : (isCritical 
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20")
                              )}
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                        {alert.message && (
                          <p className="text-[9px] leading-relaxed text-[var(--text-secondary)] font-medium mt-1.5">
                            {alert.message}
                          </p>
                        )}
                      </td>

                      {/* Drift Score Percentage */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                alert.status === 'resolved' 
                                  ? "bg-emerald-500" 
                                  : (isCritical ? "bg-rose-500" : "bg-amber-500")
                              )}
                              style={{ width: `${Math.round(alert.driftScore * 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold font-mono",
                            alert.status === 'resolved' 
                              ? "text-emerald-400" 
                              : (isCritical ? "text-rose-500" : "text-amber-400")
                          )}>
                            {Math.round(alert.driftScore * 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Time Detected */}
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(alert.detectedAt).toLocaleString()}
                        </span>
                      </td>

                      {/* Alert Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider",
                          alert.status === 'resolved' 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : (isCritical 
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20")
                        )}>
                          {alert.status === 'resolved' && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {alert.status === 'open' && <AlertTriangle className="h-2.5 w-2.5 animate-bounce" />}
                          {alert.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right pr-6">
                        {alert.status === 'open' ? (
                          <button
                            onClick={() => handleResolve(alert.id, agentName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-[var(--text-primary)] rounded text-[9px] font-semibold text-emerald-400 uppercase tracking-widest transition-all active:scale-95"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center justify-end gap-1 select-none opacity-50">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Aligned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Post-Market Compliance Report Drawer */}
      {isReportOpen && (postMarketReport || reportError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-in flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-page)]">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                <span className="text-sm font-bold uppercase tracking-wider text-white">Post-Market Monitoring Report</span>
              </div>
              <button 
                onClick={() => setIsReportOpen(false)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs text-left">
              
              {reportError ? (
                <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider block mb-1 text-[10px]">Report Compilation Failed</span>
                    <span>{reportError}</span>
                  </div>
                </div>
              ) : postMarketReport ? (
                <>
                  {/* Summary and Timeframe */}
                  <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded-2xl flex flex-col gap-1.5 leading-relaxed text-purple-300">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">Auditor Summary</span>
                      <span className="text-[9px] uppercase tracking-wider bg-purple-950/20 px-2 py-0.5 rounded border border-purple-500/10">
                        Timeframe: {postMarketReport.timeframeDays} days
                      </span>
                    </div>
                    <p className="text-white text-[13px] font-bold mt-1 leading-snug">{postMarketReport.summary}</p>
                    <span className="text-[9px] text-[var(--text-muted)] mt-2 font-mono">Generated: {new Date(postMarketReport.generatedAt).toLocaleString()}</span>
                  </div>

                  {/* Grid Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/20 border border-[var(--border-default)] p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Drift Events</span>
                      <span className="text-2xl font-semibold text-white mt-1.5 block">{postMarketReport.metrics.driftAlertsCount}</span>
                    </div>
                    <div className="bg-black/20 border border-[var(--border-default)] p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Open SLA Issues</span>
                      <span className="text-2xl font-semibold text-white mt-1.5 block">{postMarketReport.metrics.openIncidents}</span>
                    </div>
                    <div className="bg-black/20 border border-[var(--border-default)] p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Avg Evaluation</span>
                      <span className="text-2xl font-semibold text-indigo-400 mt-1.5 block">{postMarketReport.metrics.avgEvalScore}%</span>
                    </div>
                  </div>

                  {/* Incidents Breakdown */}
                  <div className="bg-black/10 border border-[var(--border-default)] p-5 rounded-2xl space-y-3">
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Incidents Severity Breakdown
                    </span>
                    
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400">
                        <span className="text-[9px] uppercase font-bold">High Severity</span>
                        <span className="text-lg font-semibold block mt-0.5">{postMarketReport.metrics.incidentsBySeverity.high}</span>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-orange-400">
                        <span className="text-[9px] uppercase font-bold">Medium Severity</span>
                        <span className="text-lg font-semibold block mt-0.5">{postMarketReport.metrics.incidentsBySeverity.medium}</span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-400">
                        <span className="text-[9px] uppercase font-bold">Low Severity</span>
                        <span className="text-lg font-semibold block mt-0.5">{postMarketReport.metrics.incidentsBySeverity.low}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Statuses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="bg-black/20 border border-[var(--border-default)] p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block">EU AI Act Art. 15 Status</span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1 block">Accuracy, Cyber, and Robustness</span>
                      </div>
                      <span className="text-sm font-semibold text-indigo-400 bg-indigo-950/20 px-3 py-1 rounded-xl border border-indigo-500/15 uppercase font-mono">
                        {postMarketReport.compliance.art15Status}
                      </span>
                    </div>

                    <div className="bg-black/20 border border-[var(--border-default)] p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block">EU AI Act Art. 72 Status</span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1 block">Post-Market Monitoring Obligations</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-400 bg-purple-950/20 px-3 py-1 rounded-xl border border-purple-500/15 uppercase font-mono">
                        {postMarketReport.compliance.art72Status}
                      </span>
                    </div>

                  </div>
                </>
              ) : null}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-default)] bg-gray-950/20 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsReportOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-md"
              >
                Close Report Overview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
