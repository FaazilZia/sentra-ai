import { useEffect, useState } from 'react';
import { Activity, Radar, ShieldCheck, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { SurfaceCard } from '../ui/SurfaceCard';
import {
  BackendHealthResponse,
  fetchBackendHealth,
  fetchPolicies,
  fetchPolicyHealth,
  PolicyHealthResponse,
  PolicyResponse,
} from '../../lib/api';

export function SystemObservability() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [policyHealth, setPolicyHealth] = useState<PolicyHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [policiesData, backendHealthResponse, policyHealthResponse] = await Promise.all([
        fetchPolicies(),
        fetchBackendHealth(),
        fetchPolicyHealth(),
      ]);

      setPolicies(Array.isArray(policiesData) ? policiesData : []);
      setBackendHealth(backendHealthResponse);
      setPolicyHealth(policyHealthResponse);
    } catch (loadError) {
      console.error('Unable to load observability data:', loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const policyStatusData = [
    { name: 'Published', total: policies.filter((policy) => policy.status === 'published' || (policy as any).published).length },
    { name: 'Draft', total: policies.filter((policy) => policy.status === 'draft').length },
    { name: 'Enabled', total: policies.filter((policy) => policy.enabled).length },
    { name: 'Critical', total: policies.filter((policy) => (policy.priority || 0) >= 500).length },
  ];

  const publishedCount = policyStatusData[0].total;
  const coverage = policies.length === 0 ? 0 : Math.round((publishedCount / policies.length) * 100);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
        <h2 className="text-lg font-black text-white tracking-tighter uppercase">System Observability</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Backend Health"
          value={loading ? '---' : (backendHealth?.status === 'healthy' ? 'Healthy' : 'Degraded')}
          icon={ShieldCheck}
          trend="Live node.js health"
          valueColor={backendHealth?.status === 'healthy' ? "text-emerald-400" : "text-rose-400"}
        />
        <StatCard
          title="Policy Evaluator"
          value={loading ? '---' : (policyHealth?.status === 'healthy' ? 'Active' : 'Offline')}
          icon={Radar}
          trend="Evaluator service status"
          valueColor={policyHealth?.status === 'healthy' ? "text-emerald-400" : "text-rose-400"}
        />
        <StatCard
          title="Published Coverage"
          value={loading ? '---' : `${coverage}%`}
          icon={Activity}
          trend="Policy distribution ratio"
          valueColor={coverage === 0 ? "text-slate-500" : (coverage === 100 ? "text-emerald-400" : "text-cyan-400")}
        />
        <StatCard
          title="Tracked Controls"
          value={loading ? '---' : policies.length}
          icon={Zap}
          trend="Total governance rules"
          valueColor={policies.length === 0 ? "text-slate-500" : "text-cyan-400"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          title="Control Coverage Matrix"
          description="Live distribution of governance states across the fleet"
        >
          <div className="h-[320px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={policyStatusData}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{ fontWeight: 700 }} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.01)' }}
                  contentStyle={{
                    background: '#0d1424',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                />
                <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Telemetry Signals"
          description="Real-time heartbeat from core infrastructure"
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-[#1e293b] bg-slate-950/40 p-5 group hover:border-cyan-500/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">API Reachability</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Node.js /health</p>
                </div>
                <StatusBadge
                  label={backendHealth?.status ?? 'SYNCING'}
                  tone={backendHealth?.status === 'healthy' ? 'success' : 'warning'}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#1e293b] bg-slate-950/40 p-5 group hover:border-cyan-500/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">Policy Engine</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Evaluator Status</p>
                </div>
                <StatusBadge
                  label={policyHealth?.status ?? 'SYNCING'}
                  tone={policyHealth?.status === 'healthy' ? 'success' : 'warning'}
                />
              </div>
              {policyHealth?.evaluator && (
                <p className="mt-4 text-[9px] font-mono text-cyan-500/60 uppercase tracking-[0.2em] font-black">
                  NODE_ID: {policyHealth.evaluator}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-5">
              <p className="text-[10px] leading-5 text-slate-400 italic font-medium">
                "System observability is live and polling every 30s. Metrics reflect the real-time state of the Sentra AI engine."
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </section>
  );
}
