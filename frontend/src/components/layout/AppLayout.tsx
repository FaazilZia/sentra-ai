import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AtomBackground } from '../ui/AtomBackground';

export function AppLayout() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 selection:bg-cyan-500/20">
      <AtomBackground />
      <Sidebar collapsed={false} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-5 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
