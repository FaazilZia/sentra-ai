import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, FileWarning, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';

export default function RiskCenterPage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetchPolicies();
        setPolicies(response);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8 text-[var(--foreground)] transition-colors duration-300">
      <header className="relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card)] p-8 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.1),transparent_40%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/80">Risk Control Center</p>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tighter text-[var(--foreground)]">Surfacing high-priority exposure.</h1>
            <p className="mt-4 max-w-2xl text-xs font-medium leading-relaxed text-[var(--muted)] uppercase tracking-widest">
               Real-time policy ranking based on derived priority, draft state, and enforcement rollout.
            </p>
          </div>
          <div className="hidden lg:block">
             <div className="flex flex-col items-end">
                <span className="text-[50px] font-black text-[var(--foreground)] leading-none tracking-tighter">2.4</span>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mt-2">Aggregate Risk</span>
             </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'High Risk', value: '3', color: 'text-rose-500', icon: AlertOctagon },
          { label: 'Medium Risk', value: '18', color: 'text-amber-500', icon: ShieldAlert },
          { label: 'Low Risk', value: '47', color: 'text-cyan-500', icon: ShieldCheck },
          { label: 'Total Scoped', value: '112', color: 'text-[var(--foreground)]', icon: Zap },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{stat.label}</p>
            <div className="mt-4 flex items-center justify-between">
               <span className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
               <stat.icon className={`h-5 w-5 ${stat.color} opacity-40`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
        <SurfaceCard 
          title="Priority Exposure" 
          description="Controls requiring immediate DPO attention."
          className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem]"
        >
          <div className="space-y-3">
             {[
               { name: 'Financial Data Leak Prevention', risk: '92', status: 'Draft' },
               { name: 'Cross-Border PII Transfer', risk: '84', status: 'Enabled' },
               { name: 'Third-Party LLM Policy', risk: '78', status: 'Review' },
             ].map((p, i) => (
               <div key={i} className="group flex items-center justify-between rounded-2xl bg-[var(--background)]/50 p-4 transition-all hover:bg-[var(--foreground)]/5 hover:translate-x-1 border border-[var(--card-border)]">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-[var(--card)] flex items-center justify-center font-black text-[var(--muted)] text-[10px] border border-[var(--card-border)]">{i+1}</div>
                     <div>
                        <p className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">{p.name}</p>
                        <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mt-1">Status: {p.status}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-rose-500">{p.risk}%</p>
                     <p className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest">Exposure</p>
                  </div>
               </div>
             ))}
          </div>
        </SurfaceCard>

        <aside className="space-y-6">
           <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4 text-center">Risk Interpret Model</p>
              <div className="space-y-4">
                 {[
                   { label: 'Priority weighting', desc: 'Critical services are weighted 2.5x higher in aggregate risk.' },
                   { label: 'Rollout state', desc: 'Draft policies contribute to operational overhead risk.' },
                 ].map(item => (
                    <div key={item.label}>
                       <p className="text-[10px] font-black text-[var(--foreground)] uppercase mb-1 tracking-wider">{item.label}</p>
                       <p className="text-[10px] font-medium text-[var(--muted)] leading-relaxed italic">{item.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
