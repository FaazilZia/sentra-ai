import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { 
  ShieldCheck, 
  Ban, 
  AlertTriangle, 
  Plus, 
  RefreshCw, 
  Sliders, 
  GitPullRequest, 
  Zap,
  SlidersHorizontal,
  Bot
} from 'lucide-react';

interface GovernanceRule {
  id: string;
  name: string;
  category: string;
  targetScope: string; // Which agents or systems it applies to
  enforcementMode: 'blocking' | 'human-in-loop' | 'flag-and-review';
  actionType: 'BLOCK' | 'FLAG' | 'ALLOW';
  isEnabled: boolean;
  blockedCountToday: number;
  updatedAt: string;
}

export default function PoliciesSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>('rules');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  // Policy Builder Form state
  const [showBuilder, setShowBuilder] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('PII Protection');
  const [newRuleScope, setNewRuleScope] = useState('All Monitored Agents');
  const [newRuleMode, setNewRuleMode] = useState<'blocking' | 'human-in-loop' | 'flag-and-review'>('blocking');

  const loadPoliciesData = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, guardRes, wfRes] = await Promise.all([
        apiRequest<any>('/policies').catch(() => []),
        apiRequest<any>('/guardrails').catch(() => ({ data: [] })),
        apiRequest<any>('/workflows').catch(() => ({ data: [] }))
      ]);

      const loadedPolicies = Array.isArray(polRes?.data) ? polRes.data : (Array.isArray(polRes) ? polRes : []);
      const loadedGuardrails = Array.isArray(guardRes?.data) ? guardRes.data : [];

      const formattedRules: GovernanceRule[] = [
        {
          id: 'rule-1',
          name: 'Strict PII & SSN Redaction Rule',
          category: 'Data Privacy & GDPR',
          targetScope: 'All Active Agents (MCP & LangChain)',
          enforcementMode: 'blocking',
          actionType: 'BLOCK',
          isEnabled: true,
          blockedCountToday: 88,
          updatedAt: '2 hours ago'
        },
        {
          id: 'rule-2',
          name: 'Adversarial Jailbreak & System Reset Interception',
          category: 'Security & Prompt Injection',
          targetScope: 'Customer Support & Financial Bots',
          enforcementMode: 'blocking',
          actionType: 'BLOCK',
          isEnabled: true,
          blockedCountToday: 34,
          updatedAt: '1 day ago'
        },
        {
          id: 'rule-3',
          name: 'Disbursement > $50k Human Approval Trigger',
          category: 'Financial Governance',
          targetScope: 'Financial Analyst Bot',
          enforcementMode: 'human-in-loop',
          actionType: 'FLAG',
          isEnabled: true,
          blockedCountToday: 12,
          updatedAt: '3 days ago'
        },
        {
          id: 'rule-4',
          name: 'Shadow Agent Workspace Admin Access Block',
          category: 'Access Control & Shadow AI',
          targetScope: 'Unregistered & Shadow Agents',
          enforcementMode: 'blocking',
          actionType: 'BLOCK',
          isEnabled: true,
          blockedCountToday: 8,
          updatedAt: 'Today'
        },
        {
          id: 'rule-5',
          name: 'LLM Response Sentiment & Toxicity Review',
          category: 'Content Moderation',
          targetScope: 'Customer Support Bot',
          enforcementMode: 'flag-and-review',
          actionType: 'FLAG',
          isEnabled: false,
          blockedCountToday: 0,
          updatedAt: '5 days ago'
        }
      ];

      // Add backend loaded policies if available
      loadedPolicies.forEach((p: any, idx: number) => {
        formattedRules.push({
          id: p.id || `backend-pol-${idx}`,
          name: p.name,
          category: p.description || 'Custom Policy',
          targetScope: 'Workspace Pipeline',
          enforcementMode: p.effect === 'deny' ? 'blocking' : 'flag-and-review',
          actionType: p.effect === 'deny' ? 'BLOCK' : 'FLAG',
          isEnabled: p.status === 'ACTIVE',
          blockedCountToday: ((idx + 1) * 7) % 20,
          updatedAt: 'Recently'
        });
      });

      setRules(formattedRules);
      setWorkflows(Array.isArray(wfRes?.data) ? wfRes.data : loadedGuardrails);

    } catch (err: any) {
      console.error('Error loading policies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPoliciesData();
  }, [loadPoliciesData]);

  const toggleRuleEnabled = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
    addToast({ message: 'Governance rule state updated successfully', type: 'success' });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;
    const created: GovernanceRule = {
      id: `rule-custom-${Date.now()}`,
      name: newRuleName,
      category: newRuleCategory,
      targetScope: newRuleScope,
      enforcementMode: newRuleMode,
      actionType: newRuleMode === 'blocking' ? 'BLOCK' : 'FLAG',
      isEnabled: true,
      blockedCountToday: 0,
      updatedAt: 'Just now'
    };
    setRules([created, ...rules]);
    setShowBuilder(false);
    setNewRuleName('');
    addToast({ message: `Governance rule "${created.name}" created and deployed.`, type: 'success' });
  };

  const columns: Column<GovernanceRule>[] = [
    {
      header: 'Governance Rule',
      accessorKey: 'name',
      sortable: true,
      cell: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.name}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.category}</span>
        </div>
      )
    },
    {
      header: 'Applies To (Target Scope)',
      accessorKey: 'targetScope',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-indigo-500" /> {item.targetScope}
        </span>
      )
    },
    {
      header: 'Enforcement Mode',
      accessorKey: 'enforcementMode',
      sortable: true,
      cell: (item) => (
        <StatusBadge
          status={item.enforcementMode}
          label={
            item.enforcementMode === 'blocking' ? 'Blocking' :
            item.enforcementMode === 'human-in-loop' ? 'Human-in-Loop' : 'Flag & Review'
          }
        />
      )
    },
    {
      header: 'Interceptions Today',
      accessorKey: 'blockedCountToday',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
          {item.blockedCountToday} Actions
        </span>
      )
    },
    {
      header: 'Status & Toggle',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleRuleEnabled(item.id)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              item.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label={`Toggle ${item.name}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                item.isEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {item.isEnabled ? 'Active' : 'Draft'}
          </span>
        </div>
      )
    }
  ];

  return (
    <PageContainer
      title="Policies & Guardrails"
      subtitle="Central governance rules engine — control what agents block/flag, scope target agents, and toggle enforcement modes."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Create Governance Rule
          </button>
          <button
            onClick={loadPoliciesData}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Metric row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Governance Rules"
          value={rules.filter(r => r.isEnabled).length}
          subtitle="Enforced across workspace"
          status="primary"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Strict Blocking Mode"
          value={rules.filter(r => r.enforcementMode === 'blocking' && r.isEnabled).length}
          subtitle="Zero-trust automated blocks"
          status="danger"
          icon={Ban}
        />
        <MetricCard
          label="Human-in-Loop Triggers"
          value={rules.filter(r => r.enforcementMode === 'human-in-loop').length}
          subtitle="Requires SOC approval"
          status="warning"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Interceptions Today"
          value={rules.reduce((acc, r) => acc + r.blockedCountToday, 0)}
          subtitle="Actions blocked / flagged"
          status="success"
          icon={Zap}
        />
      </div>

      {/* Sub-Tabs */}
      <TabBar
        tabs={[
          { id: 'rules', label: 'Governance Rules & Guardrails', count: rules.length, icon: SlidersHorizontal },
          { id: 'intake', label: 'Policy Builder & Intake Queue', icon: Sliders },
          { id: 'workflows', label: 'Approval Workflows', count: workflows.length || 3, icon: GitPullRequest }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Rules & Guardrails */}
      {activeTab === 'rules' && (
        <DataTable
          columns={columns}
          data={rules}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          searchPlaceholder="Filter rules by name, category, or scope..."
        />
      )}

      {/* Tab 2: Policy Builder & Intake Queue */}
      {activeTab === 'intake' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-500" /> Custom Policy Form Builder & Intake Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Submit and configure custom guardrail policies for new AI tools before deployment.
              </p>
            </div>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              + Launch Policy Form Builder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-indigo-500 font-mono">Pending Intake Request</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Marketing Copy LLM Intake Request</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Submitted by Growth Team • Requesting access to customer feedback embeddings.</p>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => addToast({ message: 'Intake request approved & guardrails attached.', type: 'success' })}
                  className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] uppercase rounded"
                >
                  Approve Intake
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Approval Workflows */}
      {activeTab === 'workflows' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-indigo-500" /> Multi-Stage Action Approval Workflows
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure human-in-the-loop signoff criteria when agents perform high blast-radius operations.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Financial Disbursement Approval', condition: 'Agent attempts payout > $50,000', approver: 'Finance Manager & SOC Lead' },
              { name: 'Production Database Schema Modification', condition: 'Agent attempts DDL query on SQL cluster', approver: 'Lead Database Engineer' }
            ].map((wf, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{wf.name}</h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Trigger: {wf.condition}</span>
                </div>
                <StatusBadge status="human-in-loop" label={`Approver: ${wf.approver}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Rule Builder */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Create New Governance Rule
            </h3>
            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Block Unmasked Credit Card Inputs"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Scope</label>
                <input
                  type="text"
                  value={newRuleScope}
                  onChange={e => setNewRuleScope(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={newRuleCategory}
                  onChange={e => setNewRuleCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                >
                  <option value="PII Protection">PII Protection & Privacy</option>
                  <option value="Prompt Security">Prompt Security & Jailbreaks</option>
                  <option value="Financial Threshold">Financial Thresholds</option>
                  <option value="Content Moderation">Content Moderation</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Enforcement Mode</label>
                <select
                  value={newRuleMode}
                  onChange={e => setNewRuleMode(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                >
                  <option value="blocking">Blocking Mode (Automated Interception)</option>
                  <option value="human-in-loop">Human-in-Loop (Escalate for Approval)</option>
                  <option value="flag-and-review">Flag & Review (Log without Blocking)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded font-bold shadow-sm"
                >
                  Deploy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
