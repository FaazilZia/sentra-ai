import { useState, useEffect, useMemo } from 'react';
import { Loader2, ShieldAlert, Globe, Zap, Plus, ShieldCheck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import {
  fetchPolicies,
  PolicyResponse,
  AIActivityLog,
  fetchAIActivityLogs,
  apiBaseUrl,
  fetchSecurityScore,
  replayAction
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ActivityFeed, ActivityEvent } from '../components/dashboard/ActivityFeed';
import { BlockedActionsPanel } from '../components/dashboard/BlockedActionsPanel';
import { PolicyPanel } from '../components/dashboard/PolicyPanel';
import { BeforeAfterPanel } from '../components/dashboard/BeforeAfterPanel';
import { UseCaseSelector } from '../components/dashboard/UseCaseSelector';
import { IntegrationFlowCard } from '../components/dashboard/IntegrationFlowCard';
import { SecurityScoreCard } from '../components/dashboard/SecurityScoreCard';
import { AgentProfileList } from '../components/dashboard/AgentProfileList';
import { PolicyBuilderModal } from '../components/dashboard/PolicyBuilderModal';
import { sentra } from '../lib/sdk';

// Demo configuration for simulation
const MODES_CONFIG: Record<string, { agents: string[], actions: string[], data: any[] }> = {
  finance: {
    agents: ['finance-bot', 'bank-copilot', 'trading-ai'],
    actions: ['send_email', 'external_share', 'export_csv', 'read_database'],
    data: [
      { type: 'restricted', content: 'financial account details' },
      { type: 'pii', content: 'SSN and credit card number' },
      { type: 'secret', content: 'unauthorized bank credentials' }
    ]
  },
  healthcare: {
    agents: ['patient-bot', 'med-ai', 'health-assistant'],
    actions: ['read_pii', 'external_api', 'send_email', 'delete_record'],
    data: [
      { type: 'pii', content: 'patient medical records and SSN' },
      { type: 'sensitive', content: 'confidential diagnosis report' },
      { type: 'protected', content: 'health insurance ID' }
    ]
  },
  startup: {
    agents: ['dev-copilot', 'ops-bot', 'growth-ai'],
    actions: ['update_config', 'external_share', 'read_database', 'send_email'],
    data: [
      { type: 'secret', content: 'AWS secret access keys' },
      { type: 'private', content: 'confidential pitch deck' },
      { type: 'restricted', content: 'production user emails' }
    ]
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [aiLogs, setAiLogs] = useState<AIActivityLog[]>([]);
  const [securityScore, setSecurityScore] = useState(100);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('finance');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // WebSocket Connection
  useEffect(() => {
    const socketUrl = apiBaseUrl.replace('/api', '');
    const socket: Socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Connected to real-time security feed');
    });

    socket.on('activity_log', (newLog: AIActivityLog) => {
      console.log('Real-time interception received:', newLog);
      setAiLogs(prev => [newLog, ...prev].slice(0, 100));
      // Refresh score on new log
      fetchSecurityScore().then(res => setSecurityScore(res.score));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [policiesRes, aiLogsRes, scoreRes] = await Promise.all([
        fetchPolicies(),
        fetchAIActivityLogs(),
        fetchSecurityScore()
      ]);
      setPolicies(policiesRes || []);
      setAiLogs(aiLogsRes || []);
      setSecurityScore(scoreRes.score || 100);
    } catch (fetchError) {
      console.error('Error loading dashboard data:', fetchError);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // REAL Simulation Logic: Driven by the selected Mode
  useEffect(() => {
    const simulationInterval = setInterval(async () => {
      const config = MODES_CONFIG[mode];
      const agent = config.agents[Math.floor(Math.random() * config.agents.length)];
      const action = config.actions[Math.floor(Math.random() * config.actions.length)];
      const data = config.data[Math.floor(Math.random() * config.data.length)];

      console.log(`[Demo] [${mode.toUpperCase()}] AI Agent ${agent} attempting ${action}...`);
      
      await sentra.safeAction(agent, action, { 
        data: data.content, 
        context: { mode, industry: mode, compliance_check: true } 
      }, () => {
        // This only runs if NOT blocked
        console.log(`[Demo] Action ${action} authorized for ${agent}`);
      });
      
    }, 5000); // 5 seconds for a dynamic demo

    return () => clearInterval(simulationInterval);
  }, [mode]);

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
      timestamp: new Date(log.created_at).toLocaleTimeString(),
      reason: log.reason,
      impact: log.impact,
      explanation: log.explanation,
      confidence: log.confidence,
      timeline: log.timeline,
      compliance: log.compliance as string[]
    }));
  }, [aiLogs]);

  const agentStats = useMemo(() => {
    const agentsMap: Record<string, any> = {};
    aiLogs.forEach(log => {
      if (!agentsMap[log.agent_id]) {
        agentsMap[log.agent_id] = { id: log.agent_id, name: log.agent_id, totalActions: 0, blockedActions: 0, riskLevel: 'low' };
      }
      agentsMap[log.agent_id].totalActions++;
      if (log.status === 'blocked') agentsMap[log.agent_id].blockedActions++;
      if (log.risk_score === 'high' && log.status === 'allowed') agentsMap[log.agent_id].riskLevel = 'high';
      else if (log.risk_score === 'high' && agentsMap[log.agent_id].riskLevel !== 'high') agentsMap[log.agent_id].riskLevel = 'medium';
    });
    return Object.values(agentsMap).slice(0, 4) as any[];
  }, [aiLogs]);

  const blockedActions = useMemo(() => {
    return activityEvents
      .filter(e => e.status === 'blocked')
      .slice(0, 5);
  }, [activityEvents]);

  const policyRules = useMemo(() => {
    if (policies.length > 0) {
      return policies.slice(0, 4).map(p => ({
        id: p.id,
        agent: p.name || 'Global',
        action: p.description.slice(0, 30),
        enabled: p.enabled
      }));
    }
    return [
      { id: '1', agent: 'finance-bot', action: 'external_share', enabled: true },
      { id: '2', agent: 'med-ai', action: 'read_pii', enabled: true },
    ];
  }, [policies]);

  const handleReplay = async (id: string) => {
    console.log('Replaying action:', id);
    try {
      const res = await replayAction(id);
      console.log('Replay Result:', res);
      // Optional: Show toast or update state
    } catch (err) {
      console.error('Replay failed:', err);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    console.log(`Exporting logs as ${format}...`);
    const content = format === 'json' 
      ? JSON.stringify(aiLogs, null, 2)
      : 'ID,Agent,Action,Status,Risk,Timestamp\n' + aiLogs.map(l => `${l.id},${l.agent_id},${l.action},${l.status},${l.risk_score},${l.created_at}`).join('\n');
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentra-ai-logs.${format}`;
    link.click();
  };

  if (loading && aiLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-slate-500 font-bold uppercase tracking-widest">Activating Business Value Layer...</p>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-16 px-4">
      {/* Top Value Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
            <Zap className="w-3 h-3 fill-indigo-600" />
            AI Governance Command Center
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl">
            Secure Your AI <span className="text-indigo-600">Innovation.</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-xl">
            Instantly visualize risk prevention, compliance mapping, and the business impact of your AI security layer.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Industry Context</span>
            <UseCaseSelector currentMode={mode} onModeChange={setMode} />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsPolicyModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 mt-5"
            >
              <Plus className="w-4 h-4" />
              New Policy
            </button>
          )}
        </div>
      </div>

      {/* Hero Value Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <BeforeAfterPanel />
        </div>
        <div className="lg:col-span-4">
          <SecurityScoreCard score={securityScore} />
        </div>
      </div>

      {/* Summary Stats */}
      <DashboardHeader 
        total={stats.total} 
        allowed={stats.allowed} 
        blocked={stats.blocked} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Stream */}
        <div className="lg:col-span-8">
          <ActivityFeed 
            events={activityEvents} 
            onReplay={handleReplay} 
            onExport={handleExport}
          />
        </div>

        {/* Intelligence Column */}
        <div className="lg:col-span-4 space-y-6">
          <AgentProfileList agents={agentStats} />
          
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-tight">Active ROI Monitoring</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 font-medium">Compliance Violations Prevented</span>
                  <span className="text-xl font-black text-indigo-400">{stats.blocked}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 font-medium">Potential Fines Avoided (Est.)</span>
                  <span className="text-xl font-black text-green-400">${(stats.blocked * 45000).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 italic leading-relaxed text-center">
                  *Based on average GDPR/CCPA penalty estimates for unauthorized data processing.
                </p>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors" />
          </div>

          <IntegrationFlowCard />
          <PolicyPanel rules={policyRules} onToggle={() => {}} />
        </div>
      </div>

      {/* Policy Builder Modal */}
      <PolicyBuilderModal 
        isOpen={isPolicyModalOpen} 
        onClose={() => setIsPolicyModalOpen(false)} 
        onSave={(p) => {
          console.log('Saving new policy:', p);
          // In a real app, call api.createPolicy(p)
          setPolicies(prev => [...prev, p as any]);
        }} 
      />

      {/* Footer Branding */}
      <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Globe className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sentra AI Global Security Network</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>Terms</span>
          <span>Privacy</span>
          <span>© 2026 Sentra AI</span>
        </div>
      </div>
    </div>
  );
}
// Build trigger 2: Fri Apr 17 17:42:04 IST 2026
