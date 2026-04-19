import { useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Share2, Bot, Database, Globe, Zap, Shield } from 'lucide-react';

const initialNodes = [
  {
    id: 'agent-1',
    type: 'custom',
    data: { label: 'Customer Support Bot', type: 'agent', model: 'GPT-4o', icon: Bot },
    position: { x: 250, y: 50 },
  },
  {
    id: 'api-1',
    type: 'custom',
    data: { label: 'Zendesk API', type: 'api', icon: Zap },
    position: { x: 100, y: 200 },
  },
  {
    id: 'api-2',
    type: 'custom',
    data: { label: 'Internal CRM API', type: 'api', icon: Zap },
    position: { x: 400, y: 200 },
  },
  {
    id: 'db-1',
    type: 'custom',
    data: { label: 'Customer Database', type: 'db', icon: Database },
    position: { x: 400, y: 350 },
  },
  {
    id: 'ext-1',
    type: 'custom',
    data: { label: 'Stripe Payments', type: 'ext', icon: Globe },
    position: { x: 100, y: 350 },
  },
];

const initialEdges = [
  { id: 'e1-1', source: 'agent-1', target: 'api-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'e1-2', source: 'agent-1', target: 'api-2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'e2-1', source: 'api-2', target: 'db-1', markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'e1-3', source: 'api-1', target: 'ext-1', markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
];

const CustomNode = ({ data }: any) => {
  const Icon = data.icon;
  return (
    <div className={`px-6 py-4 rounded-2xl border-2 backdrop-blur-xl flex flex-col items-center gap-2 min-w-[180px] shadow-2xl transition-all hover:scale-105 ${
      data.type === 'agent' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' :
      data.type === 'api' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' :
      data.type === 'db' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
      'bg-slate-800/50 border-white/10 text-slate-400'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700 !border-white/10" />
      <Icon className="h-6 w-6" />
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-widest">{data.label}</p>
        {data.model && <p className="text-[9px] font-bold opacity-70 mt-0.5">{data.model}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700 !border-white/10" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function RelationshipGraph() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="mx-auto max-w-[1440px] h-[calc(100vh-140px)] space-y-8 pb-12 px-6 pt-6 flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <span className="opacity-50">Control Layer</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-indigo-400">Dependency View</span>
          </nav>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Share2 className="h-9 w-9 text-indigo-500" />
            AI Relationship Graph
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Visualize how AI agents interact with your APIs, databases, and external services to identify hidden risks.
          </p>
        </div>

        <div className="flex gap-3">
           <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 border border-white/5">
             <div className="h-3 w-3 rounded-full bg-cyan-500" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agent</span>
           </div>
           <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 border border-white/5">
             <div className="h-3 w-3 rounded-full bg-indigo-500" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API</span>
           </div>
           <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 border border-white/5">
             <div className="h-3 w-3 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database</span>
           </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-grow glass-card rounded-[2rem] overflow-hidden relative">
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
           <div className="p-4 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 max-w-[240px]">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                 <Shield className="h-4 w-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Status: Secure</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                All visualized pathways are governed by active security policies. No unauthorized cross-service interactions detected.
              </p>
           </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950/20"
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="!bg-slate-900 !border-white/10 !fill-white" />
          <MiniMap 
            className="!bg-slate-900 !border-white/10 !rounded-2xl overflow-hidden" 
            nodeColor={(n: any) => {
              if (n.data.type === 'agent') return '#22d3ee';
              if (n.data.type === 'api') return '#6366f1';
              if (n.data.type === 'db') return '#10b981';
              return '#1e293b';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
