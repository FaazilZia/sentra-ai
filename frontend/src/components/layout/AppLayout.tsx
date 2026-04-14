import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Particles } from '../ui/Particles';
import { CopilotDrawer } from '../ui/CopilotDrawer';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 selection:bg-cyan-500/20">
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={['#0ea5e9', '#8b5cf6', '#a855f7']}
          particleCount={300}
          particleSpread={15}
          speed={0.08}
          particleBaseSize={120}
          moveParticlesOnHover={true}
          particleHoverFactor={1.2}
          alphaParticles
          disableRotation={false}
        />
      </div>
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
