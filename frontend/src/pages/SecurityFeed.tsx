import { useEffect, useState } from 'react';
import { Radio, ShieldAlert, Terminal, TriangleAlert, Info, CircleCheck, Archive } from 'lucide-react';
import { fetchIncidents, updateIncidentStatus, IncidentResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { EmptyStateList } from '../components/ui/EmptyStateList';

function getSeverityTone(severity: number): 'success' | 'warning' | 'danger' | 'info' {
  if (severity >= 80) return 'danger';
  if (severity >= 50) return 'warning';
  if (severity >= 20) return 'info';
  return 'success';
}

function getSeverityIcon(severity: number) {
  if (severity >= 80) return ShieldAlert;
  if (severity >= 50) return TriangleAlert;
  return Info;
}

export default function SecurityFeedPage() {
  const { accessToken } = useAuth();
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved');
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    let active = true;

    async function loadIncidents() {
      try {
        const statusFilter = filter === 'all' ? undefined : filter;
        const response = await fetchIncidents(token, 40, statusFilter);
        if (!active) return;
        setIncidents(response.items);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch security events');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadIncidents();

    // Polling interval for "Live" feel
    const interval = setInterval(() => {
      if (isLive) {
        void loadIncidents();
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [accessToken, isLive, filter]);

  const handleAction = async (id: string, newStatus: string) => {
    if (!accessToken) return;
    setActingOn(id);
    try {
      await updateIncidentStatus(accessToken, id, newStatus);
      // Optimistically update or just let the next poll catch it
      setIncidents(prev => prev.filter(i => {
        if (i.id !== id) return true;
        if (filter === 'all') return true;
        return false; // Remove from list if it no longer matches the filter
      }));
    } catch (err) {
      alert('Failed to update incident status');
    } finally {
      setActingOn(null);
    }
  };

  const criticalCount = incidents.filter(i => i.severity >= 80).length;
  const recentCount = incidents.length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.9))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_25%)]" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                Live Security Monitor
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Real-time telemetry and violation stream.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Watch incoming requests from your AI agents in real-time. This feed captures 
              evaluations, policy violations, and risk detections directly from the Sentra Edge SDK.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  isLive 
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' 
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
             >
               <Radio className={`h-4 w-4 ${isLive ? 'animate-pulse' : ''}`} />
               {isLive ? 'Live Monitoring Active' : 'Monitoring Paused'}
             </button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Monitor"
          value={isLive ? "Online" : "Paused"}
          icon={Radio}
          trend="Listening for Telemetry via SDK"
        />
        <StatCard
          title="Critical Alerts"
          value={loading ? "---" : criticalCount}
          icon={ShieldAlert}
          trend="Incidents with severity >= 80"
        />
        <StatCard
          title="Recent Events"
          value={loading ? "---" : recentCount}
          icon={Terminal}
          trend="Captured in the last session"
        />
      </div>

      <div className="flex items-center justify-between">
         <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setFilter('unresolved')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'unresolved' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Unresolved
            </button>
            <button 
              onClick={() => setFilter('resolved')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'resolved' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Resolved
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
         </div>
      </div>

      {error ? (
        <EmptyStateList
          title="Telemetry Connection Failed"
          description="We couldn't reach the backend to stream live packets."
          emptyMessage={error}
        />
      ) : (
        <div className="grid gap-6">
          <SurfaceCard
            title={filter === 'unresolved' ? "Active Incident Feed" : filter === 'resolved' ? "Resolved History" : "Total Incident Ledger"}
            description="Automatic updates every 5 seconds. Highest severity events are prioritized."
          >
            {incidents.length === 0 ? (
               <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/20 py-12 text-center text-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 text-slate-500">
                     <ShieldCheck className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-medium text-slate-300">No {filter} incidents detected</p>
                  <p className="mt-1 text-slate-500">Waiting for external SDK heartbeats...</p>
               </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => {
                  const Icon = getSeverityIcon(incident.severity);
                  const isActing = actingOn === incident.id;

                  return (
                    <div 
                      key={incident.id}
                      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 p-5 transition-all hover:bg-slate-900/50 md:flex-row md:items-start ${isActing ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Severity Side Border */}
                      <div 
                        className={`absolute left-0 top-0 h-full w-1 ${
                          incident.status === 'resolved' ? 'bg-green-500/30' : 
                          incident.severity >= 80 ? 'bg-red-500' : 
                          incident.severity >= 50 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`} 
                      />

                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                        <Icon className={`h-5 w-5 ${
                          incident.status === 'resolved' ? 'text-green-500/50' :
                          incident.severity >= 80 ? 'text-red-400' : 
                          incident.severity >= 50 ? 'text-amber-400' : 'text-cyan-400'
                        }`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white uppercase tracking-tight">{incident.agent_id}</span>
                            <StatusBadge 
                              label={incident.status === 'resolved' ? 'Resolved' : incident.action.replace('_', ' ')} 
                              tone={incident.status === 'resolved' ? 'success' : getSeverityTone(incident.severity)} 
                            />
                            <span className="text-[11px] text-slate-500 font-mono">{new Date(incident.created_at).toLocaleTimeString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             {incident.status === 'unresolved' && (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={() => handleAction(incident.id, 'resolved')}
                                      className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all"
                                   >
                                      <CircleCheck className="h-3 w-3" /> Resolve
                                   </button>
                                   <button 
                                      onClick={() => handleAction(incident.id, 'muted')}
                                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-white/5 hover:bg-white/10 transition-all"
                                   >
                                      <Archive className="h-3 w-3" /> Mute
                                   </button>
                                </div>
                             )}
                             <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                   incident.status === 'resolved' ? 'text-green-500/50' :
                                   incident.severity >= 80 ? 'text-red-400' : 
                                   incident.severity >= 50 ? 'text-amber-400' : 'text-cyan-400'
                                }`}>{incident.severity}</span>
                             </div>
                          </div>
                        </div>

                        <p className={`mt-2 text-sm leading-relaxed ${incident.status === 'resolved' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {incident.details || `Policy violation detected during AI execution phase.`}
                        </p>

                        {(incident.prompt_excerpt || incident.response_excerpt) && (
                           <div className={`mt-4 rounded-xl bg-slate-950/80 p-3 border border-white/5 font-mono text-[12px] overflow-x-auto ${incident.status === 'resolved' ? 'opacity-30' : ''}`}>
                              {incident.prompt_excerpt && (
                                <div className="mb-2">
                                  <span className="text-cyan-500/80 uppercase text-[10px] block mb-1">Prompt Excerpt</span>
                                  <div className="text-slate-400 break-words">{incident.prompt_excerpt}</div>
                                </div>
                              )}
                              {incident.response_excerpt && (
                                <div>
                                  <span className="text-amber-500/80 uppercase text-[10px] block mb-1">Response Excerpt</span>
                                  <div className="text-slate-400 break-words">{incident.response_excerpt}</div>
                                </div>
                              )}
                           </div>
                        )}
                        
                        {Object.keys(incident.metadata).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(incident.metadata).map(([k, v]) => (
                               <span key={k} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-slate-500 uppercase tracking-wide">
                                  {k}: {String(v)}
                               </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}

