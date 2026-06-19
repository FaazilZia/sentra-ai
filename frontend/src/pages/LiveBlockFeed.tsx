import { useState } from 'react';
import { 
  Shield, 
  Play, 
  Terminal, 
  Copy, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Activity
} from 'lucide-react';
import { useSocketStore } from '@/store/useSocketStore';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import KPICard from '@/components/dashboard/KPICard';

export default function LiveBlockFeed() {
  const { user } = useAuth();
  const { addToast } = useStore();
  const { riskEvents, connectionStatus } = useSocketStore();
  const [activeTab, setActiveTab] = useState<'All' | 'Blocked' | 'Flagged' | 'Allowed'>('All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [simulating, setSimulating] = useState(false);

  // Connection Pill helper
  const isLive = connectionStatus === 'connected';

  // Stats derived in real-time
  const totalIntercepted = (riskEvents || []).length;
  const blockedCount = (riskEvents || []).filter(e => e.status === 'Blocked').length;
  const flaggedCount = (riskEvents || []).filter(e => e.status === 'Flagged').length;
  const allowedCount = (riskEvents || []).filter(e => e.status === 'Allowed').length;

  const simulateAttack = async () => {
    setSimulating(true);
    try {
      await apiRequest('/demo/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'data_exfiltration' })
      });
      addToast({ message: 'Attack simulated — watch the feed', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to simulate attack', type: 'error' });
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyCode = () => {
    const code = `const decision = await sentra.checkAction({
  agent: 'my-agent',
  action: 'delete all user records'
});`;
    navigator.clipboard.writeText(code);
    addToast({ message: 'Code snippet copied to clipboard!', type: 'success' });
  };

  const getTier = (reason: string) => {
    const lower = (reason || '').toLowerCase();
    if (lower.includes('pii')) return 'PII Scanner';
    if (lower.includes('policy')) return 'L1 Policy';
    if (lower.includes('semantic')) return 'L3 Semantic';
    return 'L2 Risk Engine';
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter events
  const filteredEvents = (riskEvents || []).filter(event => {
    if (activeTab === 'All') return true;
    return event.status === activeTab;
  });

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200 min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-400" />
            Live Block Feed
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
            Real-time pre-execution interception log
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Pill */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider",
            isLive 
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
              : "bg-gray-800 border-gray-750 text-gray-400"
          )}>
            <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-gray-500")} />
            {isLive ? 'Live' : 'Reconnecting'}
          </div>

          {/* Simulate Attack Button */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={simulateAttack}
              disabled={simulating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {simulating ? 'Simulating...' : 'Simulate Attack'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          label="Total Intercepted" 
          value={totalIntercepted.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Blocked" 
          value={blockedCount.toString()} 
          icon="risks" 
          status="danger" 
        />
        <KPICard 
          label="Flagged" 
          value={flaggedCount.toString()} 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Allowed" 
          value={allowedCount.toString()} 
          icon="compliance" 
          status="success" 
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-850/60 pb-2">
        {(['All', 'Blocked', 'Flagged', 'Allowed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all duration-200",
              activeTab === tab 
                ? "border-indigo-500 text-white" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Live Feed Log Table */}
      <div className="bg-[#111827]/40 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-md">
        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-850/60 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-gray-900/10">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Agent</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Decision</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4">Tier That Caught It</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60 text-xs">
                {filteredEvents.map(event => {
                  const isExpanded = !!expandedRows[event.id];
                  const tier = getTier(event.reason || '');
                  const truncatedAction = event.action.length > 60 
                    ? event.action.substring(0, 60) + '...' 
                    : event.action;

                  return (
                    <tr key={event.id} className="hover:bg-gray-900/10 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-gray-500">{event.time}</td>
                      <td className="p-4 font-bold text-white uppercase tracking-tight">{event.agent}</td>
                      <td className="p-4 text-gray-400 font-mono text-[10px]">{truncatedAction}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                          event.status === 'Blocked' && "bg-rose-500/10 border-rose-500/20 text-rose-400",
                          event.status === 'Flagged' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                          event.status === 'Allowed' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}>
                          {event.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-bold text-[9px] uppercase tracking-wider",
                          event.severity === 'Critical' && "text-rose-500",
                          event.severity === 'High' && "text-orange-500",
                          event.severity === 'Medium' && "text-amber-500",
                          event.severity === 'Low' && "text-emerald-500"
                        )}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[10px] text-gray-400 uppercase tracking-tight">{tier}</td>
                      <td className="p-4 text-gray-500 text-[10px] line-clamp-1">{event.reason || 'None'}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => toggleRow(event.id)}
                          className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-all"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
            <Shield className="h-12 w-12 text-gray-600 mb-4 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">No interceptions yet</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1.5 leading-relaxed">
              Sentraa is watching. Send an action through the SDK to see it here.
            </p>
            
            {/* Code Snippet */}
            <div className="w-full bg-[#0b0f19] border border-gray-850 rounded-xl p-4 mt-6 text-left relative group">
              <button 
                onClick={handleCopyCode}
                className="absolute right-3 top-3 p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
                title="Copy snippet"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <pre className="font-mono text-[10px] text-gray-400 overflow-x-auto select-all">
{`const decision = await sentra.checkAction({
  agent: 'my-agent',
  action: 'delete all user records'
});`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Accordion Rows (Inline Details) */}
      {filteredEvents.map(event => {
        const isExpanded = !!expandedRows[event.id];
        if (!isExpanded) return null;
        const tier = getTier(event.reason || '');

        return (
          <div key={`${event.id}-detail`} className="bg-gray-950/40 border border-gray-850 rounded-2xl p-6 flex flex-col gap-4 animate-slide-in">
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span className="font-mono text-[10px] text-gray-500">{event.id}</span>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">
                Intercepted by {tier}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px]">
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Full Action Payload</span>
                <div className="bg-[#0c101b] border border-gray-850 rounded-xl p-4 font-mono text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {event.action}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Interception Reason</span>
                  <p className="text-gray-300 leading-relaxed font-semibold">{event.reason || 'No specific reason given.'}</p>
                </div>

                {event.aiSummary && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">AI Copilot Analysis</span>
                    <p className="text-indigo-200/90 leading-relaxed italic bg-indigo-950/10 border border-indigo-900/20 p-3 rounded-xl">
                      "{event.aiSummary}"
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Compliance Frameworks Affected</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {event.frameworks && event.frameworks.length > 0 ? (
                      event.frameworks.map((f, i) => (
                        <span key={i} className="text-[9px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-600 text-[10px]">None triggered</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Persistent Bottom Bar for Blocked Events */}
      {blockedCount > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-[var(--sidebar-width)] right-0 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest py-3 px-6 shadow-2xl flex items-center justify-between z-40 border-t border-rose-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 animate-bounce" />
            <span>🔴 {blockedCount} {blockedCount === 1 ? 'action' : 'actions'} blocked in this session</span>
          </div>
          <span className="bg-rose-700 px-2.5 py-1 rounded text-[8px] tracking-normal font-bold">REMEDIATION REQUIRED</span>
        </div>
      )}
    </div>
  );
}
