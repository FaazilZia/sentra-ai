import { useEffect, useMemo, useState } from 'react';
import { Clock3, FileClock, GitCommitHorizontal, ShieldCheck } from 'lucide-react';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, fetchPolicyVersions, PolicyResponse, PolicyVersionResponse } from '../lib/api';
import { useAuth } from '../lib/auth';

interface AuditEntry {
  policyId: string;
  policyName: string;
  version: number;
  status: string;
  effect: string;
  priority: number;
  publishedSnapshot: boolean;
  createdAt: string;
}

export default function AuditLogPage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    let active = true;

    async function loadAuditTrail() {
      try {
        const policiesResponse = await fetchPolicies(token);
        const versionLists = await Promise.all(
          policiesResponse.items.map((policy) => fetchPolicyVersions(token, policy.id))
        );

        if (!active) {
          return;
        }

        setPolicies(policiesResponse.items);
        setVersions(versionLists.flat());
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load audit history');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAuditTrail();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const auditEntries = useMemo<AuditEntry[]>(() => {
    const policyMap = new Map(policies.map((policy) => [policy.id, policy.name]));

    return versions
      .map((version) => ({
        policyId: version.policy_id,
        policyName: policyMap.get(version.policy_id) ?? version.name,
        version: version.version,
        status: version.status,
        effect: version.effect,
        priority: version.priority,
        publishedSnapshot: version.is_published_snapshot,
        createdAt: version.created_at,
      }))
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [policies, versions]);

  const publishedSnapshots = auditEntries.filter((entry) => entry.publishedSnapshot).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,14,34,0.96),rgba(20,29,57,0.92))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              Audit Trail
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Version history from real policy snapshots is now visible here.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This page walks each policy’s version history from the deployed backend and assembles a
              timeline that is much closer to the audit surface your platform is aiming for.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Latest audit event</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {auditEntries[0]
                ? `${auditEntries[0].policyName} v${auditEntries[0].version}`
                : 'Awaiting version history'}
            </p>
            <div className="mt-4">
              <StatusBadge
                label={auditEntries[0]?.publishedSnapshot ? 'Published Snapshot' : 'Working Draft'}
                tone={auditEntries[0]?.publishedSnapshot ? 'success' : 'warning'}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Policies Tracked"
          value={loading ? '---' : policies.length}
          icon={ShieldCheck}
          trend="Policies contributing to the audit view"
        />
        <StatCard
          title="Version Events"
          value={loading ? '---' : auditEntries.length}
          icon={GitCommitHorizontal}
          trend="Total recorded policy versions"
        />
        <StatCard
          title="Published Snapshots"
          value={loading ? '---' : publishedSnapshots}
          icon={FileClock}
          trend="Versions marked as publish snapshots"
        />
        <StatCard
          title="Latest Update"
          value={loading ? '---' : auditEntries[0] ? `v${auditEntries[0].version}` : 'None'}
          icon={Clock3}
          trend="Most recent policy version captured"
        />
      </div>

      {error ? (
        <EmptyStateList
          title="Audit Trail Unavailable"
          description="The audit page could not assemble policy version history."
          emptyMessage={error}
        />
      ) : (
        <SurfaceCard
          title="Version Timeline"
          description="Newest policy snapshots first."
        >
          {auditEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-sm text-slate-400">
              No policy versions are stored yet, so there is no timeline to display.
            </div>
          ) : (
            <div className="space-y-4">
              {auditEntries.slice(0, 12).map((entry) => (
                <div
                  key={`${entry.policyId}-${entry.version}`}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100">
                    <GitCommitHorizontal className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{entry.policyName}</p>
                      <StatusBadge
                        label={`Version ${entry.version}`}
                        tone={entry.publishedSnapshot ? 'success' : 'info'}
                      />
                      <StatusBadge
                        label={entry.publishedSnapshot ? 'Published' : 'Draft'}
                        tone={entry.publishedSnapshot ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Effect: {entry.effect} · Priority {entry.priority} · Status {entry.status}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
