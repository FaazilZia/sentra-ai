import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { RiskPill } from '@/components/v2/RiskPill';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest, fetchSdkStatus } from '@/lib/api';
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

export interface RankedAgentRisk {
  id: string;
  rank: number;
  agentName: string;
  source: string;
  compositeScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  openViolations: number;
  lastAssessed: string;
}

export interface DriftItem {
  id: string;
  name: string;
  type: string;
  shift: string;
  status: 'warning' | 'danger' | 'active';
}

export const extractList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.alerts)) return res.alerts;
  return [];
};

export const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Never assessed';
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 'Never assessed';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(timestamp).toISOString().split('T')[0];
};

export const resolveSeverity = (score: number, level?: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
  const upper = String(level || '').toUpperCase();
  if (upper === 'CRITICAL' || score >= 80) return 'CRITICAL';
  if (upper === 'HIGH' || score >= 60) return 'HIGH';
  if (upper === 'MEDIUM' || score >= 40) return 'MEDIUM';
  return 'LOW';
};

export const resolveTierScore = (tier?: string): number => {
  const upper = String(tier || '').toUpperCase();
  if (upper === 'CRITICAL') return 85;
  if (upper === 'HIGH') return 70;
  if (upper === 'MEDIUM') return 45;
  return 20;
};

export const mergeRankedAgents = (risks: any[], systems: any[]): RankedAgentRisk[] => {
  const assessedSystemIds = new Set<string>();
  const unranked: Omit<RankedAgentRisk, 'rank'>[] = [];

  for (let i = 0; i < risks.length; i++) {
    const r = risks[i];
    const sysId = r?.aiSystemId || r?.ai_system?.id;
    if (sysId) {
      assessedSystemIds.add(String(sysId));
    }

    const score = Number(r?.score ?? 0);
    const findingsCount = Array.isArray(r?.details?.findings) 
      ? r.details.findings.length 
      : (typeof r?.details?.violationsCount === 'number' ? r.details.violationsCount : (score >= 80 ? 3 : score >= 60 ? 1 : 0));
    const agentName = r?.ai_system?.name || r?.name || `Agent-${i + 1}`;
    const source = r?.ai_system?.status ? `Status: ${r.ai_system.status}` : (r?.source || 'Risk Assessment');
    const severity = resolveSeverity(score, r?.risk_level || r?.ai_system?.risk_tier);
    const lastAssessed = formatRelativeTime(r?.updated_at || r?.created_at);

    unranked.push({
      id: r?.id || `risk-${i}`,
      agentName,
      source,
      compositeScore: score,
      severity,
      openViolations: findingsCount,
      lastAssessed
    });
  }

  for (let j = 0; j < systems.length; j++) {
    const s = systems[j];
    const sId = String(s?.id || '');
    if (sId && assessedSystemIds.has(sId)) {
      continue;
    }

    const defaultScore = resolveTierScore(s?.risk_tier);
    const agentName = s?.name || `Unassessed-${j + 1}`;
    const source = s?.vendor || s?.model_name || 'Registered AI System';
    const severity = resolveSeverity(defaultScore, s?.risk_tier);
    const lastAssessed = formatRelativeTime(s?.updated_at || s?.created_at);

    unranked.push({
      id: s?.id || `system-${j}`,
      agentName,
      source,
      compositeScore: defaultScore,
      severity,
      openViolations: 0,
      lastAssessed
    });
  }

  unranked.sort((a, b) => b.compositeScore - a.compositeScore);

  return unranked.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
};

export default function RiskSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>('ranking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkConnected, setSdkConnected] = useState(true);
  const [rankedAgents, setRankedAgents] = useState<RankedAgentRisk[]>([]);
  const [driftAlerts, setDriftAlerts] = useState<DriftItem[]>([]);
  const [impactAssessments, setImpactAssessments] = useState<any[]>([]);

  const loadRiskData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskRes, sysRes, driftRes, impactRes, sdkStatus] = await Promise.all([
        apiRequest<any>('/risks'),
        apiRequest<any>('/ai-systems').catch(() => []),
        apiRequest<any>('/drift/alerts').catch(() => []),
        apiRequest<any>('/governance/impact-assessments').catch(() => ({ items: [] })),
        fetchSdkStatus().catch(() => ({ connected: false, connectedAt: null }))
      ]);

      const isSdkLive = !!sdkStatus?.connected;
      setSdkConnected(isSdkLive);

      const rawRisks = extractList(riskRes);
      const rawSystems = extractList(sysRes);
      const rawDrifts = extractList(driftRes);
      const rawImpacts = extractList(impactRes);

      setImpactAssessments(rawImpacts);

      const ranked = mergeRankedAgents(rawRisks, rawSystems);
      setRankedAgents(ranked);

      const mappedDrifts: DriftItem[] = rawDrifts.map((d: any, idx: number) => {
        const divergenceStr = d?.divergencePct !== undefined 
          ? `${d.divergencePct > 0 ? '+' : ''}${d.divergencePct}%` 
          : '+10.0%';
        const isHighSeverity = d?.severity === 'CRITICAL' || d?.severity === 'HIGH';
        return {
          id: d?.id || `drift-${idx}`,
          name: d?.agentName ? `${d.agentName} - ${d.driftType || 'Drift'}` : (d?.metricName || `Drift Event #${idx + 1}`),
          type: d?.driftType || 'Concept Drift',
          shift: `${divergenceStr} ${d?.metricName || 'Divergence'}`,
          status: isHighSeverity ? 'danger' : 'warning'
        };
      });
      setDriftAlerts(mappedDrifts);

    } catch (err: any) {
      console.error('Error loading risk center:', err);
      setError(err?.message || 'Failed to load risk data');
      setRankedAgents([]);
      setDriftAlerts([]);
      setImpactAssessments([]);
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
          value={sdkConnected ? criticalCount : 0}
          subtitle={sdkConnected ? "Immediate mitigation required" : "Awaiting telemetry to assess risk"}
          status={sdkConnected && criticalCount > 0 ? "danger" : "neutral"}
          icon={ShieldAlert}
          testId="critical-severity-count"
        />
        <MetricCard
          label="High Severity Risk"
          value={sdkConnected ? highCount : 0}
          subtitle={sdkConnected ? "Elevated blast-radius access" : "Awaiting telemetry to assess risk"}
          status={sdkConnected && highCount > 0 ? "warning" : "neutral"}
          icon={AlertTriangle}
          testId="high-severity-count"
        />
        <MetricCard
          label="Medium Severity Risk"
          value={sdkConnected ? mediumCount : 0}
          subtitle={sdkConnected ? "Policy threshold warnings" : "Awaiting telemetry to assess risk"}
          status={sdkConnected && mediumCount > 0 ? "warning" : "neutral"}
          icon={Activity}
          testId="medium-severity-count"
        />
        <MetricCard
          label="Active Drift Alerts"
          value={sdkConnected ? driftAlerts.length : 0}
          subtitle={sdkConnected ? "Concept & hallucination drift" : "Awaiting telemetry to assess risk"}
          status={sdkConnected && driftAlerts.length > 0 ? "info" : "neutral"}
          icon={TrendingUp}
          testId="active-drift-alerts"
        />
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
          <button
            onClick={loadRiskData}
            className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sub-Tabs */}
      <TabBar
        tabs={[
          { id: 'ranking', label: 'Ranked Highest-Risk Agents', count: sdkConnected ? rankedAgents.length : 0, icon: ShieldAlert },
          { id: 'drift', label: 'Drift Detection Alerts', count: sdkConnected ? driftAlerts.length : 0, icon: Activity },
          { id: 'assessments', label: 'Risk Audits & Impact Boards', count: impactAssessments.length, icon: Award }
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
          emptyMessage={
            !sdkConnected && rankedAgents.length === 0
              ? "No risk assessments yet — Awaiting SDK Connection"
              : "No risk assessments or monitored AI systems yet."
          }
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
            <StatusBadge 
              status={driftAlerts.length > 0 ? 'warning' : 'compliant'} 
              label={`${driftAlerts.length} Drift Events Flagged`} 
            />
          </div>

          <div className="space-y-3">
            {driftAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No continuous model drift alerts detected.
              </div>
            ) : (
              driftAlerts.map((drift) => (
                <div key={drift.id} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{drift.name}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Type: {drift.type} • Delta: {drift.shift}</span>
                  </div>
                  <StatusBadge status={drift.status} />
                </div>
              ))
            )}
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

          {impactAssessments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {sdkConnected ? "No impact assessments recorded yet." : "No Audits Run Yet — Awaiting SDK Connection"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {impactAssessments.map((item: any, idx: number) => (
                <div key={item.id || idx} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase text-indigo-500 font-mono">
                    {item.type || 'Risk Audit Board'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.name || item.form_data?.title || `Assessment #${idx + 1}`}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.description || item.form_data?.scope || 'Formal risk assessment record.'}
                  </p>
                  <StatusBadge 
                    status={item.status === 'APPROVED' ? 'compliant' : item.status === 'SUBMITTED' ? 'pending' : 'draft'} 
                    label={item.status || 'Completed'} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
