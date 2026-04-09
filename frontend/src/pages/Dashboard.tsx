import { useEffect, useState } from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  AlertOctagon,
  Activity,
  ShieldAlert,
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Governance Overview</h1>
        <p className="text-slate-400 text-sm mt-1">
          Signed in as {user?.full_name}. Live data is now coming from your FastAPI backend and
          Supabase database.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Policies" value={loading ? '---' : policies.length} icon={BrainCircuit} />
        <StatCard
          title="Published Policies"
          value={loading ? '---' : publishedPolicies}
          icon={ShieldCheck}
        />
        <StatCard
          title="Critical Policies"
          value={loading ? '---' : criticalPolicies}
          icon={AlertOctagon}
        />
        <StatCard title="Enabled Policies" value={loading ? '---' : enabledPolicies} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <DataChartEmpty
          title="Policy Engine Feed"
          description="The chart area is still placeholder UI, but the counts on this page are now live from your backend."
        />

        <div className="col-span-1 border-0 h-full flex flex-col">
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
            <div className="bg-white/6 backdrop-blur-xl border border-white/10 shadow-lg shadow-slate-950/20 rounded-2xl overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-white/10 bg-white/4">
                <h3 className="font-semibold text-slate-100 leading-none">Latest Policies</h3>
                <p className="text-sm text-slate-400 mt-1.5">
                  Real records returned from <code>/api/v1/policies</code>.
                </p>
              </div>
              <div className="divide-y divide-white/10">
                {policies.slice(0, 5).map((policy) => (
                  <div key={policy.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{policy.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Effect: {policy.effect} · Version {policy.current_version}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                        {policy.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      {policy.description || 'No description provided for this policy yet.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
