import { useEffect, useState } from 'react';
import { Activity, Radar, ShieldCheck, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import {
  BackendHealthResponse,
  fetchBackendHealth,
  fetchPolicies,
  fetchPolicyHealth,
  PolicyHealthResponse,
  PolicyResponse,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

export default function ObservabilityPage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [policyHealth, setPolicyHealth] = useState<PolicyHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadObservability() {
      try {
        const [policiesData, backendHealthResponse, policyHealthResponse] = await Promise.all([
          fetchPolicies(),
          fetchBackendHealth(),
          fetchPolicyHealth(),
        ]);

        if (!active) return;

        setPolicies(policiesData);
        setBackendHealth(backendHealthResponse);
        setPolicyHealth(policyHealthResponse);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load observability data');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadObservability();
    return () => { active = false; };
  }, [accessToken]);

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded-2xl bg-white/[0.03] border border-white/5", className)} />
  );

  const policyStatusData = [
    { name: 'Published', total: policies.filter((policy) => policy.status === 'published').length },
    { name: 'Draft', total: policies.filter((policy) => policy.status === 'draft').length },
    { name: 'Enabled', total: policies.filter((policy) => policy.enabled).length },
    { name: 'Critical', total: policies.filter((policy) => policy.priority >= 500).length },
  ];

  const coverage = policies.length === 0 ? 0 : Math.round((policyStatusData[0].total / policies.length) * 100);

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-12">
        <EmptyState 
          title="Observability Feed Disrupted" 
          description={error}
          icon={ShieldCheck}
          actionLabel="Retry Connection"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      {loading ? (
        <Skeleton className="h-[200px] w-full" />
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,16,31,0.96),rgba(9,31,53,0.92))] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(96,165,250,0.16),transparent_22%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                System Observability
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                Control plane and engine telemetry.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100">
                Real-time signals from the deployed backend showing evaluator health and policy coverage.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Engine evaluator</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {policyHealth?.evaluator ?? 'Awaiting signal...'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge
                  label={backendHealth?.status === 'healthy' ? 'Backend Healthy' : 'Backend Unknown'}
                  tone={backendHealth?.status === 'healthy' ? 'success' : 'warning'}
                />
                <StatusBadge
                  label={policyHealth?.status === 'healthy' ? 'Evaluator Healthy' : 'Evaluator Unknown'}
                  tone={policyHealth?.status === 'healthy' ? 'success' : 'warning'}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Backend Health", val: backendHealth?.status || 'Unknown', icon: ShieldCheck, trend: "Live /health check" },
          { title: "Policy Evaluator", val: policyHealth?.status || 'Unknown', icon: Radar, trend: "Live /policies/health check" },
          { title: "Published Coverage", val: `${coverage}%`, icon: Activity, trend: "Ratio of live controls" },
          { title: "Tracked Controls", val: policies.length, icon: Zap, trend: "Total policy definitions" }
        ].map((stat, i) => (
          loading ? <Skeleton key={i} className="h-32 w-full" /> : (
            <StatCard
              key={i}
              title={stat.title}
              value={stat.val}
              icon={stat.icon}
              trend={stat.trend}
            />
          )
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          title="Control Coverage"
          description="Breakdown of policy status and enforcement levels."
        >
          {loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : policies.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center">
               <EmptyState 
                  title="No Policies Defined" 
                  description="Start by creating a policy in the Policy Lab to see coverage metrics."
                  icon={Activity}
               />
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={policyStatusData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(148,163,184,0.9)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(148,163,184,0.9)" tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{
                      background: 'rgba(2, 6, 23, 0.96)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Bar dataKey="total" fill="rgba(34,211,238,0.85)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="System Checks"
          description="Direct health signals from infrastructure."
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">API reachability</p>
                    <p className="mt-1 text-sm text-slate-300">Node.js `/health` endpoint</p>
                  </div>
                  <StatusBadge
                    label={backendHealth?.status ?? 'unknown'}
                    tone={backendHealth?.status === 'healthy' ? 'success' : 'warning'}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Policy engine</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Evaluator reported by `/policies/health`
                    </p>
                  </div>
                  <StatusBadge
                    label={policyHealth?.status ?? 'unknown'}
                    tone={policyHealth?.status === 'healthy' ? 'success' : 'warning'}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm font-medium text-white">Live Status</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Evaluator: {policyHealth?.evaluator || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
