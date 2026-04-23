import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AtomBackground } from '../ui/AtomBackground';
import { GlobalControlPanel } from '../executive/GlobalControlPanel';
import { fetchExecutiveOverview, ExecutiveOverview } from '../../lib/api';

export function AppLayout() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);

  useEffect(() => {
    fetchExecutiveOverview().then(setOverview).catch(console.error);
    const interval = setInterval(() => {
      fetchExecutiveOverview().then(setOverview).catch(console.error);
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 selection:bg-cyan-500/20">
      <AtomBackground />
      <Sidebar collapsed={false} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        {overview && (
          <GlobalControlPanel 
            scanningMode={overview.controls.scanningMode}
            budgetStatus={overview.auditSummary.budgetUsed >= overview.auditSummary.budgetLimit ? 'paused' : 'within_limits'}
            systemStatus={overview.systemMode === 'autonomous' ? 'active' : (overview.systemMode === 'restricted' ? 'throttled' : 'active')}
            authority={overview.controls.authority}
          />
        )}
        <main className="flex-1 overflow-auto p-5 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
