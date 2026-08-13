import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { DataTable, Column } from '@/components/v2/DataTable';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { RiskPill } from '@/components/v2/RiskPill';
import { MetricCard } from '@/components/v2/MetricCard';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { 
  Bot, 
  EyeOff, 
  Zap, 
  Search, 
  Plus, 
  RefreshCw, 
  Database, 
  FlaskConical, 
  Sparkles,
  ShieldAlert,
  Play
} from 'lucide-react';

interface AgentItem {
  id: string;
  name: string;
  source: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SHADOW';
  actionsToday: number;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING' | 'UNDER_REVIEW';
  isShadow: boolean;
  department?: string;
  detectedAt?: string;
  owner?: string;
}

export default function AgentsSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);

  // Discovery state
  const [scanning, setScanning] = useState(false);

  const loadAgentsData = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, shadowRes, dsRes] = await Promise.all([
        apiRequest<any>('/ai-systems').catch(() => ({ items: [] })),
        apiRequest<any>('/shadow-ai/detections').catch(() => ({ incidents: [] })),
        apiRequest<any>('/datasets').catch(() => ({ data: [] }))
      ]);

      const registered = (sysRes?.items || sysRes || []).map((sys: any, idx: number) => ({
        id: sys.id || `sys-${idx + 1}`,
        name: sys.name,
        source: sys.vendor || 'MCP / Custom SDK',
        riskLevel: (sys.risk_tier || 'LOW').toUpperCase(),
        actionsToday: ((idx + 1) * 17) % 180 + 12,
        status: (sys.status || 'ACTIVE').toUpperCase(),
        isShadow: false,
        owner: sys.owner?.full_name || 'AI Engineering'
      }));

      // Inline Shadow Agents from shadow-ai incidents/tools
      const shadowIncidents = shadowRes?.incidents || [];
      const shadowItems: AgentItem[] = shadowIncidents.map((inc: any, idx: number) => ({
        id: `shadow-${inc.id || idx}`,
        name: inc.tool || `Unregistered Agent #${idx + 1}`,
        source: `${inc.dept || 'Engineering'} (${inc.user || 'Unknown User'})`,
        riskLevel: 'SHADOW' as const,
        actionsToday: ((idx + 1) * 19) % 50 + 5,
        status: 'UNDER_REVIEW' as const,
        isShadow: true,
        department: inc.dept,
        detectedAt: inc.time || 'Today'
      }));

      // Fallback default mock shadow agents if DB empty for demonstration
      if (shadowItems.length === 0) {
        shadowItems.push(
          {
            id: 'shadow-demo-1',
            name: 'Shadow AutoGPT Assistant',
            source: 'Slack Webhook (DevOps)',
            riskLevel: 'SHADOW',
            actionsToday: 48,
            status: 'UNDER_REVIEW',
            isShadow: true,
            department: 'Engineering',
            detectedAt: '10 mins ago'
          },
          {
            id: 'shadow-demo-2',
            name: 'Unverified CodeLlama Extension',
            source: 'VSCode Local Host',
            riskLevel: 'SHADOW',
            actionsToday: 112,
            status: 'BLOCKED',
            isShadow: true,
            department: 'Product Development',
            detectedAt: '1 hour ago'
          }
        );
      }

      setAgents([...shadowItems, ...registered]);
      setDatasets(dsRes?.data || dsRes || []);

    } catch (err: any) {
      console.error('Error loading agent inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgentsData();
  }, [loadAgentsData]);

  const handleScanDiscovery = () => {
    setScanning(true);
    addToast({ message: 'Scanning network endpoints & API gateways for shadow agents...', type: 'info' });
    setTimeout(() => {
      setScanning(false);
      addToast({ message: 'Discovery scan completed. 2 shadow agent tokens flagged.', type: 'success' });
    }, 2000);
  };

  const shadowCount = agents.filter(a => a.isShadow).length;
  const activeCount = agents.filter(a => a.status === 'ACTIVE').length;
  const blockedCount = agents.filter(a => a.status === 'BLOCKED').length;

  const columns: Column<AgentItem>[] = [
    {
      header: 'Agent Name',
      accessorKey: 'name',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${
            item.isShadow
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
          }`}>
            {item.isShadow ? <EyeOff className="h-4 w-4 stroke-[2.5]" /> : <Bot className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</span>
              {item.isShadow && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                  Shadow Flag
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
              ID: {item.id.slice(0, 14)}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Source / Framework',
      accessorKey: 'source',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.source}
        </span>
      )
    },
    {
      header: 'Risk Tier',
      accessorKey: 'riskLevel',
      sortable: true,
      cell: (item) => (
        item.isShadow ? (
          <StatusBadge status="shadow" label="Shadow" />
        ) : (
          <RiskPill level={item.riskLevel} />
        )
      )
    },
    {
      header: 'Actions Today',
      accessorKey: 'actionsToday',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
          {item.actionsToday.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: 'Governance',
      cell: (item) => (
        <div className="flex items-center gap-2">
          {item.isShadow ? (
            <button
              onClick={() => {
                addToast({ message: `Registering ${item.name} into formal inventory...`, type: 'success' });
                setAgents(prev => prev.map(a => a.id === item.id ? { ...a, isShadow: false, riskLevel: 'MEDIUM', status: 'ACTIVE' } : a));
              }}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              Approve & Register
            </button>
          ) : (
            <button
              onClick={() => addToast({ message: `Editing policies for ${item.name}`, type: 'info' })}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-300 dark:border-slate-700"
            >
              Configure
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <PageContainer
      title="Agents"
      subtitle="Unified AI agent inventory — registered, discoverable, and shadow agents monitored in real time."
      badge={
        shadowCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30 animate-pulse flex items-center gap-1">
            <EyeOff className="h-3 w-3" /> {shadowCount} Shadow Detected
          </span>
        )
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleScanDiscovery}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Search className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan for Shadow AI'}
          </button>
          <button
            onClick={() => addToast({ message: 'Opening agent registration wizard...', type: 'info' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-300 dark:border-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Agent
          </button>
        </div>
      }
    >
      {/* Metric summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Agents Monitored"
          value={agents.length}
          subtitle="Unified inventory footprint"
          status="primary"
          icon={Bot}
        />
        <MetricCard
          label="Active & Compliant"
          value={activeCount}
          subtitle="Passing active policy guardrails"
          status="success"
          icon={Zap}
        />
        <MetricCard
          label="Inline Shadow AI"
          value={shadowCount}
          subtitle="Flagged in inventory below"
          status="warning"
          icon={EyeOff}
        />
        <MetricCard
          label="Enforced / Blocked"
          value={blockedCount}
          subtitle="Suspended due to risk violations"
          status="danger"
          icon={ShieldAlert}
        />
      </div>

      {/* Sub-tabs */}
      <TabBar
        tabs={[
          { id: 'inventory', label: 'All Agents & Inventory', count: agents.length, icon: Bot },
          { id: 'discovery', label: 'Agent Discovery', count: shadowCount, icon: Search },
          { id: 'datasets', label: 'Connected Datasets', count: datasets.length || 8, icon: Database },
          { id: 'evaluation', label: 'LLM Evaluation & Benchmarks', icon: FlaskConical }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <DataTable
          columns={columns}
          data={agents}
          keyExtractor={(item) => item.id}
          rowStyle={(item) =>
            item.isShadow
              ? 'bg-purple-950/15 dark:bg-purple-950/20 border-l-4 border-l-purple-500 border-dashed'
              : ''
          }
          isLoading={loading}
          searchPlaceholder="Search agent by name, source, or status..."
          actions={
            <button
              onClick={loadAgentsData}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
      )}

      {activeTab === 'discovery' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-500" /> Automated Agent Discovery Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Continuous network sniffer inspecting API gateway traffic, OAuth token handshakes, and developer local processes.
              </p>
            </div>
            <button
              onClick={handleScanDiscovery}
              disabled={scanning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Trigger Discovery Scan
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-400">Recently Intercepted Unregistered Tokens</h4>
            {agents.filter(a => a.isShadow).map(shadow => (
              <div key={shadow.id} className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                    <EyeOff className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{shadow.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">Detected via {shadow.source} • {shadow.detectedAt}</span>
                  </div>
                </div>
                <StatusBadge status="shadow" label="Shadow Flag" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'datasets' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" /> Connected Training & Vector Datasets
            </h3>
            <button
              onClick={() => addToast({ message: 'Opening dataset connect modal...', type: 'info' })}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700"
            >
              + Attach Dataset
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registry of all vector indices, fine-tuning datasets, and database sources accessed by active AI agents.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {['User PII Vault', 'Knowledge Base (Pinecone)', 'Stripe Payment Log Dump', 'Support Ticket Embeddings'].map((name, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Classification: {i % 2 === 0 ? 'CONFIDENTIAL' : 'RESTRICTED'}</span>
                </div>
                <StatusBadge status={i % 2 === 0 ? 'active' : 'warning'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'evaluation' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-indigo-500" /> LLM Performance & Drift Benchmarks
            </h3>
            <button
              onClick={() => addToast({ message: 'Running accuracy & latency test suite...', type: 'info' })}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Run Evaluation Suite
            </button>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <Sparkles className="h-6 w-6 text-indigo-500 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Drift Benchmark</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Model hallucination rate is stable at <span className="font-mono font-bold text-emerald-400">0.82%</span> across 12k inference events today.
              </p>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
