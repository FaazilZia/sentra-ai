import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Plus, ShieldAlert, Zap, Copy } from 'lucide-react';
import { fetchPolicies, patchPolicy, createPolicy, fetchPolicyTemplates, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { SimplePolicyEditor } from '../components/dashboard/SimplePolicyEditor';

export default function GovernancePage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [policiesData, templatesData] = await Promise.all([
        fetchPolicies(),
        fetchPolicyTemplates()
      ]);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (err) {
      console.error('Failed to load governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const togglePolicy = async (policy: PolicyResponse) => {
    try {
      const updated = await patchPolicy(policy.id, { enabled: !policy.enabled });
      setPolicies(prev => prev.map(p => p.id === policy.id ? updated : p));
    } catch (err) {
      console.error('Failed to toggle policy:', err);
    }
  };

  const handleSavePolicy = async (newPolicy: any) => {
    try {
      const created = await createPolicy(newPolicy);
      setPolicies(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create policy:', err);
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      // In a real flow with backend persistence for templates, we'd pass an ID.
      // Since our MVP templates are returned without IDs (just JSON objects),
      // we'll just create a new policy based on the template structure directly.
      const created = await createPolicy({
        name: template.name,
        description: template.description,
        effect: template.effect,
        enabled: false,
        priority: 1,
        conditions: template.conditions || {},
        scope: { agent: 'global' },
      });
      setPolicies(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
  };

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [policies, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 pb-12 px-6 lg:px-8 pt-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            Policy Management
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl text-sm">
            Control AI behavior by deploying and managing active guardrail policies.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Custom Policy
        </button>
      </div>

      <SimplePolicyEditor 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePolicy}
      />

      {/* Templates Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Recommended Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-blue-500/30 transition-colors flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tpl.category}</span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{tpl.name}</h3>
              <p className="text-sm text-slate-400 mb-6 flex-1">{tpl.description}</p>
              
              <button 
                onClick={() => handleDuplicateTemplate(tpl)}
                className="w-full mt-auto flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Deploy Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Policies Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Active Policies</h2>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search policies..." 
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading policies...</div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
               <p className="text-sm font-medium text-slate-500">
                 {searchTerm ? 'No policies match your search' : 'No active policies yet.'}
               </p>
            </div>
          ) : (
            filteredPolicies.map(policy => (
              <div key={policy.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className={cn(
                     "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                     policy.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-800 text-slate-500"
                  )}>
                     {policy.effect === 'BLOCK' ? <ShieldAlert className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{policy.name}</h3>
                      <span className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        policy.effect === 'BLOCK' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      )}>
                        {policy.effect}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{policy.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t border-slate-800 pt-4 md:border-0 md:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">Status</span>
                    <button 
                      onClick={() => togglePolicy(policy)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        policy.enabled ? "bg-emerald-500" : "bg-slate-700"
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform",
                        policy.enabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
