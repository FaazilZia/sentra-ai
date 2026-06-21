import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Lock, 
  Settings2,
  Trash2,
  X,
  FileCheck,
  Activity,
  LoaderCircle
} from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { apiRequest } from '@/lib/api';

interface Policy {
  id: string;
  name: string;
  description: string;
  effect: 'BLOCK' | 'MODIFY' | 'ALLOW' | 'allow' | 'deny';
  enabled: boolean;
  priority: number;
  scope: any;
  created_at: string;
}

export default function Guardrails() {
  const addToast = useStore((state) => state.addToast);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effect, setEffect] = useState<'BLOCK' | 'MODIFY' | 'ALLOW'>('BLOCK');
  const [priority, setPriority] = useState(1);
  const [scopeInputs, setScopeInputs] = useState({
    input: true,
    output: false
  });
  const [enabled, setEnabled] = useState(true);

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pols = await apiRequest<any>('/policies');
      // Node backend wraps response, let's look at list structure
      const list = pols?.data || pols || [];
      setPolicies(list);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to fetch guardrails', type: 'error' });
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setEffect('BLOCK');
    setPriority(1);
    setScopeInputs({ input: true, output: false });
    setEnabled(true);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p: Policy) => {
    setEditingPolicy(p);
    setName(p.name);
    setDescription(p.description);
    
    // Normalize effect
    let normalizedEffect: 'BLOCK' | 'MODIFY' | 'ALLOW' = 'BLOCK';
    if (p.effect.toUpperCase() === 'ALLOW') normalizedEffect = 'ALLOW';
    else if (p.effect.toUpperCase() === 'MODIFY') normalizedEffect = 'MODIFY';
    else normalizedEffect = 'BLOCK';
    
    setEffect(normalizedEffect);
    setPriority(p.priority);
    
    const scopeDir = p.scope?.direction || [];
    setScopeInputs({
      input: scopeDir.includes('input') || !scopeDir.length,
      output: scopeDir.includes('output')
    });
    setEnabled(p.enabled);
    setIsEditOpen(true);
  };

  const handleOpenTemplates = async () => {
    try {
      const temps = await apiRequest<any[]>('/policies/templates');
      setTemplates(temps);
      setIsTemplatesOpen(true);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load templates', type: 'error' });
    }
  };

  const handleImportTemplate = async (temp: any) => {
    try {
      await apiRequest('/policies', {
        method: 'POST',
        body: JSON.stringify({
          name: temp.name,
          description: temp.description,
          effect: temp.effect,
          enabled: true,
          priority: 10,
          scope: { direction: ['input'] },
          conditions: temp.conditions || {},
          obligations: {}
        })
      });
      addToast({ message: `Imported template "${temp.name}"`, type: 'success' });
      setIsTemplatesOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to import template', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 3) {
      addToast({ message: 'Rule name must be at least 3 characters', type: 'warning' });
      return;
    }
    
    const directions: string[] = [];
    if (scopeInputs.input) directions.push('input');
    if (scopeInputs.output) directions.push('output');

    try {
      await apiRequest('/policies', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          effect,
          enabled,
          priority: Number(priority),
          scope: { direction: directions },
          conditions: {},
          obligations: {}
        })
      });
      addToast({ message: 'Guardrail policy deployed successfully!', type: 'success' });
      setIsAddOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to create guardrail', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    
    const directions: string[] = [];
    if (scopeInputs.input) directions.push('input');
    if (scopeInputs.output) directions.push('output');

    try {
      await apiRequest(`/policies/${editingPolicy.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description,
          effect,
          enabled,
          priority: Number(priority),
          scope: { direction: directions }
        })
      });
      addToast({ message: 'Guardrail policy updated successfully!', type: 'success' });
      setIsEditOpen(false);
      setEditingPolicy(null);
      loadData();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update guardrail', type: 'error' });
    }
  };

  const handleToggleActive = async (p: Policy) => {
    try {
      await apiRequest(`/policies/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          enabled: !p.enabled
        })
      });
      addToast({ message: `Guardrail "${p.name}" ${!p.enabled ? 'enabled' : 'disabled'}`, type: 'info' });
      // Update in-place to avoid full list load flash
      setPolicies(prev => prev.map(item => item.id === p.id ? { ...item, enabled: !item.enabled } : item));
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to toggle status', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this guardrail? This action cannot be undone.')) {
      return;
    }
    try {
      await apiRequest(`/policies/${id}`, {
        method: 'DELETE'
      });
      addToast({ message: 'Guardrail deleted successfully', type: 'success' });
      loadData();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete guardrail', type: 'error' });
    }
  };

  const activeRulesCount = policies.filter(p => p.enabled).length;

  // Stats
  const totalCount = policies.length;
  const activeCount = policies.filter(p => p.enabled).length;
  const inactiveCount = policies.filter(p => !p.enabled).length;
  const blockingCount = policies.filter(p => {
    const eff = p.effect.toUpperCase();
    return eff === 'BLOCK' || eff === 'DENY';
  }).length;

  if (loading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-[var(--text-muted)]">
          <LoaderCircle className="h-8 w-8 mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold uppercase tracking-widest">Loading Protection Policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6  ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">AI Guardrails</h1>
            
            {/* Health Badge / Active Rules Pill */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-semibold uppercase tracking-widest",
              activeRulesCount > 0 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-gray-800 border-[var(--border-default)] text-[var(--text-secondary)]"
            )}>
              <Activity className="h-3 w-3" />
              {activeRulesCount} Active Rules
            </div>
          </div>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Active Protection Layers & Interception Rules
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenTemplates}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border-default)] hover:border-[var(--border-default)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] uppercase tracking-widest transition-all active:scale-95"
          >
            <FileCheck className="h-4 w-4 text-indigo-400" />
            Load Templates
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Guardrail
          </button>
        </div>
      </div>

      {/* Stats row — 4 KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Total Rules" 
          value={totalCount.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Active" 
          value={activeCount.toString()} 
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Inactive" 
          value={inactiveCount.toString()} 
          icon="shadow" 
          status="primary" 
        />
        <KPICard 
          label="Blocking" 
          value={blockingCount.toString()} 
          icon="risks" 
          status="danger" 
        />
      </div>

      {/* Main Table */}
      <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        {policies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)]/60 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-page)]">
                  <th className="p-4 w-24">Priority</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Effect</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-xs">
                {policies.map(p => {
                  const scopeDir = p.scope?.direction || [];
                  const scopeLabel = scopeDir.length === 2 ? 'Both' : (scopeDir[0] || 'input');
                  const isBlocked = p.effect.toUpperCase() === 'BLOCK' || p.effect.toUpperCase() === 'DENY';
                  const isModify = p.effect.toUpperCase() === 'MODIFY';

                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-page)] transition-colors">
                      <td className="p-4">
                        <span className="h-6 w-9 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-400">
                          {p.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)] uppercase tracking-tight">{p.name}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{p.description || 'No description provided.'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider border",
                          isBlocked && "bg-rose-500/10 border-rose-500/25 text-rose-400",
                          isModify && "bg-amber-500/10 border-amber-500/25 text-amber-400",
                          (!isBlocked && !isModify) && "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        )}>
                          {isBlocked ? 'BLOCK' : isModify ? 'MODIFY' : 'ALLOW'}
                        </span>
                      </td>
                      <td className="p-4">
                        {/* Active Toggle Switch */}
                        <button 
                          onClick={() => handleToggleActive(p)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                            p.enabled ? "bg-emerald-500" : "bg-slate-700"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                            p.enabled ? "translate-x-5" : "translate-x-1"
                          )} />
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-page)] border border-[var(--border-default)] px-2 py-0.5 rounded">
                          {scopeLabel}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded border border-[var(--border-default)] hover:border-indigo-500/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
                            title="Edit rule"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded border border-[var(--border-default)] hover:bg-rose-950/25 text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-900/30 transition-all active:scale-95"
                            title="Delete guardrail"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto">
            <Lock className="h-12 w-12 text-[var(--text-muted)] mb-4 animate-pulse" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-widest">No guardrails configured</h3>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1.5 leading-relaxed">
              Add your first rule to start protecting your AI agents.
            </p>
            <button 
              onClick={handleOpenAdd}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold uppercase tracking-widest rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Guardrail
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); setEditingPolicy(null); }}
              className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-850 p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              {isAddOpen ? 'Add AI Guardrail' : 'Edit AI Guardrail'}
            </h3>

            <form onSubmit={isAddOpen ? handleCreate : handleUpdate} className="space-y-4 text-left">
              <div>
                <label htmlFor="guardrail-name-input" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Rule Name</label>
                <input 
                  id="guardrail-name-input"
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jailbreak Detection" 
                  className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="guardrail-desc-input" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  id="guardrail-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this rule protect against?" 
                  rows={3}
                  className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guardrail-effect-select" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Interception Effect</label>
                  <select 
                    id="guardrail-effect-select"
                    value={effect}
                    onChange={e => setEffect(e.target.value as any)}
                    className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BLOCK">BLOCK</option>
                    <option value="MODIFY">MODIFY</option>
                    <option value="ALLOW">ALLOW</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="guardrail-priority-input" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Priority (1-100)</label>
                  <input 
                    id="guardrail-priority-input"
                    type="number" 
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    min={1} 
                    max={100}
                    className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Rule Scope</span>
                <div className="flex gap-4 bg-white border border-[var(--border-default)] rounded-xl p-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={scopeInputs.input} 
                      onChange={e => setScopeInputs(prev => ({ ...prev, input: e.target.checked }))}
                      className="rounded border-[var(--border-default)] bg-gray-950 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Input Prompts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={scopeInputs.output} 
                      onChange={e => setScopeInputs(prev => ({ ...prev, output: e.target.checked }))}
                      className="rounded border-[var(--border-default)] bg-gray-950 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Output Responses</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white border border-[var(--border-default)] rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Enabled Status</span>
                <button 
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                    enabled ? "bg-emerald-500" : "bg-slate-700"
                  )}
                >
                  <span className={cn(
                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                    enabled ? "translate-x-5" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]/60">
                <button 
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); setEditingPolicy(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-white text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-semibold text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                >
                  {isAddOpen ? 'Deploy Guardrail' : 'Update Guardrail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
            <button 
              onClick={() => setIsTemplatesOpen(false)}
              className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-850 p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-400" />
                Import Guardrail Template
              </h3>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1">Pre-built protection rules ready for deployment</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {templates.map((temp, idx) => (
                <div key={idx} className="bg-gray-950/30 border border-[var(--border-default)] rounded-xl p-4 flex items-center justify-between gap-4 group">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">{temp.name}</h4>
                      <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white border border-[var(--border-default)] text-indigo-400 tracking-wider">
                        {temp.category || 'Security'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-secondary)] mt-1 max-w-md">{temp.description}</p>
                  </div>
                  
                  <button
                    onClick={() => handleImportTemplate(temp)}
                    className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all active:scale-95"
                  >
                    Import
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
