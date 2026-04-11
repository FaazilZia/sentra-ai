// @ts-nocheck
/* eslint-disable */
import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Box,
  BrainCircuit,
  LoaderCircle,
  MoreVertical,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { DataChartEmpty } from '../components/ui/DataChartEmpty';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, PolicyResponse, triggerScan } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetchPolicies(accessToken);
      setPolicies(response.items);
      setError(null);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unable to load policies';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const handleStartScan = async () => {
    if (!accessToken || isScanning) return;
    
    setIsScanning(true);
    try {
      await triggerScan(accessToken);
      // Wait a bit for the "Deep Scan" feel
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadData();
      alert('Deep Scan complete! 3-5 randomized incidents have been detected and logged to the Security Feed.');
    } catch (err) {
      alert('Scan failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsScanning(false);
    }
  };

  const publishedPolicies = policies.filter((policy: PolicyResponse) => policy.status === 'published').length;
  const enabledPolicies = policies.filter((policy: PolicyResponse) => policy.enabled).length;
  const criticalPolicies = policies.filter((policy: PolicyResponse) => policy.priority >= 500).length;
  const riskyPolicies = policies.filter(
    (policy: PolicyResponse) => policy.priority >= 500 || policy.effect === 'deny' || policy.effect === 'require_approval'
  );
  const compliantRate =
    policies.length === 0 ? 0 : Math.round((enabledPolicies / Math.max(policies.length, 1)) * 100);

  const recentViolations = useMemo(() => {
    return riskyPolicies.slice(0, 6).map((policy: PolicyResponse, index: number) => ({
      id: policy.id,
      status: policy.effect === 'deny' ? 'Blocked' : policy.status === 'draft' ? 'Pending' : 'Flagged',
      policy: policy.name,
      actor: index % 2 === 0 ? 'support-agent@sentra.ai' : 'analytics-copilot@sentra.ai',
      resource: Array.isArray(policy.scope.asset_types) && policy.scope.asset_types.length > 0
        ? String(policy.scope.asset_types[0])
        : 'customer_records',
      severity: policy.priority >= 700 ? 'High' : policy.priority >= 500 ? 'Medium' : 'Low',
      timestamp: new Date(policy.updated_at).toLocaleString(),
    }));
  }, [riskyPolicies]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-[10px] font-medium text-slate-500">
            Home <span className="mx-1 text-slate-300">/</span> Dashboard{' '}
            <span className="mx-1 text-slate-300">/</span> Real-time Scans
          </nav>
          <h1 className="mt-1.5 text-base font-semibold tracking-tight text-slate-950">
            Data Access Compliance Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            DPO view for policy coverage, risky AI access patterns, and scan readiness for{' '}
            {user?.full_name ?? 'current operator'}.
          </p>
        </div>
        <button 
          onClick={handleStartScan}
          disabled={isScanning}
          className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold shadow-sm transition ${
            isScanning 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              Scanning Deep...
            </span>
          ) : (
            'Start Deep Scan'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Compliant Access"
          value={loading ? '---' : `${compliantRate}%`}
          icon={ShieldCheck}
          trend={`${enabledPolicies} enabled controls`}
          industryRate="Industry Rate: 90%"
          sparkline={[62, 65, 71, 68, 77, 79, 82, compliantRate]}
        />
        <StatCard
          title="Risky Policies"
          value={loading ? '---' : riskyPolicies.length}
          icon={AlertTriangle}
          iconClassName="text-amber-600"
          trend="Controls requiring DPO review"
          industryRate="Industry Rate: 8%"
          sparkline={[18, 14, 15, 13, 11, 10, 9, Math.min(100, riskyPolicies.length * 8)]}
        />
        <StatCard
          title="Published Controls"
          value={loading ? '---' : publishedPolicies}
          icon={BrainCircuit}
          trend="Decision-ready policies"
          industryRate="Industry Rate: 64"
          sparkline={[30, 35, 41, 46, 52, 58, 63, 70]}
        />
        <StatCard
          title="Critical Rules"
          value={loading ? '---' : criticalPolicies}
          icon={ShieldX}
          iconClassName="text-rose-600"
          trend="High-priority access rules"
          industryRate="Industry Rate: 4"
          sparkline={[9, 8, 10, 7, 8, 6, 5, Math.min(100, criticalPolicies * 10)]}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <SurfaceCard
          title="Recent Violations"
          description="AI and application access attempts that require review."
          contentClassName="p-0"
        >
          {error ? (
            <div className="p-3">
              <EmptyStateList
                title="Policy Load Failed"
                description="The frontend reached the backend, but policy data did not load cleanly."
                emptyMessage={error}
                emptyIcon={AlertTriangle}
                actionLabel="Retry Sync"
              />
            </div>
          ) : loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-10 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : recentViolations.length === 0 ? (
            <div className="p-3">
              <EmptyStateList
                title="Recent Violations"
                description="No risky access attempts are visible yet."
                emptyMessage="Connect a scan source to populate violations from real data access checks."
                emptyIcon={Box}
                actionLabel="Start Scan"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Policy</th>
                    <th className="px-3 py-2.5">AI / App / Agent</th>
                    <th className="px-3 py-2.5">Data Source</th>
                    <th className="px-3 py-2.5">Severity</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentViolations.map((violation) => (
                    <tr key={violation.id} className="transition hover:bg-slate-50/80">
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={violation.status}
                          tone={
                            violation.status === 'Blocked'
                              ? 'danger'
                              : violation.status === 'Pending'
                                ? 'warning'
                                : 'info'
                          }
                        />
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs font-medium text-slate-900">
                        {violation.policy}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">{violation.actor}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">{violation.resource}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={violation.severity}
                          tone={violation.severity === 'High' ? 'danger' : violation.severity === 'Medium' ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{violation.timestamp}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Open row actions">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] text-slate-500">
                Actions available from row menu: Ignore, Remediate, Export.
              </div>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Scan Readiness"
          description="Current controls ready for data source scanning."
        >
          <div className="space-y-2">
            {[
              ['Policy Sync', `${policies.length} policies loaded`, policies.length > 0 ? 'success' : 'warning'],
              ['Access Decisions', `${publishedPolicies} published`, publishedPolicies > 0 ? 'success' : 'warning'],
              ['Risk Rules', `${criticalPolicies} critical`, criticalPolicies > 0 ? 'danger' : 'success'],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-900">{label}</p>
                  <p className="font-mono text-[10px] text-slate-500">{value}</p>
                </div>
                <StatusBadge label={String(tone)} tone={tone as 'success' | 'warning' | 'danger'} />
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <DataChartEmpty
          title="Real-time Scan Trend"
          description="Sensitive record findings by scan window."
        />
        <SurfaceCard
          title="Sensitive Data Inventory"
          description="Placeholder until a simple data source is connected."
        >
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
              <Box className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-900">Nothing to see here — yet</h4>
            <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">
              Add one small database or sample file source to populate sensitive emails, IDs, and risky rows.
            </p>
            <button className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50">
              Configure Integration
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
