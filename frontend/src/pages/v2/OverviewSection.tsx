import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ShieldCheck, 
  Bot, 
  Ban, 
  Zap, 
  RefreshCw, 
  Lock,
  ChevronRight,
  Network
} from 'lucide-react';
import { PageContainer } from '@/components/v2/PageContainer';
import { MetricCard } from '@/components/v2/MetricCard';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { apiRequest, fetchSdkStatus } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function OverviewSection() {
  const [loading, setLoading] = useState(true);
  const [sdkConnected, setSdkConnected] = useState(true);

  // Stats state
  const [kpis, setKpis] = useState({
    postureScore: 0,
    agentsMonitored: 0,
    blockedToday: 0,
    flaggedToday: 0,
    highBlastRadius: 0
  });

  const [complianceFrameworks, setComplianceFrameworks] = useState<
    { name: string; score: number; status: 'compliant' | 'warning' | 'critical' }[]
  >([
    { name: 'GDPR', score: 0, status: 'warning' },
    { name: 'DPDP', score: 0, status: 'warning' },
    { name: 'HIPAA', score: 0, status: 'warning' },
    { name: 'PCI-DSS', score: 0, status: 'warning' },
    { name: 'NIST AI RMF', score: 0, status: 'warning' }
  ]);

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, statsRes, compRes, sdkStatus] = await Promise.all([
        apiRequest<any>('/ai-systems').catch(() => ({ items: [] })),
        apiRequest<any>('/ai/dashboard-stats').catch(() => null),
        apiRequest<any>('/compliance/stats').catch(() => null),
        fetchSdkStatus().catch(() => ({ connected: false, connectedAt: null }))
      ]);

      const isSdkLive = !!sdkStatus?.connected;
      setSdkConnected(isSdkLive);

      const items = Array.isArray(sysRes?.items) ? sysRes.items : (Array.isArray(sysRes) ? sysRes : []);
      const totalSystems = items.length;
      const highBlast = items.filter((s: any) => s.risk_tier === 'CRITICAL' || s.risk_tier === 'HIGH').length;
      const statsPayload = statsRes?.data || statsRes || {};
      const blocked = statsPayload?.kpis?.modelsBlockedToday?.value ?? (statsPayload?.kpis?.blockedCount?.value ?? 0);
      const flagged = statsPayload?.kpis?.flaggedToday?.value ?? 0;
      const posture = statsPayload?.kpis?.complianceScore?.value ?? 0;

      setKpis({
        postureScore: posture,
        agentsMonitored: totalSystems,
        blockedToday: blocked,
        flaggedToday: flagged,
        highBlastRadius: highBlast
      });

      if (compRes?.frameworks) {
        const activeNames = ['GDPR', 'DPDP', 'HIPAA', 'PCI-DSS', 'NIST AI RMF'];
        const normalize = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const mapped = activeNames.map(name => {
          const found = compRes.frameworks.find((f: any) => 
            normalize(f.name) === normalize(name)
          );
          const rawScore = found?.score;
          const score = typeof rawScore === 'number' ? rawScore : 0;
          return {
            name,
            score,
            status: score >= 85 ? 'compliant' as const : 'warning' as const
          };
        });
        setComplianceFrameworks(mapped);
      }

      // Build relationship graph nodes and edges
      buildGraphData(items, isSdkLive);

    } catch (err: any) {
      console.error('Failed to load overview metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const buildGraphData = (systemsList: any[], isSdkLive: boolean) => {
    if (!isSdkLive || !systemsList || systemsList.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const realNodes: Node[] = [];
    const realEdges: Edge[] = [];

    systemsList.forEach((sys: any, idx: number) => {
      const riskLevel = (sys.risk_tier || 'LOW').toUpperCase();
      const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
      const nodeId = `agent-${sys.id || idx}`;
      realNodes.push({
        id: nodeId,
        position: { x: 200 + (idx % 3) * 260, y: 80 + Math.floor(idx / 3) * 160 },
        data: {
          label: sys.name || sys.system_name || `Agent ${idx + 1}`,
          type: 'AGENT',
          risk: riskLevel,
          source: sys.system_type || sys.framework || sys.vendor || 'Sentra SDK'
        },
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          border: isCritical ? '2px solid #ef4444' : '1px solid #6366f1',
          boxShadow: isCritical ? '0 0 15px rgba(239, 68, 68, 0.3)' : undefined
        }
      });

      if (idx > 0) {
        const prevId = `agent-${systemsList[idx - 1].id || (idx - 1)}`;
        realEdges.push({
          id: `edge-${prevId}-${nodeId}`,
          source: prevId,
          target: nodeId,
          animated: isCritical,
          style: { stroke: isCritical ? '#ef4444' : '#6366f1', strokeWidth: 1.5 }
        });
      }
    });

    setNodes(realNodes);
    setEdges(realEdges);
  };

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeData(node.data);
  };

  return (
    <PageContainer
      title="Overview"
      subtitle="Unified AI posture summary, compliance snapshots, and real-time agent relationship mapping."
      actions={
        <button
          onClick={loadOverviewData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Workspace
        </button>
      }
    >
      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Posture Score"
          value={sdkConnected ? `${kpis.postureScore}%` : '—'}
          subtitle={sdkConnected ? "Workspace AI security rating" : "Awaiting SDK Connection"}
          status={sdkConnected ? (kpis.postureScore >= 80 ? 'success' : 'warning') : 'neutral'}
          icon={ShieldCheck}
          trend={sdkConnected && kpis.postureScore > 0 ? { value: '+3% vs last week', direction: 'up', isGood: true } : undefined}
        />
        <MetricCard
          label="Agents Monitored"
          value={kpis.agentsMonitored}
          subtitle={sdkConnected ? "Registered & discovery agents" : "Awaiting SDK Connection"}
          status="primary"
          icon={Bot}
          trend={sdkConnected && kpis.agentsMonitored > 0 ? { value: `${kpis.agentsMonitored} online`, direction: 'neutral', isGood: true } : undefined}
        />
        <MetricCard
          label="Blocked Today"
          value={kpis.blockedToday}
          subtitle={sdkConnected ? `Adversarial & PII violations (${kpis.flaggedToday} Flagged Today)` : "Awaiting SDK Connection"}
          status={sdkConnected && kpis.blockedToday > 0 ? "danger" : "neutral"}
          icon={Ban}
          testId="threats-prevented-count"
          trend={sdkConnected && (kpis.blockedToday > 0 || kpis.flaggedToday > 0) ? { value: `${kpis.blockedToday} blocked • ${kpis.flaggedToday} flagged`, direction: 'up', isGood: false } : undefined}
        />
        <MetricCard
          label="High Blast-Radius Agents"
          value={kpis.highBlastRadius}
          subtitle={sdkConnected ? "Direct production system access" : "Awaiting SDK Connection"}
          status={sdkConnected && kpis.highBlastRadius > 0 ? 'warning' : 'neutral'}
          icon={Zap}
          trend={sdkConnected && kpis.highBlastRadius > 0 ? { value: 'Action required', direction: 'neutral', isGood: false } : undefined}
        />
      </div>

      {/* Row 2: Compliance Snapshot (5 Framework Score Pills) */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Compliance Readiness Snapshot
            </h2>
          </div>
          <Link
            to="/app/compliance"
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            View Framework Details <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {complianceFrameworks.map((fw) => (
            <div
              key={fw.name}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:border-indigo-500/40"
            >
              <span className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200">
                {fw.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                  {sdkConnected ? `${fw.score}%` : '—'}
                </span>
                <StatusBadge 
                  status={sdkConnected ? fw.status : 'awaiting_telemetry'} 
                  label={sdkConnected ? undefined : 'Awaiting Connection'}
                  size="sm" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Agent Relationship Graph */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[520px]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Agent Relationship Graph
            </h2>
            {sdkConnected && nodes.length > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                High-Risk Paths Red-Highlighted
              </span>
            ) : (
              <StatusBadge status="awaiting_telemetry" label="Awaiting Connection" size="sm" />
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {sdkConnected && nodes.length > 0 ? 'Interactive Node Mapping' : '0 Mapped Topologies'}
          </span>
        </div>

        <div className="flex-1 relative bg-slate-950 flex items-center justify-center">
          {!sdkConnected || nodes.length === 0 ? (
            <div data-testid="agent-graph-empty-state" className="text-center max-w-md p-6 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                {!sdkConnected ? 'Awaiting SDK Connection' : 'No Agent Topologies Mapped'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {!sdkConnected
                  ? 'Connect the Sentra SDK to discover active agent topologies, tool access permissions, and inter-system data flows.'
                  : 'No inter-agent communication or sensitive resource access detected yet. Connect agent runtimes to map relationships.'}
              </p>
            </div>
          ) : (
            <>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
              >
                <Background color="rgba(99, 102, 241, 0.1)" gap={20} size={1} />
                <Controls className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-slate-900 dark:text-white" />
                <MiniMap
                  className="bg-slate-900 border border-slate-800 rounded-lg"
                  nodeColor={(n) => (n.data?.risk === 'CRITICAL' ? '#ef4444' : '#6366f1')}
                />
              </ReactFlow>

              {/* Node detail side card */}
              {selectedNodeData && (
                <div className="absolute right-4 top-4 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-100 rounded-xl p-4 shadow-2xl space-y-3 z-20">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase text-indigo-400">
                      {selectedNodeData.type} Node Info
                    </span>
                    <button
                      onClick={() => setSelectedNodeData(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedNodeData.label}</h4>
                    {selectedNodeData.source && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Source: {selectedNodeData.source}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded text-xs font-semibold">
                    <span className="text-slate-400">Risk Tier</span>
                    <StatusBadge status={selectedNodeData.risk || 'LOW'} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
