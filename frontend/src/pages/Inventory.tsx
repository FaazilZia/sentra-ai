import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, UserRound, Waypoints } from 'lucide-react';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, fetchTenant, PolicyResponse, TenantResponse } from '../lib/api';
import { useAuth } from '../lib/auth';

const effectToneMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  allow: 'success',
  deny: 'danger',
  require_approval: 'warning',
  mask: 'info',
  redact: 'info',
  rate_limit: 'warning',
};

export default function InventoryPage() {
  const { accessToken, user } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !user) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    const tenantId = user.tenant_id;
    let active = true;

    async function loadInventory() {
      try {
        const [tenantResponse, policyResponse] = await Promise.all([
          fetchTenant(token, tenantId),
          fetchPolicies(token),
        ]);

        if (!active) {
          return;
        }

        setTenant(tenantResponse);
        setPolicies(policyResponse.items);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInventory();

    return () => {
      active = false;
    };
  }, [accessToken, user]);

  const uniqueAssetTypes = new Set(
    policies.flatMap((policy) => {
      const assetTypes = policy.scope.asset_types;
      return Array.isArray(assetTypes) ? assetTypes.map(String) : [];
    })
  ).size;

  const uniqueAgentTypes = new Set(
    policies.flatMap((policy) => {
      const agentTypes = policy.scope.agent_types;
      return Array.isArray(agentTypes) ? agentTypes.map(String) : [];
    })
  ).size;

  const effectSummary = Object.entries(
    policies.reduce<Record<string, number>>((accumulator, policy) => {
      accumulator[policy.effect] = (accumulator[policy.effect] ?? 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(12,20,35,0.96),rgba(14,41,58,0.92))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              Inventory Control
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Real tenant, operator, and policy inventory from the deployed backend.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This page turns the old placeholder into an operational snapshot of who is signed in,
              which tenant is active, and how your current policy estate is distributed.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active tenant</p>
            <p className="mt-2 text-2xl font-semibold text-white">{tenant?.name ?? 'Loading tenant'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge
                label={tenant?.is_active ? 'Tenant Active' : 'Tenant Pending'}
                tone={tenant?.is_active ? 'success' : 'warning'}
              />
              <StatusBadge label={`${policies.length} policies`} tone="info" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tenant Policies"
          value={loading ? '---' : policies.length}
          icon={ShieldCheck}
          trend="Policies attached to the current tenant"
        />
        <StatCard
          title="Asset Types"
          value={loading ? '---' : uniqueAssetTypes}
          icon={Building2}
          trend="Distinct governed asset classes"
        />
        <StatCard
          title="Agent Types"
          value={loading ? '---' : uniqueAgentTypes}
          icon={Waypoints}
          trend="Unique agent categories in scope"
        />
        <StatCard
          title="Operator State"
          value={loading ? '---' : user?.is_active ? 'Live' : 'Paused'}
          icon={UserRound}
          trend="Current authenticated operator session"
        />
      </div>

      {error ? (
        <EmptyStateList
          title="Inventory Unavailable"
          description="The inventory view could not load the tenant and policy records."
          emptyMessage={error}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard
            title="Tenant Profile"
            description="Identity and activation details for the active workspace."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tenant name</p>
                <p className="mt-2 text-lg font-medium text-white">{tenant?.name ?? 'Not loaded'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Slug</p>
                <p className="mt-2 text-lg font-medium text-white">{tenant?.slug ?? 'Not loaded'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'Not loaded'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                <div className="mt-2">
                  <StatusBadge
                    label={tenant?.is_active ? 'Active' : 'Inactive'}
                    tone={tenant?.is_active ? 'success' : 'warning'}
                  />
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Operator Session"
            description="Current authenticated user pulled from the active auth session."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Full name</p>
                <p className="mt-2 text-lg font-medium text-white">{user?.full_name ?? 'Unknown user'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p>
                <p className="mt-2 text-lg font-medium text-white">{user?.email ?? 'Unknown email'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tenant ID</p>
                <p className="mt-2 break-all text-sm font-medium text-white">{user?.tenant_id ?? 'Unknown tenant'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">User status</p>
                <div className="mt-2">
                  <StatusBadge
                    label={user?.is_active ? 'Operator Active' : 'Operator Inactive'}
                    tone={user?.is_active ? 'success' : 'warning'}
                  />
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Policy Distribution"
            description="How the current policy estate is split by effect."
            className="xl:col-span-2"
          >
            {effectSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-sm text-slate-400">
                No policies are available yet, so there is no live distribution to show.
              </div>
            ) : (
              <div className="space-y-3">
                {effectSummary.map(([effect, count]) => {
                  const width = `${Math.max(14, (count / policies.length) * 100)}%`;
                  return (
                    <div key={effect} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            label={effect.replace('_', ' ')}
                            tone={effectToneMap[effect] ?? 'default'}
                          />
                          <span className="text-sm text-slate-400">Policy effect</span>
                        </div>
                        <span className="text-sm font-medium text-white">{count}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.85),rgba(59,130,246,0.95))]"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
