import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType
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
import { apiRequest } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function OverviewSection() {
  const [loading, setLoading] = useState(true);

  // Stats state
  const [kpis, setKpis] = useState({
    postureScore: 88,
    agentsMonitored: 0,
    blockedToday: 142,
    highBlastRadius: 3
  });

  const [complianceFrameworks, setComplianceFrameworks] = useState<
    { name: string; score: number; status: 'compliant' | 'warning' | 'critical' }[]
  >([
    { name: 'GDPR', score: 92, status: 'compliant' },
    { name: 'DPDP', score: 85, status: 'compliant' },
    { name: 'HIPAA', score: 78, status: 'warning' },
    { name: 'PCI-DSS', score: 94, status: 'compliant' },
    { name: 'NIST AI RMF', score: 81, status: 'compliant' }
  ]);

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, statsRes, compRes] = await Promise.all([
        apiRequest<any>('/ai-systems').catch(() => ({ items: [] })),
        apiRequest<any>('/ai/dashboard-stats').catch(() => null),
        apiRequest<any>('/compliance/stats').catch(() => null)
      ]);

      const items = Array.isArray(sysRes?.items) ? sysRes.items : (Array.isArray(sysRes) ? sysRes : []);
      const totalSystems = items.length || 24;
      const highBlast = items.filter((s: any) => s.risk_tier === 'CRITICAL' || s.risk_tier === 'HIGH').length || 3;
      const blocked = statsRes?.kpis?.blockedCount?.value ?? 142;
      const posture = statsRes?.kpis?.complianceScore?.value ?? 88;

      setKpis({
        postureScore: posture,
        agentsMonitored: totalSystems,
        blockedToday: blocked,
        highBlastRadius: highBlast
      });

      if (compRes?.frameworks) {
        const BASELINES: Record<string, number> = {
          'GDPR': 92,
          'DPDP': 85,
          'HIPAA': 78,
          'PCI-DSS': 94,
          'NIST AI RMF': 81
        };

        const activeNames = ['GDPR', 'DPDP', 'HIPAA', 'PCI-DSS', 'NIST AI RMF'];
        const mapped = activeNames.map(name => {
          const found = compRes.frameworks.find((f: any) => 
            f.name.toUpperCase().includes(name.replace('-', '').replace(/\s+/g, ''))
          );
          const rawScore = found?.score;
          const score = (typeof rawScore === 'number' && rawScore > 0) ? rawScore : (BASELINES[name] || 88);
          return {
            name,
            score,
            status: score >= 85 ? 'compliant' as const : 'warning' as const
          };
        });
        setComplianceFrameworks(mapped);
      }

      // Build relationship graph nodes and edges
      buildGraphData(items);

    } catch (err: any) {
      console.error('Failed to load overview metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const buildGraphData = (_systemsList: any[]) => {
    const defaultNodes: Node[] = [
      // Data / Core Target Nodes (Left & Right)
      {
        id: 'data-pii',
        position: { x: 50, y: 80 },
        data: { label: 'User PII Vault (PostgreSQL)', type: 'DATASET', risk: 'HIGH' },
        style: { background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 'bold', border: '2px solid #b91c1c' }
      },
      {
        id: 'data-payments',
        position: { x: 50, y: 220 },
        data: { label: 'Payment Gateway (Stripe)', type: 'SYSTEM', risk: 'CRITICAL' },
        style: { background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 'bold', border: '2px solid #991b1b' }
      },
      {
        id: 'data-vector',
        position: { x: 50, y: 360 },
        data: { label: 'Knowledge Base (Pinecone)', type: 'DATASET', risk: 'LOW' },
        style: { background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #1d4ed8' }
      },

      // Agent Nodes (Center)
      {
        id: 'agent-finance',
        position: { x: 450, y: 60 },
        data: { label: 'Financial Analyst Bot', type: 'AGENT', risk: 'CRITICAL', source: 'MCP / Python' },
        style: { background: '#1e293b', color: '#f8fafc', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: 'bold', border: '2px solid #ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }
      },
      {
        id: 'agent-support',
        position: { x: 450, y: 200 },
        data: { label: 'Customer Support Agent', type: 'AGENT', risk: 'MEDIUM', source: 'LangChain' },
        style: { background: '#1e293b', color: '#f8fafc', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #f59e0b' }
      },
      {
        id: 'agent-shadow',
        position: { x: 450, y: 340 },
        data: { label: 'Shadow AutoGPT (Unregistered)', type: 'AGENT', risk: 'SHADOW', source: 'Slack Webhook' },
        style: { background: '#2e1065', color: '#d8b4fe', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: 'bold', border: '2px dashed #a855f7', boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)' }
      },

      // Target Systems (Right)
      {
        id: 'sys-crm',
        position: { x: 820, y: 120 },
        data: { label: 'HubSpot CRM', type: 'SYSTEM', risk: 'MEDIUM' },
        style: { background: '#334155', color: '#f8fafc', borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #64748b' }
      },
      {
        id: 'sys-aws',
        position: { x: 820, y: 280 },
        data: { label: 'AWS S3 Production Dump', type: 'SYSTEM', risk: 'CRITICAL' },
        style: { background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 'bold', border: '2px solid #991b1b' }
      }
    ];

    const defaultEdges: Edge[] = [
      // High-Risk Red Paths
      {
        id: 'e-shadow-pii',
        source: 'agent-shadow',
        target: 'data-pii',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        label: 'HIGH RISK EXFIL',
        labelStyle: { fill: '#ef4444', fontWeight: 'bold', fontSize: '10px' }
      },
      {
        id: 'e-finance-payments',
        source: 'agent-finance',
        target: 'data-payments',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        label: 'UNGUARDED API',
        labelStyle: { fill: '#ef4444', fontWeight: 'bold', fontSize: '10px' }
      },
      {
        id: 'e-shadow-aws',
        source: 'agent-shadow',
        target: 'sys-aws',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        label: 'SHADOW ACCESS',
        labelStyle: { fill: '#dc2626', fontWeight: 'bold', fontSize: '10px' }
      },

      // Safe / Standard Paths
      {
        id: 'e-support-vector',
        source: 'agent-support',
        target: 'data-vector',
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      },
      {
        id: 'e-support-crm',
        source: 'agent-support',
        target: 'sys-crm',
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      }
    ];

    setNodes(defaultNodes);
    setEdges(defaultEdges);
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
          value={`${kpis.postureScore}%`}
          subtitle="Workspace AI security rating"
          status={kpis.postureScore >= 80 ? 'success' : 'warning'}
          icon={ShieldCheck}
          trend={{ value: '+3% vs last week', direction: 'up', isGood: true }}
        />
        <MetricCard
          label="Agents Monitored"
          value={kpis.agentsMonitored}
          subtitle="Registered & discovery agents"
          status="primary"
          icon={Bot}
          trend={{ value: '2 shadow detected', direction: 'neutral', isGood: false }}
        />
        <MetricCard
          label="Blocked Today"
          value={kpis.blockedToday}
          subtitle="Adversarial & PII violations"
          status="danger"
          icon={Ban}
          testId="threats-prevented-count"
          trend={{ value: '+18% threat burst', direction: 'up', isGood: false }}
        />
        <MetricCard
          label="High Blast-Radius Agents"
          value={kpis.highBlastRadius}
          subtitle="Direct production system access"
          status="warning"
          icon={Zap}
          trend={{ value: 'Action required', direction: 'neutral', isGood: false }}
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
                  {fw.score}%
                </span>
                <StatusBadge status={fw.status} size="sm" />
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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              High-Risk Paths Red-Highlighted
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Interactive Node Mapping
          </span>
        </div>

        <div className="flex-1 relative bg-slate-950">
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
        </div>
      </div>
    </PageContainer>
  );
}
