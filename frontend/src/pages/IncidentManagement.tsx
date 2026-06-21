import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Play,
  User,
  History
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface Incident {
  id: string;
  agent_id: string;
  policy_id: string | null;
  severity: number;
  action: string;
  details: string;
  prompt_excerpt: string;
  response_excerpt: string;
  event_metadata: any;
  created_at: string;
  status: string;
}

interface HistoryItem {
  id: string;
  changeType: string;
  changeNote: string | null;
  previousValue: any;
  newValue: any;
  createdAt: string;
  user?: {
    full_name: string;
    email: string;
  } | null;
}

export default function IncidentManagement() {
  const { addToast } = useStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panels
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<HistoryItem[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  
  // Scan status
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('IDLE');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form states
  const [logType, setLogType] = useState('prompt_injection');
  const [logSeverity, setLogSeverity] = useState('50');
  const [logAgent, setLogAgent] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Fetch incidents
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // Fetch list from backend
      const res = await apiRequest<{ data: Incident[] }>('/incidents');
      setIncidents(res?.data || []);
    } catch (err: any) {
      console.error(err);
      addToast({ message: err.message || 'Failed to load incidents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    checkScanStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const checkScanStatus = async () => {
    try {
      const res = await apiRequest<any>('/incidents/scan/status');
      if (res?.status === 'PROCESSING') {
        setScanStatus('PROCESSING');
        setScanProgress(res?.progress ?? 0);
        startPollingScan();
      } else {
        setScanStatus(res?.status || 'IDLE');
        setScanProgress(null);
      }
    } catch (err) {
      console.error('Failed to get scan status', err);
    }
  };

  const startPollingScan = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiRequest<any>('/incidents/scan/status');
        setScanProgress(res?.progress ?? 0);
        setScanStatus(res?.status || 'IDLE');
        if (res?.status !== 'PROCESSING') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setScanProgress(null);
          addToast({ 
            message: `Deep scan completed. Detected ${res?.result?.incidents_detected || 0} incidents.`, 
            type: 'success' 
          });
          fetchIncidents();
        }
      } catch (err) {
        console.error('Error polling scan status', err);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  const triggerScan = async () => {
    try {
      await apiRequest('/incidents/scan', { method: 'POST' });
      setScanStatus('PROCESSING');
      setScanProgress(0);
      addToast({ message: 'Deep scan initiated', type: 'info' });
      startPollingScan();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to trigger scan', type: 'error' });
    }
  };

  // Open incident side panel
  const handleOpenPanel = async (incident: Incident) => {
    setSelectedIncident(incident);
    setLoadingTimeline(true);
    setTimeline([]);
    try {
      const res = await apiRequest<HistoryItem[]>(`/incidents/${incident.id}/history`);
      setTimeline(res || []);
    } catch (err: any) {
      console.error('Failed to fetch timeline', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Update status inline
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiRequest(`/incidents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      addToast({ message: `Status updated to ${newStatus}`, type: 'success' });
      
      // Update local state
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus.toLowerCase() } : inc));
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus.toLowerCase() } : null);
        // Refresh history
        const timelineRes = await apiRequest<HistoryItem[]>(`/incidents/${id}/history`);
        setTimeline(timelineRes || []);
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  // Log incident submit
  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAgent.trim() || !logDescription.trim()) {
      addToast({ message: 'Please fill in all fields', type: 'warning' });
      return;
    }
    setIsSubmittingLog(true);
    try {
      await apiRequest('/incidents/log', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: logAgent,
          action: logType,
          severity: Number(logSeverity),
          details: logDescription,
          prompt_excerpt: '',
          response_excerpt: '',
          metadata: { logged_manually: true }
        })
      });
      addToast({ message: 'Incident logged successfully', type: 'success' });
      setIsLogModalOpen(false);
      setLogAgent('');
      setLogDescription('');
      fetchIncidents();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to log incident', type: 'error' });
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // KPI count helpers
  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'unresolved' || i.status === 'open').length,
    inProgress: incidents.filter(i => i.status === 'in_progress' || i.status === 'in progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  };

  // Filtering & Search
  const filteredIncidents = incidents
    .filter(inc => {
      const matchSearch = 
        inc.agent_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inc.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inc.details.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;

      const normStatus = inc.status.toLowerCase();
      if (filter === 'open') return normStatus === 'unresolved' || normStatus === 'open';
      if (filter === 'in_progress') return normStatus === 'in_progress' || normStatus === 'in progress';
      if (filter === 'resolved') return normStatus === 'resolved';
      return true;
    });

  const getSeverityBadge = (severity: number) => {
    if (severity >= 80) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (severity >= 60) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (severity >= 40) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 80) return 'Critical';
    if (severity >= 60) return 'High';
    if (severity >= 40) return 'Medium';
    return 'Low';
  };

  const getStatusBadgeColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'unresolved' || s === 'open') return 'bg-red-500/10 text-red-400';
    if (s === 'in_progress' || s === 'in progress') return 'bg-amber-500/10 text-amber-400';
    if (s === 'resolved') return 'bg-green-500/10 text-green-400';
    return 'bg-slate-500/10 text-slate-400';
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] relative">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">Incident Management</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Real-time Threat Monitoring & Remediation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerScan}
            disabled={scanStatus === 'PROCESSING'}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all shadow-lg border",
              scanStatus === 'PROCESSING' 
                ? "bg-indigo-950/20 border-indigo-900 text-indigo-400 cursor-not-allowed"
                : "bg-[var(--bg-card)] border-[var(--border-default)] hover:bg-[var(--bg-page)] text-white active:scale-95"
            )}
          >
            <Play className={cn("h-4 w-4", scanStatus === 'PROCESSING' ? "animate-spin" : "text-indigo-400")} />
            {scanStatus === 'PROCESSING' ? `Scanning (${scanProgress || 0}%)` : 'Trigger Scan'}
          </button>
          <button 
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 border border-indigo-500 hover:bg-indigo-700 rounded-lg text-xs font-semibold text-white uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-950/20"
          >
            <Plus className="h-4 w-4" />
            Log Incident
          </button>
        </div>
      </div>

      {/* Scan Progress Bar */}
      {scanStatus === 'PROCESSING' && (
        <div className="w-full bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-indigo-400 uppercase tracking-widest font-semibold">
            <span>Scan Engine Active</span>
            <span>{scanProgress || 0}% Completed</span>
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${scanProgress || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] p-5 rounded-xl shadow-sm">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Total Incidents</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] p-5 rounded-xl border-l-red-500/50 shadow-sm">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Open</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">{stats.open}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] p-5 rounded-xl border-l-amber-500/50 shadow-sm">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">In Progress</p>
          <p className="text-2xl font-semibold text-amber-400 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] p-5 rounded-xl border-l-green-500/50 shadow-sm">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Resolved</p>
          <p className="text-2xl font-semibold text-green-400 mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Main Operations Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex flex-col overflow-hidden">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[var(--border-default)] gap-4 bg-zinc-950/20">
          {/* Status Tabs */}
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-[var(--border-default)] gap-1 w-fit">
            {['all', 'open', 'in_progress', 'resolved'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all",
                  filter === t 
                    ? "bg-indigo-600 text-white shadow"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search agent, type, desc..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Incidents Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">Fetching incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <CheckCircle2 className="h-12 w-12 text-green-400 mb-3" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">No Incidents Found</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">All systems operational. No active threats or violations logged.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-zinc-950/40 text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="p-4">Severity</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Agent</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-xs">
                {filteredIncidents.map(inc => {
                  const normStatus = inc.status.toLowerCase();
                  return (
                    <tr 
                      key={inc.id}
                      onClick={() => handleOpenPanel(inc)}
                      className="hover:bg-[var(--bg-page)] transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-tight",
                          getSeverityBadge(inc.severity)
                        )}>
                          {getSeverityLabel(inc.severity)} ({inc.severity})
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white uppercase tracking-tight">
                        {inc.action.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <select
                            value={normStatus === 'in progress' ? 'in_progress' : normStatus === 'unresolved' ? 'open' : normStatus}
                            onChange={e => handleUpdateStatus(inc.id, e.target.value)}
                            className={cn(
                              "text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-[var(--border-default)] outline-none cursor-pointer focus:border-indigo-500/50",
                              getStatusBadgeColor(normStatus)
                            )}
                          >
                            <option value="open" className="bg-zinc-950 text-red-400">Open</option>
                            <option value="in_progress" className="bg-zinc-950 text-amber-400">In Progress</option>
                            <option value="resolved" className="bg-zinc-950 text-green-400">Resolved</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[var(--text-secondary)]">
                        {inc.agent_id}
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] max-w-xs truncate">
                        {inc.details}
                      </td>
                      <td className="p-4 text-[var(--text-muted)]">
                        {new Date(inc.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleOpenPanel(inc)}
                          className="p-1.5 hover:bg-[var(--bg-page)] border border-transparent hover:border-[var(--border-default)] rounded transition active:scale-95"
                        >
                          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Side Panel: Incident Details + Timeline */}
      {selectedIncident && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedIncident(null)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedIncident(null))}
            role="button"
            tabIndex={0}
            aria-label="Close details panel"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-screen w-full max-w-lg bg-[var(--bg-page)] border-l border-zinc-900 shadow-2xl p-6 overflow-y-auto z-50 flex flex-col gap-6 animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest">Incident Investigation</span>
                <h2 className="text-base font-semibold text-white uppercase tracking-tight mt-0.5 truncate max-w-xs">{selectedIncident.action.replace(/_/g, ' ')}</h2>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 hover:bg-[var(--bg-page)] border border-zinc-800 rounded transition"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-lg">
                <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Severity</span>
                <p className="text-xs font-semibold text-white mt-1 uppercase">{getSeverityLabel(selectedIncident.severity)} ({selectedIncident.severity})</p>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-lg">
                <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Status</span>
                <div className="mt-1">
                  <select
                    value={selectedIncident.status.toLowerCase() === 'unresolved' ? 'open' : selectedIncident.status.toLowerCase() === 'in progress' ? 'in_progress' : selectedIncident.status.toLowerCase()}
                    onChange={e => handleUpdateStatus(selectedIncident.id, e.target.value)}
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border outline-none cursor-pointer focus:border-indigo-500/50",
                      getStatusBadgeColor(selectedIncident.status)
                    )}
                  >
                    <option value="open" className="bg-zinc-950 text-red-400">Open</option>
                    <option value="in_progress" className="bg-zinc-950 text-amber-400">In Progress</option>
                    <option value="resolved" className="bg-zinc-950 text-green-400">Resolved</option>
                  </select>
                </div>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-lg col-span-2">
                <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Agent ID</span>
                <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">{selectedIncident.agent_id}</p>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-lg col-span-2">
                <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Description</span>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{selectedIncident.details}</p>
              </div>
            </div>

            {/* Prompt & Response Excerpts */}
            {(selectedIncident.prompt_excerpt || selectedIncident.response_excerpt) && (
              <div className="flex flex-col gap-4 border-t border-zinc-900 pt-4">
                {selectedIncident.prompt_excerpt && (
                  <div>
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Prompt Excerpt</span>
                    <pre className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg text-xs font-mono text-[var(--text-secondary)] mt-1 overflow-x-auto whitespace-pre-wrap">
                      {selectedIncident.prompt_excerpt}
                    </pre>
                  </div>
                )}
                {selectedIncident.response_excerpt && (
                  <div>
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Response Excerpt</span>
                    <pre className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg text-xs font-mono text-[var(--text-secondary)] mt-1 overflow-x-auto whitespace-pre-wrap">
                      {selectedIncident.response_excerpt}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* History Timeline */}
            <div className="flex flex-col gap-3 border-t border-zinc-900 pt-4 flex-1">
              <span className="text-[8px] font-semibold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <History className="h-3 w-3" />
                Remediation Audit Trail
              </span>

              {loadingTimeline ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4 font-bold uppercase tracking-wider">
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-indigo-500" />
                  Loading timeline...
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic py-2">No history actions recorded for this incident yet.</p>
              ) : (
                <div className="relative border-l border-zinc-800 ml-2 pl-4 py-2 space-y-5">
                  {timeline.map((item, idx) => (
                    <div key={item.id || idx} className="relative">
                      {/* Node point */}
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 border border-[#0b0f19]" />
                      <div className="bg-zinc-950/20 border border-zinc-900 p-3 rounded-lg">
                        <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)]">
                          <span className="uppercase text-[var(--text-secondary)]">{item.changeType.replace(/_/g, ' ')}</span>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-white font-semibold mt-1">{item.changeNote || 'No explanation note provided.'}</p>
                        {item.user && (
                          <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                            <User className="h-2.5 w-2.5" />
                            {item.user.full_name || item.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Log Incident Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsLogModalOpen(false)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setIsLogModalOpen(false))}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />
          {/* Content */}
          <form 
            onSubmit={handleLogIncident}
            className="bg-[var(--bg-page)] border border-zinc-900 w-full max-w-md rounded-xl p-6 overflow-hidden z-10 flex flex-col gap-5 animate-scale-in"
          >
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Log Manual Incident</h3>
              <button 
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 hover:bg-[var(--bg-page)] border border-zinc-900 rounded"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Incident Type</label>
                <select
                  value={logType}
                  onChange={e => setLogType(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="prompt_injection">Prompt Injection</option>
                  <option value="data_leak">Data Leak</option>
                  <option value="pii_violation">PII Violation</option>
                  <option value="unsafe_content">Unsafe Content</option>
                  <option value="abuse">Abuse / Policy Bypass</option>
                </select>
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Severity</label>
                <select
                  value={logSeverity}
                  onChange={e => setLogSeverity(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="25">Low (25)</option>
                  <option value="50">Medium (50)</option>
                  <option value="75">High (75)</option>
                  <option value="95">Critical (95)</option>
                </select>
              </div>

              {/* Agent */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Agent Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. customer-service-agent"
                  value={logAgent}
                  onChange={e => setLogAgent(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Description</label>
                <textarea
                  placeholder="Provide incident details, audit expectations, and trigger actions..."
                  value={logDescription}
                  onChange={e => setLogDescription(e.target.value)}
                  rows={4}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 border-t border-zinc-900 pt-4">
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 border border-zinc-800 rounded-lg text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:bg-[var(--bg-page)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLog}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white uppercase tracking-widest rounded-lg transition disabled:opacity-50"
              >
                {isSubmittingLog ? 'Logging...' : 'Submit Log'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
