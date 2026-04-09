import {
  LayoutDashboard,
  Box,
  Activity,
  ShieldAlert,
  History,
  FileSignature,
  Presentation,
  User,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Box },
  { name: 'Observability', href: '/observability', icon: Activity },
  { name: 'Risk Center', href: '/risk', icon: ShieldAlert },
  { name: 'Audit Log', href: '/audit', icon: History },
  { name: 'Governance', href: '/governance', icon: FileSignature },
  { name: 'Board Review', href: '/board-review', icon: Presentation },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <div className="z-20 hidden h-full w-72 flex-shrink-0 flex-col border-r border-white/10 bg-slate-950/55 shadow-2xl shadow-slate-950/30 backdrop-blur-xl md:flex">
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.2),rgba(250,204,21,0.18))] shadow-lg shadow-cyan-950/20">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <div>
            <span className="block font-semibold text-[17px] tracking-tight text-slate-100">Sentra AI</span>
            <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Governance OS
            </span>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100/70">
          Current focus
        </p>
        <p className="mt-2 text-sm font-medium text-white">Enterprise AI trust orchestration</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Policies, telemetry, and approvals brought into one operator view.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar flex flex-col gap-1.5">
        <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Main Menu
        </p>
        {navigation.map((item) => (
          <SidebarItem key={item.name} name={item.name} href={item.href} icon={item.icon} />
        ))}
      </div>

      <div className="p-4 border-t border-white/8 bg-slate-950/25">
        <div className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 transition-all hover:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-cyan-200 shadow-inner shadow-white/10 backdrop-blur-md">
            <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">
                {user?.full_name ?? 'Signed In User'}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email ?? 'No email loaded'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-400">
            <span>Workspace</span>
            <span className="font-medium text-emerald-300">Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
