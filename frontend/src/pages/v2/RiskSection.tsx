import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { RiskPill } from '@/components/v2/RiskPill';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Award, 
  RefreshCw, 
  Bot,
  Flame,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

interface RankedAgentRisk {
  id: string;
  rank: number;
  agentName: string;
  source: string;
  compositeScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  openViolations: number;
  lastAssessed: string;
}

export default function RiskSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>('ranking');
  const [loading, setLoading] = useState(false);
  const [rankedAgents, setRankedAgents] = useState<RankedAgentRisk[]>([]);

  const loadRiskData = useCallback(async () => {
    setLoading(true);
    try {
      const [_riskRes, _sysRes, _driftRes] = await Promise.all([
        apiRequest<any>('/risks').catch(() => ({ data: [] })),
        apiRequest<any>('/ai-systems').catch(() => ({ items: [] })),
        apiRequest<any>('/drift').catch(() => ({ data: [] }))
      ]);

      const mockRanked: RankedAgentRisk[] = [
        {
          id: 'rank-1',
          rank: 1,
          agentName: 'Financial Analyst Bot',
          source: 'MCP / Python SDK',
          compositeScore: 94,
          severity: 'CRITICAL',
          openViolations: 5,
          lastAssessed: '10 mins ago'
        },
        {
          id: 'rank-2',
          rank: 2,
          agentName: 'Shadow AutoGPT Assistant',
          source: 'Unregistered Slack Token',
          compositeScore: 88,
          severity: 'CRITICAL',
          openViolations: 8,
          lastAssessed: '1 hour ago'
        },
        {
          id: 'rank-3',
          rank: 3,
          agentName: 'Unverified CodeLlama Extension',
          source: 'VSCode Localhost',
          compositeScore: 76,
          severity: 'HIGH',
          openViolations: 3,
          lastAssessed: 'Yesterday'
        },
        {
          id: 'rank-4',
          rank: 4,
          agentName: 'Customer Support Agent',
          source: 'LangChain Framework',
          compositeScore: 42,
          severity: 'MEDIUM',
          openViolations: 1,
          lastAssessed: '2 days ago'
        }
      ];

      setRankedAgents(mockRanked);

    } catch (err: any) {
      console.error('Error loading risk center:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  const criticalCount = rankedAgents.filter(r => r.severity === 'CRITICAL').length;
  const highCount = rankedAgents.filter(r => r.severity === 'HIGH').length;
  const mediumCount = rankedAgents.filter(r => r.severity === 'MEDIUM').length;

  const columns: Column<RankedAgentRisk>[] = [
    {
      header: 'Rank',
      accessorKey: 'rank',
      sortable: true,
      cell: (item) => (
        <span className="flex items-center gap-1 font-mono font-black text-sm text-slate-900 dark:text-white">
          {item.rank === 1 && <Flame className="h-4 w-4 text-rose-500 fill-current animate-bounce" />}
          #{item.rank}
        </span>
      )
    },
    {
      header: 'Agent Name & Source',
      accessorKey: 'agentName',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2.5">
          <Bot className="h-4 w-4 text-indigo-500 shrink-0" />
          <div>
            <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.agentName}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.source}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Composite Risk Score',
      accessorKey: 'compositeScore',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 font-mono">
          <span className={`text-sm font-black ${
            item.compositeScore >= 80 ? 'text-rose-500' : item.compositeScore >= 60 ? 'text-orange-500' : 'text-amber-500'
          }`}>
            {item.compositeScore} / 100
          </span>
          <RiskPill level={item.severity} showIcon={false} />
        </div>
      )
    },
    {
      header: 'Open Risk Findings',
      accessorKey: 'openViolations',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-extrabold text-xs text-rose-600 dark:text-rose-400">
          {item.openViolations} Violations
        </span>
      )
    },
    {
      header: 'Audit Actions',
      cell: (item) => (
        <button
          onClick={() => addToast({ message: `Triggering deep risk audit for ${item.agentName}`, type: 'info' })}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
        >
          Remediate Risk <ArrowUpRight className="h-3 w-3" />
        </button>
      )
    }
  ];

  return (
    <PageContainer
      title="Risk"
      subtitle="Unified Risk Center — severity breakdown, composite agent risk rankings, drift detection, and impact assessments."
      actions={
        <button
          onClick={loadRiskData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Recalculate Risk Scores
        </button>
      }
    >
      {/* Severity Breakdown KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Critical Severity Risk"
          value={criticalCount}
          subtitle="Immediate mitigation required"
          status="danger"
          icon={ShieldAlert}
        />
        <MetricCard
          label="High Severity Risk"
          value={highCount}
          subtitle="Elevated blast-radius access"
          status="warning"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Medium Severity Risk"
          value={mediumCount}
          subtitle="Policy threshold warnings"
          status="warning"
          icon={Activity}
        />
        <MetricCard
          label="Active Drift Alerts"
          value={3}
          subtitle="Concept & hallucination drift"
          status="info"
          icon={TrendingUp}
          testId="threats-prevented-count"
        />
      </div>

      {/* Sub-Tabs */}
      <TabBar
        tabs={[
          { id: 'ranking', label: 'Ranked Highest-Risk Agents', count: rankedAgents.length, icon: ShieldAlert },
          { id: 'drift', label: 'Drift Detection Alerts', count: 3, icon: Activity },
          { id: 'assessments', label: 'Risk Audits & Impact Boards', icon: Award }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Ranked Highest-Risk Agents */}
      {activeTab === 'ranking' && (
        <DataTable
          columns={columns}
          data={rankedAgents}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          searchPlaceholder="Filter risk center by agent or severity..."
        />
      )}

      {/* Tab 2: Drift Detection Alerts */}
      {activeTab === 'drift' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" /> Continuous Model Drift & Performance Alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitors statistical divergence in model embeddings, token distribution, and latency decay.
              </p>
            </div>
            <StatusBadge status="warning" label="3 Drift Events Flagged" />
          </div>

          <div className="space-y-3">
            {[
              { name: 'Financial Analyst Bot - Embedding Drift', type: 'Concept Drift', shift: '+14.2% KL Divergence', status: 'warning' },
              { name: 'Customer Support Agent - Hallucination Spike', type: 'Accuracy Decay', shift: '0.82% -> 2.1% Hallucination', status: 'danger' }
            ].map((drift, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{drift.name}</h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Type: {drift.type} • Delta: {drift.shift}</span>
                </div>
                <StatusBadge status={drift.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Risk Audits & Impact Boards */}
      {activeTab === 'assessments' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-500" /> Formal AI Impact Assessment Boards
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Comprehensive risk audit records required for NIST AI RMF and enterprise governance compliance.
              </p>
            </div>
            <button
              onClick={() => addToast({ message: 'Creating new AI Impact Assessment...', type: 'info' })}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              + Create Impact Assessment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-indigo-500 font-mono">Quarterly Audit Board</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Q3 Financial Agent Blast-Radius Audit</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Assessed 14 data access points and API webhook boundaries.</p>
              <StatusBadge status="compliant" label="Audit Completed" />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
