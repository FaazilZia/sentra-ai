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
    <div className="w-64 flex-shrink-0 bg-slate-950/45 border-r border-white/10 h-full hidden md:flex flex-col shadow-2xl shadow-slate-950/30 backdrop-blur-xl z-20">
      <div className="h-16 flex items-center px-6 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-lg shadow-cyan-950/20">
            <span className="text-cyan-200 font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-[17px] tracking-tight text-slate-100">Sentra AI</span>
        </div>
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
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 hover:shadow-sm cursor-pointer transition-all">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center text-cyan-200 shadow-inner shadow-white/10">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {user?.full_name ?? 'Signed In User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email ?? 'No email loaded'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
