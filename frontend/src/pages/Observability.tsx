import { useEffect, useState } from 'react';
import { Activity, Radar, ShieldCheck, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyStateList } from '../components/ui/EmptyStateList';
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

export default function ObservabilityPage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [policyHealth, setPolicyHealth] = useState<PolicyHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Policies fetch from api.ts automatically uses the token from localStorage
    let active = true;


    async function loadObservability() {
      try {
        const [policiesData, backendHealthResponse, policyHealthResponse] = await Promise.all([
          fetchPolicies(),
          fetchBackendHealth(),
          fetchPolicyHealth(),
        ]);

        if (!active) {
          return;
        }

        setPolicies(policiesData);
        setBackendHealth(backendHealthResponse);
        setPolicyHealth(policyHealthResponse);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load observability data');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadObservability();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const policyStatusData = [
    { name: 'Published', total: policies.filter((policy) => policy.status === 'published').length },
    { name: 'Draft', total: policies.filter((policy) => policy.status === 'draft').length },
    { name: 'Enabled', total: policies.filter((policy) => policy.enabled).length },
    { name: 'Critical', total: policies.filter((policy) => policy.priority >= 500).length },
  ];

  const coverage = policies.length === 0 ? 0 : Math.round((policyStatusData[0].total / policies.length) * 100);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,16,31,0.96),rgba(9,31,53,0.92))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(96,165,250,0.16),transparent_22%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              System Observability
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Backend checks and policy-engine telemetry are now visible here.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This page uses the deployed `/health`, `/policies/health`, and `/policies` endpoints to
              show whether the control plane is reachable and how much of the policy layer is live.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Engine evaluator</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {policyHealth?.evaluator ?? 'Awaiting policy-health'}
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Backend Health"
          value={loading ? '---' : backendHealth?.status ?? 'Unknown'}
          icon={ShieldCheck}
          trend="Live check from /health"
        />
        <StatCard
          title="Policy Evaluator"
          value={loading ? '---' : policyHealth?.status ?? 'Unknown'}
          icon={Radar}
          trend="Live check from /policies/health"
        />
        <StatCard
          title="Published Coverage"
          value={loading ? '---' : `${coverage}%`}
          icon={Activity}
          trend="Published policies relative to total policies"
        />
        <StatCard
          title="Tracked Controls"
          value={loading ? '---' : policies.length}
          icon={Zap}
          trend="Policies contributing to control-plane telemetry"
        />
      </div>

      {error ? (
        <EmptyStateList
          title="Observability Unavailable"
          description="The observability page could not assemble the backend and policy signals."
          emptyMessage={error}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard
            title="Control Coverage"
            description="A simple live breakdown of published, draft, enabled, and critical policy counts."
          >
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
          </SurfaceCard>

          <SurfaceCard
            title="System Checks"
            description="Signals currently available from the deployed backend."
          >
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">API reachability</p>
                    <p className="mt-1 text-sm text-slate-400">Node.js `/health` endpoint</p>
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
                    <p className="mt-1 text-sm text-slate-400">
                      Evaluator reported by `/policies/health`
                    </p>
                  </div>
                  <StatusBadge
                    label={policyHealth?.status ?? 'unknown'}
                    tone={policyHealth?.status === 'healthy' ? 'success' : 'warning'}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  Evaluator: {policyHealth?.evaluator ?? 'not yet returned'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm font-medium text-white">Live note</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Right now observability is lightweight and policy-centric. As you add incident,
                  decision, and enforcement feeds, this page can evolve into a true operations console.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
