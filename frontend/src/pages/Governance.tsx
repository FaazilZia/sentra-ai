import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Plus, ShieldAlert, Zap } from 'lucide-react';
import { fetchPolicies, patchPolicy, createPolicy, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { PolicyBuilderModal } from '@/components/dashboard/PolicyBuilderModal';

export default function GovernancePage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPolicies = async () => {
    try {
      const data = await fetchPolicies();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadPolicies();
    const interval = setInterval(loadPolicies, 30000);
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

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [policies, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-6 lg:px-8 pt-8 bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-4 uppercase">
            <ShieldCheck className="h-10 w-10 text-cyan-400" />
            AI Guardrails & Policies
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl text-base">
            Active governance policies defining allowed and restricted AI behaviors across the enterprise.
          </p>
        </div>

        <button 
          id="create-policy-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all uppercase tracking-widest shadow-2xl"
        >
          <Plus className="h-4 w-4" />
          Create Guardrail
        </button>
      </div>

      <PolicyBuilderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePolicy}
      />

      {/* Policy Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search active guardrails..." 
          className="w-full bg-[#0d1424] border border-[#1e293b] rounded-xl py-3.5 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-24 text-center">
            <div className="h-10 w-10 animate-spin border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synchronizing Guardrails...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-[#1e293b] rounded-2xl bg-[#0d1424]/50">
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
               {searchTerm ? 'No guardrails match your search' : 'No guardrails configured'}
             </p>
          </div>
        ) : (
          filteredPolicies.map(policy => (
            <div key={policy.id} className="rounded-2xl p-6 bg-[#0d1424] border border-[#1e293b] hover:border-cyan-500/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
              <div className="flex items-center gap-6">
                 <div className={cn(
                   "h-12 w-12 rounded-xl flex items-center justify-center border transition-all",
                   policy.enabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-slate-900 border-white/5 text-slate-500"
                 )}>
                    {policy.effect === 'deny' ? <ShieldAlert className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                 </div>
                 <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-white tracking-tight group-hover:text-cyan-400 transition-colors uppercase">{policy.name}</h3>
                      {policy.enabled && (
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/10 uppercase tracking-widest">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">{policy.description}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-8 lg:gap-12 pl-4 lg:pl-0 border-l border-white/5">
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">EFFECT</p>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border",
                      policy.effect === 'deny' ? "text-rose-400 bg-rose-400/5 border-rose-500/20" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20"
                    )}>
                      {policy.effect}
                    </span>
                 </div>
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">PRIORITY</p>
                    <p className="text-sm font-mono font-black text-white">{policy.priority}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">VERSION</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v{policy.version || policy.current_version || '1.0'}</p>
                 </div>
                 <div className="pl-6 border-l border-white/5">
                    <button 
                      onClick={() => togglePolicy(policy)}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                        policy.enabled ? "bg-emerald-500" : "bg-slate-800"
                      )}
                    >
                       <div className={cn(
                         "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md",
                         policy.enabled ? "right-1" : "left-1"
                       )} />
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
