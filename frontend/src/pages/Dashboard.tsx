import KPICard from '@/components/dashboard/KPICard';
import AIRegistryTable from '@/components/dashboard/AIRegistryTable';
import ActiveAlertsPanel from '@/components/dashboard/ActiveAlertsPanel';
import ComplianceTracker from '@/components/dashboard/ComplianceTracker';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import RiskDistributionCard from '@/components/dashboard/RiskDistributionCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { data, loading } = useDashboardData();

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {/* Row 1: KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Total AI Systems" 
          value={data?.kpis?.modelsBlockedToday?.value || "0"} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Open Risk Findings" 
          value={data?.kpis?.criticalViolations?.value || "0"} 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Compliance Coverage" 
          value={`${data?.kpis?.complianceScore?.value || "0"}%`}
          icon="compliance" 
          status="success" 
        />
        <KPICard 
          label="Shadow AI Detected" 
          value="0" 
          icon="shadow" 
          status="danger" 
        />
      </div>

      {/* Row 2: Registry & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
           <AIRegistryTable data={data?.violations || []} isLoading={loading} />
        </div>
        <div className="lg:col-span-4">
           <ActiveAlertsPanel data={data?.alerts || []} isLoading={loading} />
        </div>
      </div>

      {/* Row 3: Compliance, Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
           <ComplianceTracker data={[]} isLoading={loading} />
        </div>
        <div className="lg:col-span-4">
           <RecentActivityFeed data={[]} isLoading={loading} />
        </div>
        <div className="lg:col-span-4">
           <RiskDistributionCard data={[]} isLoading={loading} />
        </div>
      </div>
    </div>
  );
}
