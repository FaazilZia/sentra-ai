import { useState, useEffect, useMemo } from 'react';
import { Loader2, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import {
  fetchPolicies,
  PolicyResponse,
  AIActivityLog,
  fetchAIActivityLogs
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ActivityFeed, ActivityEvent } from '../components/dashboard/ActivityFeed';
import { BlockedActionsPanel } from '../components/dashboard/BlockedActionsPanel';
import { PolicyPanel } from '../components/dashboard/PolicyPanel';
import { sentra } from '../lib/sdk';

// Demo configuration for simulation
const AGENTS = ['finance-bot', 'hr-bot', 'sales-copilot', 'legal-ai', 'customer-support-gpt'];
const ACTIONS = [
  'send_email', 'read_database', 'external_share', 
  'delete_record', 'update_config', 'export_csv',
  'analyze_budget', 'create_ticket', 'read_faq'
];
const SENSITIVE_DATA = [
  { type: 'public', content: 'quarterly report' },
  { type: 'private', content: 'contains user password' },
  { type: 'restricted', content: 'financial account details' },
  { type: 'pii', content: 'SSN and personal email' }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [aiLogs, setAiLogs] = useState<AIActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load logs and policies from backend
  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [policiesRes, aiLogsRes] = await Promise.all([
        fetchPolicies(),
        fetchAIActivityLogs()
      ]);
      setPolicies(policiesRes || []);
      setAiLogs(aiLogsRes || []);
      setError(null);
    } catch (fetchError) {
      console.error('Error loading dashboard data:', fetchError);
      setError('Unable to load real-time governance data.');
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Polling for new logs every 3 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  // REAL Simulation Logic: Actually calls the backend through the SDK
  useEffect(() => {
    const simulationInterval = setInterval(async () => {
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const data = SENSITIVE_DATA[Math.floor(Math.random() * SENSITIVE_DATA.length)];

      console.log(`[Demo] AI Agent ${agent} is attempting ${action}...`);
      
      // Use the Sentra SDK to check the action against the real backend
      await sentra.safeAction(agent, action, { data: data.content }, () => {
        console.log(`[Demo] Action ${action} executed by ${agent}`);
      });
      
    }, 8000); // Trigger a real check every 8 seconds

    return () => clearInterval(simulationInterval);
  }, []);

  const stats = useMemo(() => {
    const total = aiLogs.length;
    const blocked = aiLogs.filter(l => l.status === 'blocked').length;
    const allowed = total - blocked;
    return { total, blocked, allowed };
  }, [aiLogs]);

  const activityEvents = useMemo<ActivityEvent[]>(() => {
    return aiLogs.map(log => ({
      id: log.id,
      agent: log.agent_id,
      action: log.action,
      status: log.status as 'allowed' | 'blocked',
      risk: log.risk_score as 'low' | 'medium' | 'high',
      timestamp: new Date(log.created_at).toLocaleTimeString()
    }));
  }, [aiLogs]);

  const blockedActions = useMemo(() => {
    return activityEvents
      .filter(e => e.status === 'blocked')
      .slice(0, 3)
      .map(e => ({
        ...e,
        reason: aiLogs.find(l => l.id === e.id)?.reason || 'Policy Violation'
      }));
  }, [activityEvents, aiLogs]);

  const policyRules = useMemo(() => {
    if (policies.length > 0) {
      return policies.slice(0, 6).map(p => ({
        id: p.id,
        agent: p.name || 'Global',
        action: p.description.slice(0, 30),
        enabled: p.enabled
      }));
    }
    return [
      { id: '1', agent: 'finance-bot', action: 'external_share', enabled: false },
      { id: '2', agent: 'hr-bot', action: 'read_pii', enabled: true },
    ];
  }, [policies]);

  const handleTogglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  if (loading && aiLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Initializing Real AI Control...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10 px-4">
      {/* Header & Page Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            Active Control Layer
          </div>
          <button 
            onClick={() => { setIsRefreshing(true); loadData(false); }}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Logs
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Security Control Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Active interception and policy enforcement for all AI actions.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Control Active</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <DashboardHeader 
        total={stats.total} 
        allowed={stats.allowed} 
        blocked={stats.blocked} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Activity Feed */}
        <div className="lg:col-span-8">
          <ActivityFeed events={activityEvents} />
        </div>

        {/* Right Column: Alerts & Policies */}
        <div className="lg:col-span-4 space-y-6">
          <BlockedActionsPanel actions={blockedActions} />
          <PolicyPanel rules={policyRules} onToggle={handleTogglePolicy} />
          
          {/* Status Card */}
          <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-tight">System Status</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Interceptor Pipeline</p>
                  <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    LIVE EVALUATION ACTIVE
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every action performed by simulated agents is now being routed through the backend for real policy validation and risk assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
