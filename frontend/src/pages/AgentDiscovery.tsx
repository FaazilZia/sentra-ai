import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Cpu, 
  ShieldAlert, 
  Radio, 
  Plus,
  Eye
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface DiscoveredAgent {
  id: string;
  name: string;
  description: string;
  source: string;
  risk_level: string;
  risk_score: number;
  found_at: string;
  status: string;
  reviewStatus?: 'confirmed' | 'rejected' | null;
}

interface RegisteredAgent {
  id: string;
  name: string;
  description: string | null;
  model_name: string;
  model_version: string;
  vendor: string;
  use_case: string;
  risk_tier: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW';
  created_at: string;
}

export default function AgentDiscovery() {
  const { addToast } = useStore();
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('ALL');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'SHADOW' | 'REGISTERED'>('SHADOW');
  const [registeredAgents, setRegisteredAgents] = useState<RegisteredAgent[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(false);

  // Review modal states for Shadow/Discovered agents
  const [selectedAgent, setSelectedAgent] = useState<DiscoveredAgent | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  
  // Form overrides for promoter promotion
  const [promoteName, setPromoteName] = useState('');
  const [promoteDescription, setPromoteDescription] = useState('');
  const [promoteRiskTier, setPromoteRiskTier] = useState('HIGH');

  // Review modal states for Registered Agents
  const [selectedRegisteredAgent, setSelectedRegisteredAgent] = useState<RegisteredAgent | null>(null);
  const [updatingRegistered, setUpdatingRegistered] = useState(false);

  // Fetch / Sync function
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiRequest<DiscoveredAgent[]>('/ai-systems/sync', { method: 'POST' });
      setAgents(res || []);
      addToast({
        message: `Discovered ${res?.length || 0} unregistered shadow AI agent systems.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        message: err.message || 'Scans connection failed.',
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Fetch registered agents
  const fetchRegistered = async () => {
    setLoadingRegistered(true);
    try {
      const res = await apiRequest<{ items: RegisteredAgent[] }>('/ai-systems');
      setRegisteredAgents(res.items || []);
    } catch (err: any) {
      addToast({
        message: err.message || 'Failed to fetch registered agents.',
        type: 'error'
      });
    } finally {
      setLoadingRegistered(false);
    }
  };

  // Run initial scan to populate data
  useEffect(() => {
    handleSync();
  }, []);

  // Sync registered agents when tab shifts
  useEffect(() => {
    if (activeTab === 'REGISTERED') {
      fetchRegistered();
    }
  }, [activeTab]);

  const handleOpenReview = (agent: DiscoveredAgent) => {
    setSelectedAgent(agent);
    setPromoteName(agent.name);
    setPromoteDescription(agent.description);
    setPromoteRiskTier(agent.risk_level);
  };

  const handleDismiss = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    addToast({ message: 'Discovery alert dismissed.', type: 'info' });
  };

  const handlePromoteToProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setIsPromoting(true);
    try {
      // Map to production AI Registry schema requirements
      const payload = {
        name: promoteName,
        description: promoteDescription,
        model_name: selectedAgent.name.includes('GPT') ? 'GPT-4o' : 'Custom Llama-3',
        model_version: '1.0',
        vendor: selectedAgent.source,
        use_case: 'Internal Automated Utility',
        risk_tier: promoteRiskTier,
        status: 'ACTIVE',
        compliance_score: 100 - selectedAgent.risk_score,
        owner: 'Security Operations Discovered',
        technical_contact: 'secops@sentra.ai'
      };

      await apiRequest('/ai-systems', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      addToast({
        message: `Promoted "${promoteName}" to official AI system registry.`,
        type: 'success'
      });

      // Remove from discovered list
      setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
      setSelectedAgent(null);
    } catch (err: any) {
      addToast({
        message: err.message || 'Promotion to production registry failed.',
        type: 'error'
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Update status for already registered agents (Confirm / Reject / Under Review)
  const handleUpdateStatus = async (newStatus: 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW') => {
    if (!selectedRegisteredAgent) return;
    setUpdatingRegistered(true);
    try {
      await apiRequest(`/ai-systems/${selectedRegisteredAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      addToast({
        message: `Updated status of "${selectedRegisteredAgent.name}" to ${newStatus}.`,
        type: 'success'
      });
      // Update local state
      setRegisteredAgents(prev => prev.map(a => a.id === selectedRegisteredAgent.id ? { ...a, status: newStatus } : a));
      setSelectedRegisteredAgent(null);
    } catch (err: any) {
      addToast({
        message: err.message || 'Failed to update agent status.',
        type: 'error'
      });
    } finally {
      setUpdatingRegistered(false);
    }
  };

  // Stats derivations from agents list (sync endpoint discoveries)
  const totalCount = agents.length;
  const unreviewedCount = agents.filter(a => !a.reviewStatus).length;
  const confirmedCount = agents.filter(a => a.reviewStatus === 'confirmed').length;
  const rejectedCount = agents.filter(a => a.reviewStatus === 'rejected').length;

  // Filter list
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = filterSource === 'ALL' || agent.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const filteredRegistered = registeredAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (agent.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const uniqueSources = Array.from(new Set(agents.map(a => a.source)));

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 tracking-wider">Critical</span>;
      case 'HIGH':
        return <span className="text-[9px] font-black uppercase bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded border border-orange-500/20 tracking-wider">High</span>;
      case 'MEDIUM':
        return <span className="text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 tracking-wider">Medium</span>;
      default:
        return <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">Active / Confirmed</span>;
      case 'DEPRECATED':
        return <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 tracking-wider">Deprecated / Rejected</span>;
      case 'UNDER_REVIEW':
        return <span className="text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20 tracking-wider">Under Review</span>;
      default:
        return <span className="text-[9px] font-black uppercase bg-zinc-500/10 text-zinc-400 px-2 py-0.5 rounded border border-zinc-500/20 tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#090910] min-h-screen text-slate-200 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--mid-indigo)]/20 border border-[var(--royal-indigo)]/30 rounded-lg">
            <Radio className="h-5 w-5 text-[var(--royal-indigo)] animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">AI Agent Discovery Hub</h1>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Automatic connector scan for shadow AI usage & unregistered pipelines</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 rounded transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? 'Scanning Connectors...' : 'Sync Connector Scans'}
        </button>
      </div>

      {/* Connection progress loader */}
      {syncing && (
        <div className="bg-indigo-900/10 border border-[var(--royal-indigo)]/20 rounded-xl p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-indigo-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-white">Polling API Security & VPC Logs...</p>
              <p className="text-[9px] text-zinc-500 uppercase mt-0.5">Checking workspace audits, Slack, AWS routing records & git registries.</p>
            </div>
          </div>
          <div className="w-48 bg-zinc-800 h-1 rounded overflow-hidden">
            <div className="bg-indigo-500 h-full w-2/3 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-base p-4 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Total Discovered</span>
            <h3 className="text-2xl font-black text-white mt-1 font-mono">{totalCount}</h3>
          </div>
          <Cpu className="h-8 w-8 text-indigo-500/40" />
        </div>

        <div className="card-base p-4 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Unreviewed</span>
            <h3 className="text-2xl font-black text-yellow-500 mt-1 font-mono">{unreviewedCount}</h3>
          </div>
          <ShieldAlert className="h-8 w-8 text-yellow-500/30" />
        </div>

        <div className="card-base p-4 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Confirmed</span>
            <h3 className="text-2xl font-black text-emerald-500 mt-1 font-mono">{confirmedCount}</h3>
          </div>
          <CheckCircle className="h-8 w-8 text-emerald-500/30" />
        </div>

        <div className="card-base p-4 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Rejected</span>
            <h3 className="text-2xl font-black text-red-500 mt-1 font-mono">{rejectedCount}</h3>
          </div>
          <AlertTriangle className="h-8 w-8 text-red-500/30" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-900 gap-6">
        <button
          onClick={() => setActiveTab('SHADOW')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-widest transition-all relative",
            activeTab === 'SHADOW' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Shadow Agents
          {activeTab === 'SHADOW' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--royal-indigo)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('REGISTERED')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-widest transition-all relative",
            activeTab === 'REGISTERED' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Registered Agents
          {activeTab === 'REGISTERED' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--royal-indigo)]" />
          )}
        </button>
      </div>

      {/* Main List */}
      <div className="card-base p-6 space-y-6">
        {/* Filters and search panel */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder={activeTab === 'SHADOW' ? "Filter shadow agents..." : "Filter registered agents..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded px-9 py-2 text-xs text-white focus:outline-none focus:border-[var(--royal-indigo)] w-full font-mono placeholder-zinc-600"
            />
          </div>

          {activeTab === 'SHADOW' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-zinc-500" />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-[var(--royal-indigo)]"
              >
                <option value="ALL">All Connectors</option>
                {uniqueSources.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Discovery List / Registered List */}
        {activeTab === 'SHADOW' ? (
          agents.length === 0 ? (
            <div className="bg-[#111827]/20 border border-zinc-800 border-dashed rounded-2xl p-12 text-center text-gray-500 max-w-md mx-auto my-6">
              <Radio className="h-8 w-8 mx-auto mb-3 text-indigo-500/60 animate-pulse" />
              <h4 className="text-xs font-black uppercase text-gray-400">No Agents Discovered</h4>
              <p className="text-[10px] text-gray-500 mt-1">Agents detected by Shadow AI scanner will appear here.</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs italic">
              No unregistered shadow AI agent discoveries match current query parameters.
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 space-y-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-950/20 p-2.5 rounded-xl transition duration-150"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-white tracking-wide">{agent.name}</h3>
                      {getRiskBadge(agent.risk_level)}
                      <span className="text-[8px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded tracking-widest font-mono">
                        {agent.source}
                      </span>
                      {agent.reviewStatus && (
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-2 py-0.5 rounded tracking-widest font-mono",
                          agent.reviewStatus === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        )}>
                          {agent.reviewStatus}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-zinc-400 max-w-3xl leading-relaxed">
                      {agent.description}
                    </p>
                    
                    <p className="text-[9px] text-zinc-600 font-mono">
                      Scanned at: {new Date(agent.found_at).toLocaleString()} // Risk Score: {agent.risk_score}/100
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenReview(agent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                      Review & Register
                    </button>
                    <button
                      onClick={() => handleDismiss(agent.id)}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          loadingRegistered ? (
            <div className="py-16 text-center text-zinc-500 text-xs italic">
              Loading registered AI systems...
            </div>
          ) : filteredRegistered.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs italic">
              No registered AI systems found matching current query parameters.
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 space-y-4">
              {filteredRegistered.map((agent) => (
                <div
                  key={agent.id}
                  className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-950/20 p-2.5 rounded-xl transition duration-150"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-white tracking-wide">{agent.name}</h3>
                      {getRiskBadge(agent.risk_tier)}
                      <span className="text-[8px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded tracking-widest font-mono">
                        {agent.vendor || 'Registry'}
                      </span>
                      {getStatusBadge(agent.status)}
                    </div>
                    
                    <p className="text-[11px] text-zinc-400 max-w-3xl leading-relaxed">
                      {agent.description || 'No description provided.'}
                    </p>
                    
                    <p className="text-[9px] text-zinc-600 font-mono">
                      Model: {agent.model_name} v{agent.model_version} // Use Case: {agent.use_case} // Created at: {new Date(agent.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedRegisteredAgent(agent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95"
                    >
                      <Eye className="h-3 w-3" />
                      Review / Edit Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Review & Promotion Dialog Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-left">
            <div className="p-4 border-b border-zinc-900 bg-[#0c0c14]/40 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Unregistered Agent Review Portal
              </span>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-zinc-500 hover:text-white font-mono text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePromoteToProduction} className="p-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-[10px] text-amber-500 leading-relaxed">
                ⚠️ Confirming this alert registers this discovery into the permanent AI System Registry database, enabling compliance posture scans.
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Registry System Name</label>
                <input
                  type="text"
                  required
                  value={promoteName}
                  onChange={(e) => setPromoteName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Description</label>
                <textarea
                  required
                  value={promoteDescription}
                  onChange={(e) => setPromoteDescription(e.target.value)}
                  rows={3}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Risk Tier Classification</label>
                <select
                  value={promoteRiskTier}
                  onChange={(e) => setPromoteRiskTier(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-900/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPromoting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-[9px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/10"
                >
                  {isPromoting ? 'Registering...' : 'Approve & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Registered Agent Status Modal */}
      {selectedRegisteredAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-left">
            <div className="p-4 border-b border-zinc-900 bg-[#0c0c14]/40 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Registered Agent Status Manager
              </span>
              <button
                onClick={() => setSelectedRegisteredAgent(null)}
                className="text-zinc-500 hover:text-white font-mono text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">System Name</h4>
                <p className="text-sm font-bold text-white">{selectedRegisteredAgent.name}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">Current Status</h4>
                <div>{getStatusBadge(selectedRegisteredAgent.status)}</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-850 p-3.5 rounded-xl text-[10px] text-zinc-400 leading-relaxed">
                Choose an action below to update this agent's status. Changes are saved immediately and logged to the audit trail.
              </div>

              <div className="pt-3 border-t border-zinc-900/60 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setSelectedRegisteredAgent(null)}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  disabled={updatingRegistered}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-50"
                >
                  Confirm / Active
                </button>
                <button
                  onClick={() => handleUpdateStatus('DEPRECATED')}
                  disabled={updatingRegistered}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-50"
                >
                  Reject / Deprecate
                </button>
                <button
                  onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                  disabled={updatingRegistered}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-[9px] font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-50"
                >
                  Under Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

