import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Plus } from 'lucide-react';
import { fetchPolicies, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

const MOCK_POLICIES: PolicyResponse[] = [
  {
    id: 'p1',
    name: 'Restrict external data sharing',
    description: 'Prevents AI agents from sending sensitive data to unverified external API endpoints.',
    enabled: true,
    effect: 'deny',
    priority: 100,
    current_version: 3,
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    name: 'Unauthorized payment block',
    description: 'Ensures all financial transactions triggered by AI are routed through the internal approval portal.',
    enabled: true,
    effect: 'deny',
    priority: 90,
    current_version: 2,
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    name: 'Internal DB access only',
    description: 'Strictly limits database access to authorized internal VPC resources.',
    enabled: true,
    effect: 'allow',
    priority: 80,
    current_version: 1,
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'p4',
    name: 'Prevent PII exposure',
    description: 'Automatically redacts personal information before processing via third-party LLMs.',
    enabled: true,
    effect: 'allow',
    priority: 95,
    current_version: 4,
    status: 'active',
    created_at: new Date().toISOString()
  }
];

export default function GovernancePage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>(MOCK_POLICIES); // Use mock as default for demo
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadPolicies() {
      // For the demo, we'll keep using mock data but attempt a load
      try {
        const data = await fetchPolicies();
        if (Array.isArray(data) && data.length > 0) {
          setPolicies(data);
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, [accessToken]);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [policies, searchTerm]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-10 pb-12 px-6 pt-10">
      {/* Premium Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4 uppercase">
            <ShieldCheck className="h-10 w-10 text-white" />
            AI Guardrails
          </h1>
          <p className="mt-2 text-slate-300 font-medium max-w-xl text-lg">
            Active governance policies defining allowed and restricted AI behaviors across the enterprise.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-xs font-black text-slate-950 hover:bg-slate-200 transition-all uppercase tracking-widest shadow-2xl">
          <Plus className="h-4 w-4" />
          Create Guardrail
        </button>
      </div>

      {/* Policy Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search active guardrails..." 
          className="w-full bg-slate-900/50 border border-white/5 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="p-20 text-center">
            <div className="h-10 w-10 animate-spin border-2 border-white border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-20 text-center glass-card rounded-[2.5rem] border-dashed border-white/5">
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active guardrails match your search</p>
          </div>
        ) : (
          filteredPolicies.map(policy => (
            <div key={policy.id} className="glass-card rounded-[2.5rem] p-8 bg-slate-900/40 border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 group">
              <div className="flex items-center gap-6">
                 <div className={cn(
                   "h-12 w-12 rounded-2xl flex items-center justify-center border transition-all",
                   policy.enabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-slate-800 border-white/5 text-slate-400"
                 )}>
                    <ShieldCheck className="h-6 w-6" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">{policy.name}</h3>
                      {policy.enabled && (
                        <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mt-1 max-w-md line-clamp-1">{policy.description}</p>
                 </div>
              </div>

              <div className="flex items-center gap-12">
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">EFFECT</p>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded",
                      policy.effect === 'deny' ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"
                    )}>
                      {policy.effect}
                    </span>
                 </div>
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">PRIORITY</p>
                    <p className="text-sm font-black text-white">{policy.priority}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">VERSION</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">v{policy.current_version}</p>
                 </div>
                 <div className="pl-6 border-l border-white/5">
                    <div className={cn(
                      "w-12 h-6 rounded-full relative transition-all cursor-pointer",
                      policy.enabled ? "bg-emerald-500" : "bg-slate-700"
                    )}>
                       <div className={cn(
                         "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                         policy.enabled ? "right-1" : "left-1"
                       )} />
                    </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
