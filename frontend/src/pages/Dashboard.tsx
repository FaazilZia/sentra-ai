import React from 'react';
import { BrainCircuit, ShieldCheck, AlertOctagon, Activity, ShieldAlert } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { DataChartEmpty } from '../components/ui/DataChartEmpty';
import { EmptyStateList } from '../components/ui/EmptyStateList';

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Governance Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time risk posture and operational metrics for all autonomous systems.</p>
      </div>

      {/* 4-column Stats Row with Empty Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Active Agents" 
          icon={BrainCircuit} 
        />
        <StatCard 
          title="Compliance Score" 
          icon={ShieldCheck} 
        />
        <StatCard 
          title="Avg Risk Index" 
          icon={AlertOctagon} 
        />
        <StatCard 
          title="AI Spend (MTD)" 
          icon={Activity} 
        />
      </div>

      {/* 2-column Main Body (Chart Left, Priorities Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Main Chart Area */}
        <DataChartEmpty 
          title="Risk Event Trendline" 
          description="Volume of policy violations and guardrail interventions over the last 30 days."
        />

        {/* High Priority List (Empty State) */}
        <div className="col-span-1 border-0 h-full flex flex-col">
          <EmptyStateList 
            title="Critical Action Required"
            description="Incidents pending immediate human review."
            emptyMessage="No active incidents detected. All guardrails are enforcing correctly."
            emptyIcon={ShieldAlert}
          />
        </div>

      </div>
    </div>
  );
}
