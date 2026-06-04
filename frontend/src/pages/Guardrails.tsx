import { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Lock, 
  Eye, 
  Settings2,
  AlertCircle
} from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

// Verified: Unused imports (ShieldAlert, Activity, Trash2, Toggle, MoreVertical) are already cleared.

const initialGuardrails: any[] = [];

export default function Guardrails() {
  const addToast = useStore((state) => state.addToast);
  const [guardrails, setGuardrails] = useState(initialGuardrails);

  const toggleStatus = (id: string) => {
    setGuardrails(prev => prev.map(g => 
      g.id === id ? { ...g, status: g.status === 'Active' ? 'Inactive' : 'Active' } : g
    ));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">AI Guardrails</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Active Protection Layers & Interception Rules
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus className="h-4 w-4" />
          Add Guardrail
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Active Guardrails" 
          value="0" 
          icon="compliance" 
          status="primary" 
        />
        <KPICard 
          label="Interceptions (24h)" 
          value="0" 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Safety Coverage" 
          value="0%" 
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Latency Impact" 
          value="0ms" 
          icon="systems" 
          status="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Guardrail Management */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Configured Policies</h3>
            <div className="flex gap-2">
               <button className="text-[9px] font-black text-[var(--text-primary)] bg-black/5 px-2 py-1 rounded uppercase">All</button>
               <button 
                 onClick={() => addToast({ message: 'Filtering by Security guardrails...', type: 'info' })}
                 className="text-[9px] font-black text-[var(--text-muted)] hover:text-[var(--royal-indigo)] transition-colors px-2 py-1 rounded uppercase"
               >
                 Security
               </button>
               <button 
                 onClick={() => addToast({ message: 'Filtering by Privacy guardrails...', type: 'info' })}
                 className="text-[9px] font-black text-[var(--text-muted)] hover:text-[var(--royal-indigo)] transition-colors px-2 py-1 rounded uppercase"
               >
                 Privacy
               </button>
            </div>
          </div>

          { guardrails.length > 0 ? guardrails.map((g) => (
            <div key={g.id} className="card-base p-5 flex items-center justify-between group">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                  g.status === 'Active' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-500"
                )}>
                  {g.category === 'Security' ? <Lock className="h-5 w-5" /> : 
                   g.category === 'Privacy' ? <Eye className="h-5 w-5" /> : 
                   <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[var(--text-sm)] font-black text-[var(--text-primary)] uppercase tracking-tight">{g.name}</h4>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)] uppercase">{g.category}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-md">{g.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Triggers</p>
                  <p className="text-[var(--text-base)] font-black text-[var(--text-primary)] tabular-nums">{g.triggers.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleStatus(g.id)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                      g.status === 'Active' ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                      g.status === 'Active' ? "translate-x-5" : "translate-x-1"
                    )} />
                  </button>
                  <button className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="border-2 border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-12 text-[var(--text-muted)]">
              <Lock className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No active guardrails configured</p>
            </div>
          )}
        </div>

        {/* Add New Guardrail Form (Mock) */}
        <div className="lg:col-span-4">
          <div className="card-base p-6 sticky top-24">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[var(--royal-indigo)]" />
              Quick Definition
            </h3>
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div>
                <label htmlFor="rule-name" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Rule Name</label>
                <input id="rule-name" type="text" placeholder="e.g. Finance Data Filter" className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" />
              </div>
              <div>
                <label htmlFor="rule-category" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Category</label>
                <select id="rule-category" className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]">
                  <option>Security</option>
                  <option>Privacy</option>
                  <option>Safety</option>
                  <option>Business</option>
                </select>
              </div>
              <div>
                <label htmlFor="rule-logic" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Interception Logic</label>
                <textarea id="rule-logic" rows={3} placeholder="Describe what to intercept..." className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] resize-none" />
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-[9px] font-black uppercase">Auto-Optimization</span>
                </div>
                <p className="text-[10px] text-blue-400/70 leading-relaxed">Sentra AI will automatically convert this description into a high-performance vector filter.</p>
              </div>
              <button 
                onClick={() => addToast({ message: 'Guardrail policy deployed to edge runtime successfully!', type: 'success' })}
                className="btn-primary w-full !text-[10px] !py-3 uppercase tracking-widest font-black mt-2"
              >
                Deploy Guardrail
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
