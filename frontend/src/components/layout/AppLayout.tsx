import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden relative selection:bg-cyan-400/20 bg-transparent text-slate-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Welcome Toast Overlay */}
      <div className="fixed top-20 right-6 z-50 animate-[bounce_1s_ease-in-out_1] duration-500 delay-300">
        <div className="bg-slate-950/55 border border-white/10 text-slate-100 shadow-2xl shadow-cyan-950/30 rounded-xl p-4 flex items-start gap-3 w-80 backdrop-blur-xl">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner shadow-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold">System Initialized</p>
            <p className="text-xs text-slate-400 mt-1">Platform ready. Awaiting data source connection.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
