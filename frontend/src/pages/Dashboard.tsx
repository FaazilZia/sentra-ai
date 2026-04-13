import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Box,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { DataChartEmpty } from '../components/ui/DataChartEmpty';
import { EmptyStateList } from '../components/ui/EmptyStateList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { fetchPolicies, PolicyResponse, triggerScan, fetchScanStatus, fetchIncidents, updateIncidentStatus, IncidentResponse } from '../lib/api';
import { CircleCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
   const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

   const loadData = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [policiesRes, incidentsRes] = await Promise.all([
        fetchPolicies(accessToken),
        fetchIncidents(accessToken, 6, 'unresolved')
      ]);
      setPolicies(policiesRes.items);
      setIncidents(incidentsRes.items);
      setError(null);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unable to load platform data';
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
      const response = await triggerScan(accessToken);
      const taskId = response.task_id;
      
      // Polling logic to wait for real backend completion
      let isDone = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      
      while (!isDone && attempts < maxAttempts) {
        const statusResponse = await fetchScanStatus(taskId, accessToken);
        
        if (statusResponse.status === 'SUCCESS') {
          isDone = true;
          await loadData();
          alert(`Deep Scan complete! ${statusResponse.result?.incidents_detected || 0} incidents have been detected and logged.`);
        } else if (['FAILURE', 'REVOKED'].includes(statusResponse.status)) {
          throw new Error(`Scan process failed on server (${statusResponse.status})`);
        } else {
          // Wait 1 second before next poll
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      if (!isDone) {
        alert('Scan is still processing in the background. Results will appear in the Security Feed shortly.');
      }
    } catch (err) {
      alert('Scan failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleAction = async (id: string, newStatus: string) => {
    if (!accessToken) return;
    setIsActing(id);
    try {
      await updateIncidentStatus(accessToken, id, newStatus);
      await loadData();
      if (newStatus === 'blocked') {
        alert('Security Policy updated: The offending agent access has been restricted.');
      }
    } catch (err) {
      alert('Failed to update incident: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsActing(null);
    }
  };

  const publishedPolicies = policies.filter((p) => p.status === 'published').length;
  const enabledPolicies = policies.filter((p) => p.enabled).length;
  const criticalPolicies = policies.filter((p) => p.priority >= 500).length;
  const riskyPolicies = policies.filter(
    (p) => p.priority >= 500 || p.effect === 'deny' || p.effect === 'require_approval'
  );
  const compliantRate =
    policies.length === 0 ? 0 : Math.round((enabledPolicies / Math.max(policies.length, 1)) * 100);

  const processedIncidents = useMemo(() => {
    return incidents.map((inc) => ({
      id: inc.id,
      status: inc.status === 'unresolved' ? 'Flagged' : inc.status.charAt(0).toUpperCase() + inc.status.slice(1),
      agent: inc.agent_id,
      details: inc.details,
      severity: inc.severity >= 80 ? 'High' : inc.severity >= 50 ? 'Medium' : 'Low',
      timestamp: new Date(inc.created_at).toLocaleTimeString(),
      isAiDetected: inc.metadata?.ai_insight === true,
    }));
  }, [incidents]);

  const inventoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      const type = (inc.metadata as any)?.pii_type || 'General Risk';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value]) => ({
        label,
        value,
        tone: value > 5 ? 'danger' : value > 2 ? 'warning' : 'success'
      }));
  }, [incidents]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-[10px] font-medium text-slate-500">
            Home <span className="mx-1 text-slate-300">/</span> Dashboard{' '}
            <span className="mx-1 text-slate-300">/</span> Real-time Scans
          </nav>
          <h1 className="mt-1.5 text-base font-semibold tracking-tight text-slate-950">
            Governance Control Tower
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
              <Loader2 className="h-3 w-3 animate-spin" />
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
              <h3 className="text-sm font-bold text-slate-900">Policy Sync Issues</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Sentra AI reached the frontend, but the governance engine data did not load. 
                <span className="block mt-2 font-semibold text-indigo-600 italic">Tip: Check if your Render backend is cold-starting or verify VITE_API_BASE_URL in Vercel.</span>
              </p>
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
          ) : incidents.length === 0 ? (
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
                    <th className="px-3 py-2.5">Agent / Actor</th>
                    <th className="px-3 py-2.5">Violation Details</th>
                    <th className="px-3 py-2.5">Severity</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedIncidents.map((inc) => (
                    <tr key={inc.id} className={`transition hover:bg-slate-50/80 ${isActing === inc.id ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={inc.status}
                          tone={
                            inc.status === 'Blocked'
                              ? 'danger'
                              : inc.status === 'Resolved'
                                ? 'success'
                                : 'warning'
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {inc.isAiDetected && <span title="AI-Detected Risk Insight">✨</span>}
                          {inc.agent}
                        </div>
                      </td>
                      <td className="max-w-[300px] truncate px-3 py-2.5 font-medium text-slate-600">
                        {inc.details}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={inc.severity}
                          tone={inc.severity === 'High' ? 'danger' : inc.severity === 'Medium' ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{inc.timestamp}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(inc.id, 'resolved')}
                            disabled={!!isActing}
                            title="Resolve Incident"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-green-600 shadow-sm transition hover:bg-green-50"
                          >
                            <CircleCheck className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleAction(inc.id, 'blocked')}
                            disabled={!!isActing}
                            title="Block Agent/Access"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-rose-600 shadow-sm transition hover:bg-rose-50"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] text-slate-500">
                Action Center: Resolve dismisses the alert, Block restricts the associated agent access.
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
          description="Live findings from the last infrastructure scan."
        >
          {inventoryCounts.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                <Box className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs text-slate-500">No inventory found. Run a scan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryCounts.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{item.label}</h5>
                    <p className="text-[10px] text-slate-500">Detected in active sources</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    <div className={`mt-1 h-1.5 w-12 rounded-full overflow-hidden bg-slate-100`}>
                      <div 
                        className={`h-full rounded-full ${
                          item.tone === 'danger' ? 'bg-rose-500' : 
                          item.tone === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                        }`} 
                        style={{ width: `${Math.min(100, (item.value / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={handleStartScan}
                className="w-full mt-2 rounded-lg border border-slate-200 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Scan for more
              </button>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
