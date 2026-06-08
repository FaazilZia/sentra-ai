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
  Network, 
  Search, 
  Filter, 
  RefreshCw, 
  Layers, 
  FileText, 
  ShieldAlert, 
  Building2, 
  Box, 
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

// Interfaces matching the backend structures
interface AISystem {
  id: string;
  name: string;
  description: string;
  status: string;
  risk_tier: string;
}

interface Dataset {
  id: string;
  name: string;
  description?: string;
  dataset_type: string;
  data_classification: string;
  ai_system_id?: string;
}

interface RiskAssessment {
  id: string;
  ai_system_id: string;
  score: number;
  risk_level: string;
  status: string;
  ai_system?: { name: string };
}

interface Policy {
  id: string;
  name: string;
  description: string;
  status: string;
  severity?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_type: string;
  risk_score: number;
  risk_level: string;
  status: string;
}

export default function EntityGraph() {
  const { addToast } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Data States
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  // Load all entities from the APIs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, dsRes, riskRes, polRes, venRes] = await Promise.all([
        apiRequest<any>('/ai-systems').catch(() => ({ items: [] })),
        apiRequest<any>('/datasets').catch(() => []),
        apiRequest<any>('/risks').catch(() => ({ data: [] })),
        apiRequest<any>('/policies').catch(() => []),
        apiRequest<any>('/vendors').catch(() => [])
      ]);

      const loadedSystems = sysRes?.items || sysRes || [];
      const loadedDatasets = dsRes?.data || dsRes || [];
      const loadedRisks = riskRes?.data || riskRes || [];
      const loadedPolicies = polRes?.data || polRes || [];
      const loadedVendors = venRes?.data || venRes || [];

      setSystems(loadedSystems);
      setDatasets(loadedDatasets);
      setRisks(loadedRisks);
      setPolicies(loadedPolicies);
      setVendors(loadedVendors);

    } catch (err: any) {
      addToast({
        message: `Failed to fetch lineage entities: ${err.message || 'Server error'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Construct Graph Nodes and Edges when data or filters change
  useEffect(() => {
    if (loading) return;

    // Filter elements
    const lowerSearch = searchTerm.toLowerCase();

    const filteredSystems = systems.filter(s => s.name.toLowerCase().includes(lowerSearch));
    const filteredDatasets = datasets.filter(d => d.name.toLowerCase().includes(lowerSearch));
    const filteredRisks = risks.filter(r => (r.ai_system?.name || '').toLowerCase().includes(lowerSearch) || r.risk_level.toLowerCase().includes(lowerSearch));
    const filteredPolicies = policies.filter(p => p.name.toLowerCase().includes(lowerSearch));
    const filteredVendors = vendors.filter(v => v.vendor_name.toLowerCase().includes(lowerSearch));

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Column positions
    const X_COLS = {
      DATASET: 50,
      VENDOR: 300,
      SYSTEM: 600,
      RISK: 900,
      POLICY: 1200
    };

    let datasetIdx = 0;
    let vendorIdx = 0;
    let systemIdx = 0;
    let riskIdx = 0;
    let policyIdx = 0;

    const Y_SPACING = 120;

    // 1. Create Dataset Nodes
    if (filterType === 'ALL' || filterType === 'DATASET') {
      filteredDatasets.forEach((ds) => {
        newNodes.push({
          id: `dataset-${ds.id}`,
          position: { x: X_COLS.DATASET, y: datasetIdx * Y_SPACING + 50 },
          data: { 
            label: ds.name, 
            type: 'DATASET',
            classification: ds.data_classification,
            details: ds 
          },
          style: {
            background: '#0d1b2a',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: 180,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }
        });
        datasetIdx++;
      });
    }

    // 2. Create Vendor Nodes
    if (filterType === 'ALL' || filterType === 'VENDOR') {
      filteredVendors.forEach((v) => {
        newNodes.push({
          id: `vendor-${v.id}`,
          position: { x: X_COLS.VENDOR, y: vendorIdx * Y_SPACING + 50 },
          data: { 
            label: v.vendor_name, 
            type: 'VENDOR',
            risk: v.risk_level,
            details: v 
          },
          style: {
            background: '#1c1917',
            color: '#f59e0b',
            border: '1px solid #d97706',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: 180,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }
        });
        vendorIdx++;
      });
    }

    // 3. Create System Nodes
    if (filterType === 'ALL' || filterType === 'SYSTEM') {
      filteredSystems.forEach((s) => {
        newNodes.push({
          id: `system-${s.id}`,
          position: { x: X_COLS.SYSTEM, y: systemIdx * Y_SPACING + 50 },
          data: { 
            label: s.name, 
            type: 'SYSTEM',
            tier: s.risk_tier,
            details: s 
          },
          style: {
            background: '#1e1b4b',
            color: '#818cf8',
            border: '1px solid #4f46e5',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: 200,
            boxShadow: '0 4px 12px -2px rgba(79, 70, 229, 0.2)'
          }
        });
        systemIdx++;
      });
    }

    // 4. Create Risk Nodes
    if (filterType === 'ALL' || filterType === 'RISK') {
      filteredRisks.forEach((r) => {
        newNodes.push({
          id: `risk-${r.id}`,
          position: { x: X_COLS.RISK, y: riskIdx * Y_SPACING + 50 },
          data: { 
            label: `Risk: ${r.risk_level} (${r.score})`, 
            type: 'RISK',
            level: r.risk_level,
            details: r 
          },
          style: {
            background: '#450a0a',
            color: '#f87171',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: 180,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }
        });
        riskIdx++;
      });
    }

    // 5. Create Policy Nodes
    if (filterType === 'ALL' || filterType === 'POLICY') {
      filteredPolicies.forEach((p) => {
        newNodes.push({
          id: `policy-${p.id}`,
          position: { x: X_COLS.POLICY, y: policyIdx * Y_SPACING + 50 },
          data: { 
            label: p.name, 
            type: 'POLICY',
            status: p.status,
            details: p 
          },
          style: {
            background: '#064e3b',
            color: '#34d399',
            border: '1px solid #059669',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            width: 180,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }
        });
        policyIdx++;
      });
    }

    // --- Create Relationships (Edges) ---
    
    // Connect Datasets -> Systems
    filteredDatasets.forEach((ds) => {
      if (ds.ai_system_id) {
        newEdges.push({
          id: `edge-ds-${ds.id}-sys-${ds.ai_system_id}`,
          source: `dataset-${ds.id}`,
          target: `system-${ds.ai_system_id}`,
          animated: true,
          style: { stroke: '#0284c7', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0284c7' }
        });
      }
    });

    // Connect Risks -> Systems
    filteredRisks.forEach((r) => {
      if (r.ai_system_id) {
        newEdges.push({
          id: `edge-risk-${r.id}-sys-${r.ai_system_id}`,
          source: `risk-${r.id}`,
          target: `system-${r.ai_system_id}`,
          style: { stroke: '#dc2626', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' }
        });
      }
    });

    // Connect Vendors -> Systems (Heuristic: overlap by system name or type match)
    filteredVendors.forEach((v) => {
      filteredSystems.forEach((s) => {
        const vendorWords = v.vendor_name.toLowerCase().split(' ');
        const isRelated = vendorWords.some(w => w.length > 2 && s.name.toLowerCase().includes(w)) || 
                          (v.vendor_type === 'INTEGRATION' && s.description.toLowerCase().includes(v.vendor_name.toLowerCase()));
        if (isRelated) {
          newEdges.push({
            id: `edge-ven-${v.id}-sys-${s.id}`,
            source: `vendor-${v.id}`,
            target: `system-${s.id}`,
            style: { stroke: '#d97706', strokeWidth: 1.5, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }
          });
        }
      });
    });

    // Connect Policies -> Risks (Heuristic match by severity or keywords)
    filteredPolicies.forEach((p) => {
      filteredRisks.forEach((r) => {
        // High severity policies link to critical/high risks, others link broadly
        const isMatch = (p.severity === 'CRITICAL' && r.risk_level === 'CRITICAL') ||
                        (p.severity === 'HIGH' && r.risk_level === 'HIGH') ||
                        (p.name.toLowerCase().includes('data') && r.risk_level === 'MEDIUM');
        if (isMatch) {
          newEdges.push({
            id: `edge-risk-${r.id}-pol-${p.id}`,
            source: `risk-${r.id}`,
            target: `policy-${p.id}`,
            style: { stroke: '#059669', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' }
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);

  }, [loading, searchTerm, filterType, systems, datasets, risks, policies, vendors, setNodes, setEdges]);

  const onNodeClick = (_event: any, node: Node) => {
    setSelectedNodeData(node.data);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'SYSTEM':
        return <Layers className="h-5 w-5 text-indigo-400" />;
      case 'DATASET':
        return <Box className="h-5 w-5 text-sky-400" />;
      case 'RISK':
        return <ShieldAlert className="h-5 w-5 text-red-400" />;
      case 'POLICY':
        return <FileText className="h-5 w-5 text-emerald-400" />;
      case 'VENDOR':
        return <Building2 className="h-5 w-5 text-amber-400" />;
      default:
        return <Network className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#080810] text-slate-100 font-sans">
      {/* Top Panel Controls */}
      <div className="p-4 bg-zinc-950/40 border-b border-zinc-900 flex flex-wrap gap-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--mid-indigo)]/20 border border-[var(--royal-indigo)]/30 rounded-lg">
            <Network className="h-5 w-5 text-[var(--royal-indigo)]" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Entity Relationship Graph</h1>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Lineage, dependencies & posture mappings</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-8 py-2 text-[11px] font-bold text-white focus:outline-none focus:border-[var(--royal-indigo)] w-48 font-mono placeholder-zinc-600"
            />
          </div>

          {/* Filter standard */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-[var(--royal-indigo)]"
            >
              <option value="ALL">All Nodes</option>
              <option value="SYSTEM">AI Systems</option>
              <option value="DATASET">Datasets</option>
              <option value="RISK">Risks</option>
              <option value="POLICY">Policies</option>
              <option value="VENDOR">Vendors</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-all active:scale-95 text-zinc-400 hover:text-white"
            title="Refresh graph data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 h-full">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-zinc-950/10">
              <RefreshCw className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mapping Entity Space...</span>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#1f1f2e" gap={16} size={1} />
              <Controls className="bg-zinc-900 border-zinc-800 text-white rounded overflow-hidden" />
              <MiniMap 
                nodeStrokeColor={(n) => {
                  if (n.data?.type === 'SYSTEM') return '#4f46e5';
                  if (n.data?.type === 'DATASET') return '#0284c7';
                  if (n.data?.type === 'RISK') return '#dc2626';
                  if (n.data?.type === 'POLICY') return '#059669';
                  if (n.data?.type === 'VENDOR') return '#d97706';
                  return '#27272a';
                }}
                nodeColor={(n) => {
                  if (n.data?.type === 'SYSTEM') return '#1e1b4b';
                  if (n.data?.type === 'DATASET') return '#0d1b2a';
                  if (n.data?.type === 'RISK') return '#450a0a';
                  if (n.data?.type === 'POLICY') return '#064e3b';
                  if (n.data?.type === 'VENDOR') return '#1c1917';
                  return '#09090b';
                }}
                className="bg-zinc-950/80 border border-zinc-900 rounded"
              />
            </ReactFlow>
          )}
        </div>

        {/* Right Side Detail panel */}
        {selectedNodeData && (
          <div className="w-80 bg-zinc-950/80 backdrop-blur-md border-l border-zinc-900 h-full flex flex-col z-10 absolute right-0 top-0 shadow-2xl transition-all">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-[#09090e]/60">
              <div className="flex items-center gap-2">
                {getEntityIcon(selectedNodeData.type)}
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  {selectedNodeData.type} Details
                </span>
              </div>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-zinc-500 hover:text-white text-xs font-bold font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800/80"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h3 className="text-sm font-black text-white">{selectedNodeData.label}</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase">ID: {selectedNodeData.details.id.slice(0, 8)}...</p>
              </div>

              {/* Description */}
              {selectedNodeData.details.description && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Description</span>
                  <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/30 p-2.5 rounded border border-zinc-900/50">
                    {selectedNodeData.details.description}
                  </p>
                </div>
              )}

              {/* System details metadata */}
              {selectedNodeData.type === 'SYSTEM' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Risk Tier</span>
                      <p className="text-xs font-bold text-indigo-400 mt-1 uppercase">{selectedNodeData.tier || 'UNKNOWN'}</p>
                    </div>
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Status</span>
                      <p className="text-xs font-bold text-emerald-400 mt-1 uppercase">{selectedNodeData.details.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dataset details metadata */}
              {selectedNodeData.type === 'DATASET' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Classification</span>
                      <p className="text-xs font-bold text-sky-400 mt-1 uppercase">{selectedNodeData.classification || 'INTERNAL'}</p>
                    </div>
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Type</span>
                      <p className="text-xs font-bold text-indigo-400 mt-1 uppercase">{selectedNodeData.details.dataset_type}</p>
                    </div>
                  </div>
                  {selectedNodeData.details.record_count && (
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Record Count</span>
                      <span className="text-xs font-bold font-mono text-white">{selectedNodeData.details.record_count.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Risk details metadata */}
              {selectedNodeData.type === 'RISK' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Score</span>
                      <p className="text-xs font-bold text-red-400 mt-1 font-mono">{selectedNodeData.details.score}</p>
                    </div>
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Risk Level</span>
                      <p className="text-xs font-bold text-red-500 mt-1 uppercase">{selectedNodeData.level}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase">Status</span>
                    <span className="text-xs font-bold text-amber-500 uppercase">{selectedNodeData.details.status}</span>
                  </div>
                </div>
              )}

              {/* Policy details metadata */}
              {selectedNodeData.type === 'POLICY' && (
                <div className="space-y-3">
                  <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase">Status</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">{selectedNodeData.details.status}</span>
                  </div>
                  {selectedNodeData.details.priority && (
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Priority</span>
                      <span className="text-xs font-bold text-indigo-400">{selectedNodeData.details.priority}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor details metadata */}
              {selectedNodeData.type === 'VENDOR' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Risk Level</span>
                      <p className="text-xs font-bold text-amber-500 mt-1 uppercase">{selectedNodeData.risk}</p>
                    </div>
                    <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900">
                      <span className="text-[8px] font-black text-zinc-500 uppercase">Risk Score</span>
                      <p className="text-xs font-bold text-amber-500 mt-1 font-mono">{selectedNodeData.details.risk_score}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase">Type</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{selectedNodeData.details.vendor_type}</span>
                  </div>
                  <div className="bg-zinc-900/40 p-3 rounded border border-zinc-900 flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase">Assess Status</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">{selectedNodeData.details.status}</span>
                  </div>
                </div>
              )}
            </div>

            {/* View Standard Link */}
            <div className="p-4 bg-zinc-950/60 border-t border-zinc-900 flex justify-center">
              <a
                href={
                  selectedNodeData.type === 'SYSTEM' ? '/app/ai-registry' :
                  selectedNodeData.type === 'DATASET' ? '/app/datasets' :
                  selectedNodeData.type === 'RISK' ? '/app/risk' :
                  selectedNodeData.type === 'POLICY' ? '/app/policies' :
                  selectedNodeData.type === 'VENDOR' ? '/app/vendor-risk' : '#'
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[10px] font-black uppercase tracking-widest border border-zinc-800 transition-all active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                Inspect Entity
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
