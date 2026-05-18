import KPICard from '@/components/dashboard/KPICard';
import AIRegistryTable from '@/components/dashboard/AIRegistryTable';
import ActiveAlertsPanel from '@/components/dashboard/ActiveAlertsPanel';
import ComplianceTracker from '@/components/dashboard/ComplianceTracker';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import RiskDistributionCard from '@/components/dashboard/RiskDistributionCard';
import { useEffect, useState } from 'react';
import { fetchPolicies } from '@/lib/api';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSocketStore } from '@/store/useSocketStore';

export default function Dashboard() {
  const [policiesCount, setPoliciesCount] = useState<number | null>(null);
  const { activities, alerts } = useSocketStore();

  useEffect(() => {
    fetchPolicies().then(policies => setPoliciesCount(policies.length)).catch(() => setPoliciesCount(0));
  }, []);

  // Production Shell: Components are wired to handle null/empty states by default
  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
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
          value="--" 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Open Risk Findings" 
          value="--" 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Compliance Coverage" 
          value="--" 
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Shadow AI Detected" 
          value="--" 
          icon="shadow" 
          status="danger" 
        />
      </div>

      {/* Row 2: Registry & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
           <AIRegistryTable data={[]} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
           <ActiveAlertsPanel data={alerts} isLoading={false} />
        </div>
      </div>

      {/* Row 3: Compliance, Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
           <ComplianceTracker data={[]} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
           <RecentActivityFeed data={activities} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
           <RiskDistributionCard data={[]} isLoading={false} />
        </div>
      </div>
    </div>
  );
}
