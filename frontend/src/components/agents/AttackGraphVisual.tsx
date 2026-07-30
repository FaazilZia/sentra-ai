import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ShieldAlert, 
  Database, 
  Key, 
  Cpu, 
  RefreshCw, 
  Search, 
  Layers
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export interface AttackGraphNode {
  id: string;
  label: string;
  type: 'AGENT' | 'CONNECTOR' | 'DATA_SOURCE' | 'LLM_KEY';
  agentType?: string;
  accessLevel?: string;
  status: string;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusScore: number;
  details?: any;
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  riskLevel?: string;
}

export interface PrivilegePath {
  agentId: string;
  agentName: string;
  maxImpactAction: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusScore: number;
  connectedResourcesCount: number;
  path: string[];
}

export interface AttackGraphPayload {
  nodes: AttackGraphNode[];
  edges: AttackGraphEdge[];
  privilegePaths: PrivilegePath[];
  summary: {
    totalAgents: number;
    totalConnectors: number;
    criticalPathsCount: number;
    avgBlastRadius: number;
  };
}

export default function AttackGraphVisual() {
  const { addToast } = useStore();
  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [graphData, setGraphData] = useState<AttackGraphPayload | null>(null);
  const [selectedNode, setSelectedNode] = useState<AttackGraphNode | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<AttackGraphPayload>('/agents/attack-graph');
      setGraphData(data);

      if (!data || !data.nodes || data.nodes.length === 0) {
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      // Convert backend graph nodes to ReactFlow nodes
      const agents = data.nodes.filter(n => n.type === 'AGENT');
      const connectors = data.nodes.filter(n => n.type !== 'AGENT');

      const formattedNodes: Node[] = [];
      const formattedEdges: Edge[] = [];

      // Layout calculations: Agents on left column, Connectors on right column
      agents.forEach((node, index) => {
        const riskColor = 
          node.risk === 'CRITICAL' ? '#ef4444' :
          node.risk === 'HIGH' ? '#f97316' :
          node.risk === 'MEDIUM' ? '#eab308' : '#3b82f6';

        formattedNodes.push({
          id: node.id,
          type: 'default',
          position: { x: 100, y: 100 + index * 140 },
          data: { 
            label: (
              <div className="flex flex-col p-3 gap-1 min-w-[200px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[13px] text-white flex items-center gap-1.5 truncate">
                    <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
                    {node.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
                    {node.blastRadiusScore} BR
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{node.agentType || 'AGENT'}</span>
                  <span>•</span>
                  <span className="capitalize">{node.accessLevel || 'STANDARD'}</span>
                </div>
              </div>
            )
          },
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: `1.5px solid ${riskColor}`,
            borderRadius: '12px',
            boxShadow: `0 4px 20px ${riskColor}25`,
            width: 240,
          },
        });
      });

      connectors.forEach((node, index) => {
        const isDb = node.type === 'CONNECTOR';

        formattedNodes.push({
          id: node.id,
          type: 'default',
          position: { x: 550, y: 100 + index * 130 },
          data: { 
            label: (
              <div className="flex flex-col p-3 gap-1 min-w-[200px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[13px] text-slate-200 flex items-center gap-1.5 truncate">
                    {isDb ? <Database className="h-4 w-4 text-emerald-400 shrink-0" /> : <Key className="h-4 w-4 text-amber-400 shrink-0" />}
                    {node.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {node.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Scope: {node.accessLevel || 'READ_WRITE'}
                </div>
              </div>
            )
          },
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#fff',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '12px',
            width: 240,
          },
        });
      });

      // Convert edges
      data.edges.forEach((edge) => {
        const isCritical = edge.riskLevel === 'CRITICAL';
        const isShared = edge.type === 'SHARES_CREDENTIAL';

        formattedEdges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: isCritical || isShared,
          label: edge.label,
          style: {
            stroke: isShared ? '#8b5cf6' : isCritical ? '#ef4444' : '#64748b',
            strokeWidth: isCritical ? 2.5 : 1.5,
            strokeDasharray: isShared ? '5 5' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isShared ? '#8b5cf6' : isCritical ? '#ef4444' : '#64748b',
          },
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
        });
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);
    } catch (err: any) {
      addToast({
        message: err.message || 'Failed to load Attack Graph',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Filter nodes
  const filteredNodes = rfNodes.filter((node) => {
    const rawNode = graphData?.nodes.find((n) => n.id === node.id);
    if (!rawNode) return true;
    const matchesSearch = rawNode.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || rawNode.risk === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const selectedPath = graphData?.privilegePaths.find(
    (p) => selectedNode && p.agentId === selectedNode.id.replace(/^agent-/, '')
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Summary KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Discovered Agents</span>
          <span className="text-2xl font-bold text-white tracking-tight">{graphData?.summary.totalAgents || 0}</span>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Connected Data Sources</span>
          <span className="text-2xl font-bold text-white tracking-tight">{graphData?.summary.totalConnectors || 0}</span>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col gap-1">
          <span className="text-xs font-semibold text-rose-400">Critical Privilege Paths</span>
          <span className="text-2xl font-bold text-rose-400 tracking-tight">{graphData?.summary.criticalPathsCount || 0}</span>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Avg. Blast Radius</span>
          <span className="text-2xl font-bold text-indigo-400 tracking-tight">{graphData?.summary.avgBlastRadius || 0} / 100</span>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search agent or connector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-page)] border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 text-xs bg-[var(--bg-page)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>

        <button
          onClick={fetchGraph}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh Relationship Graph
        </button>
      </div>

      {/* Main Canvas + Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[620px]">
        {/* Graph Canvas */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-color)] bg-[#0b0f19] overflow-hidden relative">
          <ReactFlow
            nodes={filteredNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => {
              const raw = graphData?.nodes.find((n) => n.id === node.id);
              if (raw) setSelectedNode(raw);
            }}
            fitView
          >
            <Controls className="bg-slate-900 border-slate-700 text-white fill-white" />
            <MiniMap nodeColor="#475569" maskColor="rgba(15, 23, 42, 0.7)" className="bg-slate-900 border border-slate-800" />
            <Background color="#1e293b" gap={16} />
          </ReactFlow>
        </div>

        {/* Node Detail & Privilege Path Sidebar */}
        <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-4 overflow-y-auto">
          {selectedNode ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                    {selectedNode.label}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{selectedNode.type} • {selectedNode.status}</p>
                </div>
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-bold uppercase",
                  selectedNode.risk === 'CRITICAL' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                  selectedNode.risk === 'HIGH' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-indigo-500/20 text-indigo-400"
                )}>
                  {selectedNode.risk}
                </span>
              </div>

              {/* Blast Radius Score Meter */}
              <div className="flex flex-col gap-1.5 p-3.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-secondary)]">Blast Radius Score</span>
                  <span className="text-indigo-400 font-mono font-bold text-sm">{selectedNode.blastRadiusScore} / 100</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      selectedNode.blastRadiusScore >= 75 ? "bg-rose-500" :
                      selectedNode.blastRadiusScore >= 50 ? "bg-amber-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${selectedNode.blastRadiusScore}%` }}
                  />
                </div>
              </div>

              {/* Privilege Path Analysis */}
              {selectedPath && (
                <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-indigo-400" />
                    Privilege Path (Max Impact)
                  </span>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    "{selectedPath.maxImpactAction}"
                  </p>
                </div>
              )}

              {/* Connected Details */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Metadata & Scope</span>
                <pre className="text-[11px] p-3 rounded-lg bg-[var(--bg-page)] text-slate-300 border border-[var(--border-color)] overflow-x-auto font-mono">
                  {JSON.stringify(selectedNode.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-3">
              <Layers className="h-10 w-10 text-[var(--text-secondary)] opacity-50" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Click any Agent or Connector node on the Attack Graph canvas to inspect its privilege path, connected credentials, and blast-radius score.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
