import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  Clock, 
  ShieldAlert,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { useStore } from '@/store/useStore';
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

  const loadData = async (showToast = false) => {
    try {
      setLoading(true);
      const [allAlerts, allAgents] = await Promise.all([
        fetchDriftAlerts(filter === 'all' ? undefined : filter),
        fetchAIAgents(),
      ]);
      setAlerts(allAlerts || []);
      setAgents(allAgents || []);
      if (showToast) {
        addToast({ message: 'Drift data successfully synced.', type: 'success' });
      }
    } catch (err) {
      console.error('Drift load error:', err);
      setAlerts([]);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds
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

  // Helper to map agentId to agent details
  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unknown Agent';
  };

  const getAgentModel = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.model : 'Unknown Model';
  };

  // KPI calculations
  const openAlertsCount = alerts.filter(a => a.status === 'open').length;
  const averageDriftScore = alerts.length > 0 
    ? Math.round((alerts.reduce((acc, a) => acc + a.driftScore, 0) / alerts.length) * 100)
    : 0;
  const criticalDriftCount = alerts.filter(a => a.status === 'open' && a.driftScore >= 0.7).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase flex items-center gap-2">
            <Activity className="h-6 w-6 text-[var(--mid-indigo)] animate-pulse" />
            Behavioral Drift Detection
          </h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Real-time Agent Behavioral Analysis & Baseline Alignment
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-1">
            {(['open', 'resolved', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                  filter === t 
                    ? "bg-[var(--mid-indigo)] text-white shadow-md shadow-indigo-500/10" 
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Trigger Scan Button */}
          <button 
            onClick={handleScan}
            disabled={scanning || loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              scanning && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} />
            {scanning ? 'Scanning...' : 'Run Scan Now'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Main Alert List */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-black/5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--royal-indigo)]" />
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">
              Behavioral Drift Registry ({alerts.length})
            </h3>
          </div>
          {alerts.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
              <TrendingUp className="h-3 w-3" />
              Real-time monitoring active
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading && alerts.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Analyzing baselines...</span>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-12 text-[var(--text-muted)]">
              <Inbox className="h-12 w-12 mb-4 text-[var(--text-muted)] opacity-30" />
              <p className="text-[11px] font-black uppercase tracking-widest mb-1">Behavioral baselines fully aligned</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium max-w-sm text-center">
                All registered AI systems are operating perfectly within their approved permission and scope limits.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
                <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                  <th className="px-6 py-4">AI Agent</th>
                  <th className="px-6 py-4">Unexpected Actions Detected</th>
                  <th className="px-6 py-4">Drift Severity</th>
                  <th className="px-6 py-4">Last Detected</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {alerts.map((alert) => {
                  const agentName = getAgentName(alert.agentId);
                  const agentModel = getAgentModel(alert.agentId);
                  const isCritical = alert.driftScore >= 0.7;


                  return (
                    <tr key={alert.id} className="group hover:bg-[var(--bg-hover)] transition-all">
                      {/* Agent Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded flex items-center justify-center shadow-lg",
                            alert.status === 'resolved' 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : (isCritical ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-400")
                          )}>
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{agentName}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{agentModel}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unexpected Actions list */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex flex-wrap gap-1.5">
                          {alert.unexpectedActions.map((act) => (
                            <span 
                              key={act} 
                              className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                                alert.status === 'resolved'
                                  ? "bg-slate-500/5 text-slate-400 border-slate-500/10"
                                  : (isCritical 
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.05)]" 
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20")
                              )}
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                        {alert.message && (
                          <p className="text-[9px] leading-relaxed text-[var(--text-muted)] font-medium mt-1.5">
                            {alert.message}
                          </p>
                        )}
                      </td>

                      {/* Drift Score Percentage */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1.5 bg-[var(--bg-page)] rounded-full overflow-hidden">
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
                            "text-[10px] font-black tabular-nums",
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
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
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
                      <td className="px-6 py-4 text-right">
                        {alert.status === 'open' ? (
                          <button
                            onClick={() => handleResolve(alert.id, agentName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded text-[9px] font-black text-emerald-400 uppercase tracking-widest transition-all active:scale-95"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center justify-end gap-1 select-none opacity-50">
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
    </div>
  );
}
