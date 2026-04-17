import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CopilotDrawer } from '../ui/CopilotDrawer';
import { motion } from 'framer-motion';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)] selection:bg-cyan-500/20 transition-colors duration-300">
      {/* Varonis Background Layers */}
      <div className="varonis-bg" />
      <div className="varonis-mesh" />
      
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-5 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      <CopilotDrawer />

      {/* Floating Active Policy Badge - Image 1 Style */}
      <div className="fixed bottom-6 left-24 z-30">
          <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-4 rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 pr-6 backdrop-blur-xl shadow-2xl"
          >
             <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <div className="h-4 w-4 rounded-full border-2 border-white/30 animate-ping absolute" />
                <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)] leading-none">Active Policy</p>
                <p className="mt-1 text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Auto-mitigating active...</p>
             </div>
          </motion.div>
      </div>
    </div>
  );
}
