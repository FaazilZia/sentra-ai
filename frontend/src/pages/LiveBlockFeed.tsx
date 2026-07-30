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

  const getTier = (reason: string, metadata?: any) => {
    const lower = (reason || '').toLowerCase();
    const metaStr = JSON.stringify(metadata || {}).toLowerCase();
    if (lower.includes('session detected') || lower.includes('session_pattern') || metaStr.includes('session_pattern') || lower.includes('exfiltration pattern')) {
      return 'Session Pattern (Sequence)';
    }
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
    <div className="flex flex-col gap-6 p-6 animate-fade-in min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--royal-indigo)]" />
            Live Block Feed
          </h1>
          <p className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mt-1">
            Real-time pre-execution interception log
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status — inline text with dot (Fix 3) */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-[var(--text-muted)]")} />
            {isLive ? 'Live' : 'Reconnecting…'}
          </div>

          {/* Simulate Attack Button */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={simulateAttack}
              disabled={simulating}
              className="btn-primary flex items-center gap-2 !text-[11px] !py-2 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {simulating ? 'Simulating…' : 'Simulate attack'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          label="Total intercepted" 
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
      <div className="flex gap-2 border-b border-[var(--border-default)] pb-2">
        {(['All', 'Blocked', 'Flagged', 'Allowed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-[11px] font-semibold border-b-2 transition-all duration-200",
              activeTab === tab 
                ? "border-[var(--royal-indigo)] text-[var(--text-primary)]" 
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Live Feed Log Table */}
      <div className="card-base overflow-hidden">
        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-page)]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Agent</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Decision</th>
                  <th className="p-4">Risk level</th>
                  <th className="p-4">Tier that caught it</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-xs">
                {filteredEvents.map(event => {
                  const isExpanded = !!expandedRows[event.id];
                  const tier = getTier(event.reason || '');
                  const truncatedAction = event.action.length > 60 
                    ? event.action.substring(0, 60) + '...' 
                    : event.action;

                  return (
                    <tr key={event.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-4 font-mono text-[10px] text-[var(--text-muted)]">{event.time}</td>
                      <td className="p-4 font-semibold text-[var(--text-primary)] tracking-tight">{event.agent}</td>
                      <td className="p-4 text-[var(--text-secondary)] font-mono text-[10px]">{truncatedAction}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-semibold border",
                          event.status === 'Blocked' && "bg-rose-50 border-rose-200 text-rose-600",
                          event.status === 'Flagged' && "bg-amber-50 border-amber-200 text-amber-600",
                          event.status === 'Allowed' && "bg-emerald-50 border-emerald-200 text-emerald-600"
                        )}>
                          {event.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-semibold text-[10px]",
                          event.severity === 'Critical' && "text-rose-600",
                          event.severity === 'High' && "text-orange-600",
                          event.severity === 'Medium' && "text-amber-600",
                          event.severity === 'Low' && "text-emerald-600"
                        )}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[10px] text-[var(--text-secondary)] tracking-tight">{tier}</td>
                      <td className="p-4 text-[var(--text-muted)] text-[10px] line-clamp-1">{event.reason || 'None'}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => toggleRow(event.id)}
                          className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
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
            <Shield className="h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">No interceptions yet</h3>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Sentraa is watching. Send an action through the SDK to see it here.
            </p>
            
            {/* Code Snippet */}
            <div className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl p-4 mt-6 text-left relative group">
              <button 
                onClick={handleCopyCode}
                className="absolute right-3 top-3 p-1.5 bg-white border border-[var(--border-default)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                title="Copy snippet"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <pre className="font-mono text-[10px] text-[var(--text-secondary)] overflow-x-auto select-all">
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
          <div key={`${event.id}-detail`} className="card-base p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[var(--royal-indigo)]" />
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{event.id}</span>
              </div>
              <span className="text-[10px] font-semibold text-[var(--royal-indigo)] tracking-wider">
                Intercepted by {tier}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px]">
              <div>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">Full action payload</span>
                <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl p-4 font-mono text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {event.action}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">Interception reason</span>
                  <p className="text-[var(--text-primary)] leading-relaxed font-medium">{event.reason || 'No specific reason given.'}</p>
                </div>

                {event.aiSummary && (
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">AI copilot analysis</span>
                    <p className="text-[var(--royal-indigo)] leading-relaxed italic bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                      "{event.aiSummary}"
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">Compliance frameworks affected</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {event.frameworks && event.frameworks.length > 0 ? (
                      event.frameworks.map((f: string, i: number) => (
                        <span key={i} className="text-[9px] font-semibold bg-indigo-50 border border-indigo-200 text-[var(--royal-indigo)] px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] text-[10px]">None triggered</span>
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
        <div className="fixed bottom-0 left-0 lg:left-[var(--sidebar-width)] right-0 bg-rose-600 text-white font-semibold text-[11px] py-3 px-6 shadow-2xl flex items-center justify-between z-40 border-t border-rose-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 animate-bounce" />
            <span>🔴 {blockedCount} {blockedCount === 1 ? 'action' : 'actions'} blocked in this session</span>
          </div>
          <span className="bg-rose-700 px-2.5 py-1 rounded text-[10px] font-medium">Remediation required</span>
        </div>
      )}
    </div>
  );
}
