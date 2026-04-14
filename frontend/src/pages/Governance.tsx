import { useEffect, useMemo, useState } from 'react';
import { FileSignature, Filter, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function GovernancePage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadPoliciesForGovernance() {
      try {
        const response = await fetchPolicies();
        if (!active) {
          return;
        }
        const list = Array.isArray(response) ? response : [];
        setPolicies(list);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load governance data');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPoliciesForGovernance();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchesQuery =
        query.trim().length === 0 ||
        policy.name.toLowerCase().includes(query.toLowerCase()) ||
        policy.description.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [policies, query, statusFilter]);

  const enabledPolicies = policies.filter((policy) => policy.enabled).length;
  const publishedPolicies = policies.filter((policy) => policy.status === 'published').length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,18,33,0.96),rgba(24,40,66,0.92))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              Governance Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Your policy layer is now searchable and browsable instead of static.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This page turns the governance placeholder into a real policy workspace where you can
              inspect names, effects, versions, rollout state, and scope from live backend records.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Visible results</p>
            <p className="mt-2 text-4xl font-semibold text-white">{filteredPolicies.length}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={`${publishedPolicies} published`} tone="success" />
              <StatusBadge label={`${enabledPolicies} enabled`} tone="info" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Policy Records"
          value={loading ? '---' : policies.length}
          icon={FileSignature}
          trend="Total governance documents in scope"
        />
        <StatCard
          title="Published"
          value={loading ? '---' : publishedPolicies}
          icon={ShieldCheck}
          trend="Policies available for active decisioning"
        />
        <StatCard
          title="Enabled"
          value={loading ? '---' : enabledPolicies}
          icon={SlidersHorizontal}
          trend="Controls currently switched on"
        />
        <StatCard
          title="Filtered View"
          value={loading ? '---' : filteredPolicies.length}
          icon={Filter}
          trend="Policies matching current search and status filters"
        />
      </div>

      {error ? (
        <EmptyStateList
          title="Governance Data Unavailable"
          description="The governance workspace could not load the policy list."
          emptyMessage={error}
        />
      ) : (
        <SurfaceCard
          title="Policy Workspace"
          description="Search and filter live policies returned by `/api/v1/policies`."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search policies"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-200/25"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'published' | 'draft')
                }
                className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-200/25"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          }
          contentClassName="p-0"
        >
          {filteredPolicies.length === 0 ? (
            <div className="p-5">
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-sm text-slate-400">
                No policies match the current filters yet.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredPolicies.map((policy) => (
                <article key={policy.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-white">{policy.name}</p>
                      <StatusBadge
                        label={policy.status}
                        tone={policy.status === 'published' ? 'success' : 'warning'}
                      />
                      <StatusBadge label={policy.effect.replace('_', ' ')} tone="info" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {policy.description || 'No description provided for this policy yet.'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Version</p>
                      <p className="mt-2 text-lg font-medium text-white">{policy.current_version}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</p>
                      <p className="mt-2 text-lg font-medium text-white">{policy.priority}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Enabled</p>
                      <div className="mt-2">
                        <StatusBadge
                          label={policy.enabled ? 'On' : 'Off'}
                          tone={policy.enabled ? 'success' : 'warning'}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Actions</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {Array.isArray(policy.scope?.actions) ? policy.scope.actions.join(', ') : 'None'}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
