import KPICard from '@/components/dashboard/KPICard';
import AIRegistryTable from '@/components/dashboard/AIRegistryTable';
import ActiveAlertsPanel from '@/components/dashboard/ActiveAlertsPanel';
import ComplianceTracker from '@/components/dashboard/ComplianceTracker';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import RiskDistributionCard from '@/components/dashboard/RiskDistributionCard';

export default function Dashboard() {
  // Production Shell: Components are wired to handle null/empty states by default
  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
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
           <ActiveAlertsPanel data={[]} isLoading={false} />
        </div>
      </div>

      {/* Row 3: Compliance, Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
           <ComplianceTracker data={[]} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
           <RecentActivityFeed data={[]} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
           <RiskDistributionCard data={[]} isLoading={false} />
        </div>
      </div>
    </div>
  );
}
