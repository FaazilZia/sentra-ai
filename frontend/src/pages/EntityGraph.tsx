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

      const loadedSystems = Array.isArray(sysRes?.items) ? sysRes.items : (Array.isArray(sysRes) ? sysRes : []);
      const loadedDatasets = Array.isArray(dsRes?.data) ? dsRes.data : (Array.isArray(dsRes) ? dsRes : []);
      const loadedRisks = Array.isArray(riskRes?.data) ? riskRes.data : (Array.isArray(riskRes) ? riskRes : []);
      const loadedPolicies = Array.isArray(polRes?.data) ? polRes.data : (Array.isArray(polRes) ? polRes : []);
      const loadedVendors = Array.isArray(venRes?.data) ? venRes.data : (Array.isArray(venRes) ? venRes : []);

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
            label: (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[var(--text-secondary)]">
                {ds.name}
              </div>
            ), 
            type: 'DATASET',
            classification: ds.data_classification,
            details: ds 
          },
          style: {
            background: '#818CF8',
            border: 'none',
            borderRadius: '50%',
            width: 14,
            height: 14,
            boxShadow: '0 0 6px rgba(129, 140, 248, 0.3)',
            overflow: 'visible'
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
            label: (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-[var(--text-muted)]">
                {v.vendor_name}
              </div>
            ), 
            type: 'VENDOR',
            risk: v.risk_level,
            details: v 
          },
          style: {
            background: '#C7D2FE',
            border: 'none',
            borderRadius: '50%',
            width: 8,
            height: 8,
            overflow: 'visible'
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
            label: (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-[var(--text-primary)]">
                {s.name}
              </div>
            ), 
            type: 'SYSTEM',
            tier: s.risk_tier,
            details: s 
          },
          style: {
            background: '#3730A3',
            border: 'none',
            borderRadius: '50%',
            width: 20,
            height: 20,
            boxShadow: '0 0 10px rgba(55, 48, 163, 0.4)',
            overflow: 'visible'
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
            label: (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-[var(--text-muted)]">
                {`Risk: ${r.risk_level} (${r.score})`}
              </div>
            ), 
            type: 'RISK',
            level: r.risk_level,
            details: r 
          },
          style: {
            background: '#C7D2FE',
            border: 'none',
            borderRadius: '50%',
            width: 8,
            height: 8,
            overflow: 'visible'
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
            label: (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[var(--text-secondary)]">
                {p.name}
              </div>
            ), 
            type: 'POLICY',
            status: p.status,
            details: p 
          },
          style: {
            background: '#818CF8',
            border: 'none',
            borderRadius: '50%',
            width: 14,
            height: 14,
            boxShadow: '0 0 6px rgba(129, 140, 248, 0.3)',
            overflow: 'visible'
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
          style: { stroke: 'rgba(79, 70, 229, 0.3)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(79, 70, 229, 0.3)' }
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
          style: { stroke: 'rgba(79, 70, 229, 0.3)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(79, 70, 229, 0.3)' }
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
            style: { stroke: 'rgba(79, 70, 229, 0.3)', strokeWidth: 1.5, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(79, 70, 229, 0.3)' }
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
            style: { stroke: 'rgba(79, 70, 229, 0.3)', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(79, 70, 229, 0.3)' }
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
        return <Layers className="h-5 w-5 text-[var(--royal-indigo)]" />;
      case 'DATASET':
        return <Box className="h-5 w-5 text-[var(--violet-blue)]" />;
      case 'RISK':
        return <ShieldAlert className="h-5 w-5 text-[var(--sentraa-danger, #DC2626)]" />;
      case 'POLICY':
        return <FileText className="h-5 w-5 text-[var(--sentraa-success, #059669)]" />;
      case 'VENDOR':
        return <Building2 className="h-5 w-5 text-amber-400" />;
      default:
        return <Network className="h-5 w-5 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#080810] text-slate-100 font-sans">
      {/* Top Panel Controls */}
      <div className="p-4 bg-white border-b border-[var(--border-default)] shadow-sm flex flex-wrap gap-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--mid-indigo)]/20 border border-[var(--royal-indigo)]/30 rounded-lg">
            <Network className="h-5 w-5 text-[var(--royal-indigo)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Entity Relationship Graph</h1>
            <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Lineage, dependencies & posture mappings</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-8 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] w-48 font-mono placeholder-zinc-600"
            />
          </div>

          {/* Filter standard */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[10px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
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
            className="p-2 bg-white hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded transition-all active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Mapping Entity Space...</span>
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
              <Background color="rgba(55, 48, 163, 0.08)" gap={16} size={1} />
              <Controls className="bg-white border-[var(--border-default)] text-[var(--text-primary)] rounded-xl overflow-hidden" />
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
                className="bg-white border border-[var(--border-default)] rounded-xl"
              />
            </ReactFlow>
          )}
        </div>

        {/* Right Side Detail panel */}
        {selectedNodeData && (
          <div className="w-80 bg-white border-l border-[var(--border-default)] h-full flex flex-col z-10 absolute right-0 top-0 shadow-2xl transition-all">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                {getEntityIcon(selectedNodeData.type)}
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--royal-indigo)]">
                  {selectedNodeData.type} Details
                </span>
              </div>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold px-2 py-1 rounded bg-white border border-[var(--border-default)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selectedNodeData.label}</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1 uppercase">ID: {selectedNodeData.details.id.slice(0, 8)}...</p>
              </div>

              {/* Description */}
              {selectedNodeData.details.description && (
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Description</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-page)] p-2.5 rounded border border-[var(--border-default)]">
                    {selectedNodeData.details.description}
                  </p>
                </div>
              )}

              {/* System details metadata */}
              {selectedNodeData.type === 'SYSTEM' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Risk Tier</span>
                      <p className="text-xs font-bold text-[var(--royal-indigo)] mt-1 uppercase">{selectedNodeData.tier || 'UNKNOWN'}</p>
                    </div>
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Status</span>
                      <p className="text-xs font-bold text-[var(--sentraa-success, #059669)] mt-1 uppercase">{selectedNodeData.details.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dataset details metadata */}
              {selectedNodeData.type === 'DATASET' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Classification</span>
                      <p className="text-xs font-bold text-[var(--violet-blue)] mt-1 uppercase">{selectedNodeData.classification || 'INTERNAL'}</p>
                    </div>
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Type</span>
                      <p className="text-xs font-bold text-[var(--royal-indigo)] mt-1 uppercase">{selectedNodeData.details.dataset_type}</p>
                    </div>
                  </div>
                  {selectedNodeData.details.record_count && (
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Record Count</span>
                      <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{selectedNodeData.details.record_count.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Risk details metadata */}
              {selectedNodeData.type === 'RISK' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Score</span>
                      <p className="text-xs font-bold text-[var(--sentraa-danger, #DC2626)] mt-1 font-mono">{selectedNodeData.details.score}</p>
                    </div>
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Risk Level</span>
                      <p className="text-xs font-bold text-[var(--sentraa-danger, #DC2626)] mt-1 uppercase">{selectedNodeData.level}</p>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Status</span>
                    <span className="text-xs font-bold text-[var(--sentraa-warning, #D97706)] uppercase">{selectedNodeData.details.status}</span>
                  </div>
                </div>
              )}

              {/* Policy details metadata */}
              {selectedNodeData.type === 'POLICY' && (
                <div className="space-y-3">
                  <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Status</span>
                    <span className="text-xs font-bold text-[var(--sentraa-success, #059669)] uppercase">{selectedNodeData.details.status}</span>
                  </div>
                  {selectedNodeData.details.priority && (
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Priority</span>
                      <span className="text-xs font-bold text-[var(--royal-indigo)]">{selectedNodeData.details.priority}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor details metadata */}
              {selectedNodeData.type === 'VENDOR' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Risk Level</span>
                      <p className="text-xs font-bold text-[var(--sentraa-warning, #D97706)] mt-1 uppercase">{selectedNodeData.risk}</p>
                    </div>
                    <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Risk Score</span>
                      <p className="text-xs font-bold text-[var(--sentraa-warning, #D97706)] mt-1 font-mono">{selectedNodeData.details.risk_score}</p>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Type</span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{selectedNodeData.details.vendor_type}</span>
                  </div>
                  <div className="bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)] flex justify-between items-center">
                    <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase">Assess Status</span>
                    <span className="text-xs font-bold text-[var(--sentraa-success, #059669)] uppercase">{selectedNodeData.details.status}</span>
                  </div>
                </div>
              )}
            </div>

            {/* View Standard Link */}
            <div className="p-4 bg-zinc-950/60 border-t border-[var(--border-default)] flex justify-center">
              <a
                href={
                  selectedNodeData.type === 'SYSTEM' ? '/app/ai-registry' :
                  selectedNodeData.type === 'DATASET' ? '/app/datasets' :
                  selectedNodeData.type === 'RISK' ? '/app/risk' :
                  selectedNodeData.type === 'POLICY' ? '/app/policies' :
                  selectedNodeData.type === 'VENDOR' ? '/app/vendor-risk' : '#'
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-[var(--text-primary)] rounded text-[10px] font-semibold uppercase tracking-widest border border-zinc-800 transition-all active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[var(--royal-indigo)]" />
                Inspect Entity
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
