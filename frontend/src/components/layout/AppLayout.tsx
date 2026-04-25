import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AtomBackground } from '../ui/AtomBackground';
import { GlobalControlPanel } from '../executive/GlobalControlPanel';
import { fetchExecutiveOverview, ExecutiveOverview } from '../../lib/api';

export function AppLayout() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchExecutiveOverview().then(setOverview).catch(console.error);
    const interval = setInterval(() => {
      fetchExecutiveOverview().then(setOverview).catch(console.error);
    }, 30000); // Polling every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#0a0f1a] text-slate-100 selection:bg-cyan-500/20">
      <AtomBackground />
      <Sidebar collapsed={false} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        {overview && (
          <GlobalControlPanel 
            scanningMode={overview.controls.scanningMode}
            budgetStatus={overview.auditSummary.budgetUsed >= overview.auditSummary.budgetLimit ? 'paused' : 'within_limits'}
            systemStatus={overview.systemMode === 'autonomous' ? 'active' : (overview.systemMode === 'restricted' ? 'throttled' : 'active')}
            authority={overview.controls.authority}
          />
        )}
        <main className="flex-1 overflow-auto p-0 custom-scrollbar bg-[#0a0f1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
