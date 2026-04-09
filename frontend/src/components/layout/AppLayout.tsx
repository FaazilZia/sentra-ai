import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-transparent text-slate-100 selection:bg-cyan-400/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.10),transparent_20%)]" />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      <div className="fixed right-6 top-24 z-50 hidden animate-[float_5s_ease-in-out_infinite] xl:block">
        <div className="flex w-80 items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-slate-100 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-inner shadow-white/10 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Control plane initialized</p>
            <p className="mt-1 text-xs text-slate-400">
              Workspace is ready. Policy, telemetry, and approval layers can now plug into this UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
