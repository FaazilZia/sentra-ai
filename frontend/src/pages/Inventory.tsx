import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, UserRound, Waypoints, Cpu, ShieldAlert, Zap } from 'lucide-react';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, fetchTenant, PolicyResponse, TenantResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';

export default function Inventory() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [t, p] = await Promise.all([fetchTenant(user?.tenant_id || ''), fetchPolicies()]);
        setTenant(t);
        setPolicies(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8 text-[var(--foreground)] transition-colors duration-300">
      <header className="relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card)] p-8 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_40%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80">Asset & Model Inventory</p>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tighter text-[var(--foreground)]">Live telemetry across node clusters.</h1>
            <p className="mt-4 max-w-2xl text-xs font-medium leading-relaxed text-[var(--muted)] uppercase tracking-widest">
               Centralized visibility into all connected agents, infrastructure models, and governed datasets.
            </p>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center">
             <Cpu className="h-8 w-8 text-cyan-400 opacity-50" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Models', value: '4', color: 'text-cyan-400', icon: Cpu },
          { label: 'Active Clusters', value: '12', color: 'text-indigo-400', icon: Waypoints },
          { label: 'Security Gateways', value: '7', color: 'text-purple-400', icon: ShieldAlert },
          { label: 'Operational Nodes', value: '24', color: 'text-[var(--foreground)]', icon: Zap },
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
            title="Infrastructure Models" 
            description="LLM and application agents under current governance."
            className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[
               { name: 'GPT-4o', health: 97, provider: 'OpenAI', tone: 'bg-cyan-400' },
               { name: 'Claude 3.5 Sonnet', health: 94, provider: 'Anthropic', tone: 'bg-indigo-400' },
               { name: 'Llama 3.1 405B', health: 88, provider: 'Meta', tone: 'bg-purple-400' },
               { name: 'Gemini 1.5 Pro', health: 91, provider: 'Google', tone: 'bg-rose-400' },
             ].map((m, i) => (
               <div key={i} className="rounded-2xl bg-[var(--background)]/50 p-5 border border-[var(--card-border)] transition-all hover:bg-[var(--foreground)]/5">
                  <div className="flex items-center justify-between mb-4">
                     <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--card)] border border-[var(--card-border)] text-[10px] font-black text-[var(--foreground)]">
                        {m.name.slice(0, 1)}
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{m.provider}</span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] mb-2">{m.name}</h4>
                  <div className="flex items-end justify-between">
                     <div className="flex-1 mr-4">
                        <div className="h-1 w-full rounded-full bg-[var(--card-border)] overflow-hidden">
                           <div className={cn("h-full", m.tone)} style={{ width: `${m.health}%` }} />
                        </div>
                     </div>
                     <span className="text-[10px] font-black text-[var(--foreground)]">{m.health}%</span>
                  </div>
               </div>
             ))}
          </div>
        </SurfaceCard>

        <aside className="space-y-6">
           <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4">Workspace context</p>
              <div className="space-y-4">
                 <div>
                    <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Active Tenant</p>
                    <p className="text-xs font-bold text-[var(--foreground)] mt-1 uppercase">{tenant?.name || 'Sentra AI Default'}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Primary Cluster</p>
                    <p className="text-xs font-bold text-[var(--foreground)] mt-1 uppercase">US-EAST-1 (PROD)</p>
                 </div>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}
