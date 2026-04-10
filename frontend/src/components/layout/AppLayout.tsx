import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CopilotChat } from '../ui/CopilotChat';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-slate-900 selection:bg-slate-900/10">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-5 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
      
      {/* Global AI Copilot Overlay */}
      <CopilotChat />
    </div>
  );
}
