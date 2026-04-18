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

    const token = accessToken;
    let active = true;

    async function loadPoliciesForGovernance() {
      try {
        const response = await fetchPolicies();
        if (!active) {
          return;
        }
        setPolicies(response.items);
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
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8 text-[var(--foreground)]">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card)] p-8 md:p-10 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_40%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_350px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80 mb-4">
              Governance Workspace
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-[var(--foreground)] md:text-5xl mb-6 uppercase leading-[0.9]">
              Policy Layer <br/>Telemetry.
            </h1>
            <p className="max-w-2xl text-xs font-bold leading-relaxed text-[var(--muted)] uppercase tracking-widest">
              Inspect names, effects, versions, and rollout state from live backend records. 
              The governance engine enforces these rules in real-time.
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--muted-background)]/50 p-8 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">Visible results</p>
            <p className="mt-4 text-5xl font-black text-[var(--foreground)] tracking-tighter">{filteredPolicies.length}</p>
            <div className="mt-6 flex flex-wrap gap-2">
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
          className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl"
        />
        <StatCard
          title="Published"
          value={loading ? '---' : publishedPolicies}
          icon={ShieldCheck}
          trend="Policies available for active decisioning"
          className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl"
        />
        <StatCard
          title="Enabled"
          value={loading ? '---' : enabledPolicies}
          icon={SlidersHorizontal}
          trend="Controls currently switched on"
          className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl"
        />
        <StatCard
          title="Filtered View"
          value={loading ? '---' : filteredPolicies.length}
          icon={Filter}
          trend="Policies matching current search"
          className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl"
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
          description="Search and filter live policies returned by backend."
          className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem] backdrop-blur-xl"
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search policies..."
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-3 text-xs font-black uppercase tracking-widest text-[var(--foreground)] placeholder:text-[var(--muted)]/50 outline-none transition focus:border-cyan-500/50"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'published' | 'draft')
                }
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-3 text-xs font-black uppercase tracking-widest text-[var(--foreground)] outline-none transition focus:border-cyan-500/50"
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
            <div className="p-8">
              <div className="rounded-3xl border border-dashed border-[var(--card-border)] bg-[var(--muted-background)]/50 p-12 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                No policies match the current filters.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--card-border)]">
              {filteredPolicies.map((policy) => (
                <article key={policy.id} className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] hover:bg-[var(--foreground)]/5 transition-colors group">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-black text-[var(--foreground)] uppercase tracking-tight">{policy.name}</p>
                      <StatusBadge
                        label={policy.status}
                        tone={policy.status === 'published' ? 'success' : 'warning'}
                      />
                      <StatusBadge label={policy.effect.replace('_', ' ')} tone="info" />
                    </div>
                    <p className="mt-4 text-xs font-bold leading-relaxed text-[var(--muted)] uppercase tracking-widest opacity-80">
                      {policy.description || 'No description provided for this policy yet.'}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-background)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Version</p>
                      <p className="mt-2 text-xl font-black text-[var(--foreground)]">{policy.current_version}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-background)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Priority</p>
                      <p className="mt-2 text-xl font-black text-[var(--foreground)]">{policy.priority}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-background)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Enabled</p>
                      <div className="mt-2">
                        <StatusBadge
                          label={policy.enabled ? 'On' : 'Off'}
                          tone={policy.enabled ? 'success' : 'warning'}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--muted-background)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Actions</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">
                        {Array.isArray(policy.scope.actions) ? policy.scope.actions.join(', ') : 'None'}
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
