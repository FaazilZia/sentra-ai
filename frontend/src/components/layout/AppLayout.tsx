import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AtomBackground } from '../ui/AtomBackground';
import { CopilotDrawer } from '../ui/CopilotDrawer';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-slate-900 selection:bg-slate-900/10">
      <AtomBackground />
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-5 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
      
      {/* Global AI Copilot Overlay - This is the NEW stable one */}
      <CopilotDrawer />
    </div>
  );
}
