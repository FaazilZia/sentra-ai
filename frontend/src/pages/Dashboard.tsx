import KPICard from '@/components/dashboard/KPICard';
import AIRegistryTable from '@/components/dashboard/AIRegistryTable';
import ActiveAlertsPanel from '@/components/dashboard/ActiveAlertsPanel';
import ComplianceTracker from '@/components/dashboard/ComplianceTracker';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import RiskDistributionCard from '@/components/dashboard/RiskDistributionCard';
import { useEffect, useState } from 'react';
import { fetchPolicies, apiRequest } from '@/lib/api';
import { ArrowRight, ShieldCheck, Sparkles, ShieldAlert, Play, X, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocketStore } from '@/store/useSocketStore';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/useStore';

export default function Dashboard() {
  const [policiesCount, setPoliciesCount] = useState<number | null>(null);
  const { alerts } = useSocketStore();
  const { user } = useAuth();
  const addToast = useStore((s) => s.addToast);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [systems, setSystems] = useState<any[]>([]);
  const [systemsCount, setSystemsCount] = useState<number | null>(null);
  const [shadowCount, setShadowCount] = useState<number | null>(null);
  const [complianceStats, setComplianceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPolicies().then(policies => setPoliciesCount(policies.length)).catch(() => setPoliciesCount(0));

    Promise.all([
      apiRequest<any>('/ai/dashboard-stats').then(setDashboardStats).catch((err) => console.error('Dashboard Stats Error:', err)),
      apiRequest<any>('/ai-systems').then(data => {
        const items = data?.items || [];
        setSystems(items);
        setSystemsCount(items.length);
      }).catch((err) => console.error('Systems Error:', err)),
      apiRequest<any>('/shadow-ai/detections').then(data => setShadowCount(data?.unauthorizedToolsCount || 0)).catch((err) => console.error('Shadow AI Error:', err)),
      apiRequest<any>('/compliance/stats').then(setComplianceStats).catch((err) => console.error('Compliance Stats Error:', err))
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const isDemoOrg = user?.organizationName?.toLowerCase().includes('demo');
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const handleSimulate = async (scenario: string) => {
    setSimulating(true);
    try {
      await apiRequest('/demo/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ scenario })
      });
      addToast({ 
        message: `Attack scenario simulated successfully! Directing you to the Live Block Feed...`, 
        type: 'success' 
      });
      setIsModalOpen(false);
      // Wait a moment for socket events to begin processing, then redirect to feed
      setTimeout(() => {
        navigate('/app/live-feed');
      }, 1000);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to simulate attack', type: 'error' });
    } finally {
      setSimulating(false);
    }
  };

  const getRiskDistribution = () => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    systems.forEach((sys: any) => {
      const tier = (sys.risk_tier || 'LOW').toUpperCase();
      if (tier in counts) {
        counts[tier as keyof typeof counts]++;
      } else {
        counts['LOW']++;
      }
    });

    return [
      { label: 'Critical', count: counts.CRITICAL, color: '#f43f5e', text: '#ffffff' },
      { label: 'High', count: counts.HIGH, color: '#f97316', text: '#ffffff' },
      { label: 'Medium', count: counts.MEDIUM, color: '#eab308', text: '#000000' },
      { label: 'Low', count: counts.LOW, color: '#10b981', text: '#ffffff' }
    ].filter(c => c.count > 0);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 relative min-h-screen pb-24 text-gray-200">
      {/* Demo Warning Banner */}
      {isDemoOrg && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-200 shadow-md">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
          <div className="text-xs">
            <span className="font-black uppercase tracking-wider block mb-0.5">⚡ Demo Environment Active</span>
            Sentraa AI is running in sandbox mode for <span className="font-bold text-white">{user?.organizationName}</span>. Metrics represent simulated pipeline events. Use the floating simulation controller to inject threats.
          </div>
        </div>
      )}

      {/* Onboarding Banner */}
      {policiesCount !== null && policiesCount <= 1 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--royal-indigo)] to-[var(--mid-indigo)] p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-lg bg-white/20 p-2.5 backdrop-blur-md">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Initialize Governance Pipeline</h2>
                <p className="mt-1 text-sm font-medium text-indigo-100 max-w-xl">
                  Your workspace is currently protected by the <span className="font-bold text-white">Default Governance Blueprint</span>. 
                  Deploy your first custom policy to tailor risk thresholds for your organization's specific AI stack.
                </p>
              </div>
            </div>
            <Link 
              to="/app/policies"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-[var(--royal-indigo)] transition-all hover:bg-indigo-50 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              Configure Policy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-indigo-400/20 blur-3xl" />
          <Sparkles className="absolute right-12 top-6 h-12 w-12 text-white/5" />
        </div>
      )}

      {/* Row 1: KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Total AI Systems" 
          value={systemsCount !== null ? systemsCount.toString() : "0"} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Open Risk Findings" 
          value={dashboardStats?.kpis?.criticalViolations?.value !== undefined ? dashboardStats.kpis.criticalViolations.value.toString() : "0"} 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Compliance Coverage" 
          value={dashboardStats?.kpis?.complianceScore?.value !== undefined ? `${dashboardStats.kpis.complianceScore.value}%` : "100%"} 
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Shadow AI Detected" 
          value={shadowCount !== null ? shadowCount.toString() : "0"} 
          icon="shadow" 
          status="danger" 
        />
      </div>

      {/* Row 2: Registry & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
           <AIRegistryTable 
             data={systems.map((item: any) => ({
               id: item.id,
               name: item.name,
               type: item.vendor || 'Custom',
               owner: item.owner?.full_name || 'Unassigned',
               riskScore: item.risk_tier === 'CRITICAL' ? 95 : item.risk_tier === 'HIGH' ? 75 : item.risk_tier === 'MEDIUM' ? 50 : 25,
               status: item.status === 'ACTIVE' ? 'ACTIVE' : item.status === 'UNDER_REVIEW' ? 'PENDING' : 'BLOCKED'
             }))} 
             isLoading={loading} 
           />
        </div>
        <div className="lg:col-span-4">
           <ActiveAlertsPanel data={alerts} isLoading={loading} />
        </div>
      </div>

      {/* Row 3: Compliance, Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
           <ComplianceTracker 
             data={(complianceStats?.frameworks || []).map((fw: any) => ({
               name: fw.name,
               progress: fw.score || 0,
               status: (fw.score || 0) >= 90 ? 'Compliant' : 'Needs Review'
             }))} 
             isLoading={loading} 
           />
        </div>
        <div className="lg:col-span-4">
           <RecentActivityFeed isLoading={loading} />
        </div>
        <div className="lg:col-span-4">
           <RiskDistributionCard data={getRiskDistribution()} isLoading={loading} />
        </div>
      </div>

      {/* Floating Simulate Attack Button - visible to ADMIN only */}
      {isAdmin && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 duration-200 border border-amber-500/20 ring-4 ring-red-950/20"
        >
          <Zap className="h-4 w-4 text-amber-200 animate-bounce" />
          Simulate Threat
        </button>
      )}

      {/* Scenario Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border border-gray-800 text-gray-400 hover:text-white bg-gray-900/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Simulate Security Threat
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Inject malicious AI requests into Sentraa's activity logging framework. These events will propagate in real time across the Live Block Feed and incident dashboards.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleSimulate('data_exfiltration')}
                disabled={simulating}
                className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-850 hover:border-red-500/30 rounded-2xl text-left transition-all active:scale-98 group"
              >
                <div>
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block mb-0.5">Bulk Data Exfiltration</span>
                  <span className="text-[10px] text-gray-500 block leading-tight">Shadow agent attempts bulk extraction of user SSNs without masking constraints.</span>
                </div>
                <Play className="h-4 w-4 text-gray-500 group-hover:text-red-400 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleSimulate('prompt_injection')}
                disabled={simulating}
                className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-850 hover:border-amber-500/30 rounded-2xl text-left transition-all active:scale-98 group"
              >
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-0.5">Prompt Injection Bypass</span>
                  <span className="text-[10px] text-gray-500 block leading-tight">Adversarial system-reset commands designed to bypass default system prompt jailbreaks.</span>
                </div>
                <Play className="h-4 w-4 text-gray-500 group-hover:text-amber-400 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleSimulate('unauthorized_agent')}
                disabled={simulating}
                className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-850 hover:border-orange-500/30 rounded-2xl text-left transition-all active:scale-98 group"
              >
                <div>
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider block mb-0.5">Rogue Shadow AI Agent</span>
                  <span className="text-[10px] text-gray-500 block leading-tight">An unverified agent token attempts workspace-wide system configurations.</span>
                </div>
                <Play className="h-4 w-4 text-gray-500 group-hover:text-orange-400 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleSimulate('general')}
                disabled={simulating}
                className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-850 hover:border-indigo-500/30 rounded-2xl text-left transition-all active:scale-98 group"
              >
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block mb-0.5">General Threat Burst</span>
                  <span className="text-[10px] text-gray-500 block leading-tight">Trigger a standard mix of credential harvesting blocks and transaction limit violations.</span>
                </div>
                <Play className="h-4 w-4 text-gray-500 group-hover:text-indigo-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
