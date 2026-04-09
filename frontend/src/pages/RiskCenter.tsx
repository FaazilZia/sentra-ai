import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, FileWarning, ShieldAlert, ShieldCheck } from 'lucide-react';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';

function riskTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) {
    return 'danger';
  }
  if (score >= 50) {
    return 'warning';
  }
  return 'success';
}

export default function RiskCenterPage() {
  const { accessToken } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    let active = true;

    async function loadPoliciesForRisk() {
      try {
        const response = await fetchPolicies(token);
        if (!active) {
          return;
        }
        setPolicies(response.items);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load risk data');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPoliciesForRisk();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const rankedPolicies = useMemo(() => {
    return policies
      .map((policy) => {
        const score =
          Math.min(55, Math.round(policy.priority / 10)) +
          (policy.status === 'draft' ? 18 : 0) +
          (!policy.enabled ? 12 : 0) +
          (policy.effect === 'deny' ? 12 : 0) +
          (policy.effect === 'require_approval' ? 8 : 0);

        return { ...policy, score: Math.min(score, 99) };
      })
      .sort((left, right) => right.score - left.score);
  }, [policies]);

  const highRiskCount = rankedPolicies.filter((policy) => policy.score >= 80).length;
  const mediumRiskCount = rankedPolicies.filter(
    (policy) => policy.score >= 50 && policy.score < 80
  ).length;
  const draftCount = policies.filter((policy) => policy.status === 'draft').length;
  const approvalCount = policies.filter((policy) => policy.effect === 'require_approval').length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(33,14,18,0.96),rgba(59,25,24,0.92))] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(248,113,113,0.18),transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.75fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">
              Risk Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Policy risk is now surfaced from real priority and rollout state.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This page ranks policies with a lightweight frontend risk model using priority, draft
              state, disabled status, and approval-oriented effects so reviewers have something real
              to inspect instead of an empty placeholder.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Highest observed risk</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              {loading ? '--' : rankedPolicies[0]?.score ?? 0}
            </p>
            <div className="mt-4">
              <StatusBadge
                label={
                  rankedPolicies[0]
                    ? `${rankedPolicies[0].name.slice(0, 24)}${rankedPolicies[0].name.length > 24 ? '...' : ''}`
                    : 'No policies'
                }
                tone={rankTone(rankedPolicies[0]?.score ?? 0)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="High Risk Controls"
          value={loading ? '---' : highRiskCount}
          icon={AlertOctagon}
          trend="Policies with a risk score of 80 or above"
        />
        <StatCard
          title="Medium Risk Controls"
          value={loading ? '---' : mediumRiskCount}
          icon={ShieldAlert}
          trend="Policies in the review band"
        />
        <StatCard
          title="Draft Policies"
          value={loading ? '---' : draftCount}
          icon={FileWarning}
          trend="Drafts create operational uncertainty"
        />
        <StatCard
          title="Approval Controls"
          value={loading ? '---' : approvalCount}
          icon={ShieldCheck}
          trend="Policies that require a human approval gate"
        />
      </div>

      {error ? (
        <EmptyStateList
          title="Risk Data Unavailable"
          description="The risk page could not load the policy list used for scoring."
          emptyMessage={error}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard
            title="Ranked Controls"
            description="Policies sorted by derived risk score for fast analyst review."
          >
            {rankedPolicies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-sm text-slate-400">
                No policies are available yet, so there is no risk ranking to show.
              </div>
            ) : (
              <div className="space-y-3">
                {rankedPolicies.slice(0, 6).map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{policy.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Effect: {policy.effect} · Priority {policy.priority} · Version{' '}
                          {policy.current_version}
                        </p>
                      </div>
                      <StatusBadge
                        label={`Risk ${policy.score}`}
                        tone={riskTone(policy.score)}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {policy.description || 'No description provided for this policy yet.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard
            title="Risk Notes"
            description="How this first real Risk Center is currently interpreted."
          >
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm font-medium text-white">Priority weighting</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Higher priority values contribute more heavily to the risk score and surface the
                  controls that matter most first.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm font-medium text-white">Draft and disabled controls</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Controls that are not fully published or enabled increase operational ambiguity and
                  are treated as higher review risk.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm font-medium text-white">Next step</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Later we can replace this frontend scoring model with actual incidents, decisions,
                  approvals, and enforcement telemetry from the backend.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}

function rankTone(score: number): 'success' | 'warning' | 'danger' {
  return riskTone(score);
}
