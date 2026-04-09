import { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowUpRight,
  Binary,
  BrainCircuit,
  FileCheck2,
  Radar,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { DataChartEmpty } from '../components/ui/DataChartEmpty';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { fetchPolicies, PolicyResponse } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
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

    async function loadPolicies() {
      try {
        const response = await fetchPolicies(token);
        if (active) {
          setPolicies(response.items);
          setError(null);
        }
      } catch (fetchError) {
        if (active) {
          const message = fetchError instanceof Error ? fetchError.message : 'Unable to load policies';
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPolicies();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const publishedPolicies = policies.filter((policy) => policy.status === 'published').length;
  const enabledPolicies = policies.filter((policy) => policy.enabled).length;
  const criticalPolicies = policies.filter((policy) => policy.priority >= 500).length;
  const draftPolicies = policies.filter((policy) => policy.status === 'draft').length;

  const securityPosture = policies.length === 0 ? 68 : Math.min(98, 72 + enabledPolicies * 4);
  const postureLabel =
    securityPosture >= 90 ? 'Strong posture' : securityPosture >= 80 ? 'Stable posture' : 'Needs review';

  const controlPlaneHighlights = [
    {
      label: 'Active policies',
      value: loading ? 'Syncing' : `${enabledPolicies} controls`,
      detail: 'Controls currently enforced across live requests',
      icon: BrainCircuit,
    },
    {
      label: 'Telemetry state',
      value: error ? 'Degraded' : 'Streaming',
      detail: error ? 'Backend reachable, policy sync needs attention' : 'Frontend and backend are in lockstep',
      icon: Radar,
    },
    {
      label: 'Review queue',
      value: loading ? 'Pending' : `${draftPolicies} drafts`,
      detail: 'Policies waiting for legal or security approval',
      icon: FileCheck2,
    },
  ];

  const trustTimeline = [
    {
      title: 'Policy engine online',
      detail: `${publishedPolicies || 0} published controls are ready for evaluation`,
    },
    {
      title: 'Identity layer attached',
      detail: user?.email ? `Operator verified as ${user.email}` : 'User session verified successfully',
    },
    {
      title: error ? 'Policy sync needs attention' : 'Tenant sync healthy',
      detail: error ?? 'Policy inventory is loading from the FastAPI backend and database',
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,29,0.96),rgba(17,33,55,0.92))] p-6 shadow-[0_30px_80px_-40px_rgba(6,182,212,0.55)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.20),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(96,165,250,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_24%)]" />
        <div className="absolute -right-20 top-10 h-56 w-56 rounded-full border border-white/10 bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />

        <div className="relative grid gap-6 lg:grid-cols-[1.6fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Trust Command Center
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Sentra AI is now shaping into a live governance cockpit.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Signed in as {user?.full_name}. Your dashboard is connected to the FastAPI policy
                layer and is starting to behave like an executive surface for AI risk, approvals,
                and control coverage.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {controlPlaneHighlights.map(({ label, value, detail, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                    <div className="rounded-xl border border-white/10 bg-white/10 p-2 text-cyan-100">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{value}</p>
                  <p className="mt-1 text-sm text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Security posture</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
                  {securityPosture}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,0.9),rgba(59,130,246,0.95),rgba(250,204,21,0.92))]"
                style={{ width: `${securityPosture}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-300">{postureLabel}</span>
              <span className="inline-flex items-center gap-1 text-cyan-100">
                View board snapshot
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {trustTimeline.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
                    <div className="h-2 w-2 rounded-full bg-cyan-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-sm text-slate-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
          Live Governance Metrics
        </p>
        <p className="mt-2 text-sm text-slate-400">
          These counters are derived from your backend policy records and framed for fast operator
          scanning.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Policies"
          value={loading ? '---' : policies.length}
          icon={BrainCircuit}
          trend={loading ? 'Loading records' : `${draftPolicies} drafts awaiting approval`}
        />
        <StatCard
          title="Published Policies"
          value={loading ? '---' : publishedPolicies}
          icon={ShieldCheck}
          trend={loading ? 'Calculating coverage' : 'Decision-ready controls'}
        />
        <StatCard
          title="Critical Policies"
          value={loading ? '---' : criticalPolicies}
          icon={AlertOctagon}
          trend={loading ? 'Evaluating severity' : 'High-priority protections'}
        />
        <StatCard
          title="Enabled Policies"
          value={loading ? '---' : enabledPolicies}
          icon={Activity}
          trend={loading ? 'Checking rollout state' : 'Enforced in active environments'}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <DataChartEmpty
          title="Policy Engine Feed"
          description="A cinematic placeholder while you connect observability, incidents, and decision analytics into one live command stream."
        />

        <div className="col-span-1 flex h-full flex-col border-0">
          {error ? (
            <EmptyStateList
              title="Policy Load Failed"
              description="The frontend reached the backend, but policy data did not load cleanly."
              emptyMessage={error}
              emptyIcon={ShieldAlert}
            />
          ) : policies.length === 0 ? (
            <EmptyStateList
              title="Policy Inventory"
              description="No policies are stored yet for the current tenant."
              emptyMessage="Create your first governance policy through the backend docs or API to populate this panel."
              emptyIcon={ShieldAlert}
            />
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
              <div className="border-b border-white/10 bg-white/4 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold leading-none text-slate-100">Latest Policies</h3>
                    <p className="mt-1.5 text-sm text-slate-400">
                      Real records returned from <code>/api/v1/policies</code>.
                    </p>
                  </div>
                  <div className="hidden rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-right sm:block">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Decision fabric</p>
                    <p className="mt-1 text-sm font-medium text-white">{publishedPolicies} published</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-white/10">
                {policies.slice(0, 5).map((policy) => (
                  <div key={policy.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100">
                            <Binary className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-100">{policy.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              Effect: {policy.effect} · Version {policy.current_version}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                        {policy.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {policy.description || 'No description provided for this policy yet.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                Operating Narrative
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                Built for teams running AI in regulated environments.
              </h2>
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-cyan-100 md:block">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">Control intent</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Define how agents access sensitive assets and what response obligations apply.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">Decision clarity</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Surface approval state, policy versions, and risk posture without leaving the main view.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">Board readiness</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Present a cleaner story for executives, auditors, and security reviewers.
              </p>
            </div>
          </div>
        </div>

        <EmptyStateList
          title="Incident Escalations"
          description="The response lane is ready for incidents, approvals, and blocked agent requests."
          emptyMessage="No incidents are active right now. This space is prepared for future approval chains and exception handling."
          emptyIcon={ShieldCheck}
        />
      </div>
    </div>
  );
}
