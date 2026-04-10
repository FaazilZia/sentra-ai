import {
  LayoutDashboard,
  Box,
  Activity,
  ShieldAlert,
  History,
  FileSignature,
  Presentation,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Box },
  { name: 'Observability', href: '/observability', icon: Activity },
  { name: 'Risk Center', href: '/risk', icon: ShieldAlert },
  { name: 'Audit Log', href: '/audit', icon: History },
  { name: 'Governance', href: '/governance', icon: FileSignature },
  { name: 'Board Review', href: '/board-review', icon: Presentation },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        'z-20 hidden h-full flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 shadow-xl transition-all duration-300 md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">
              S
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <span className="block truncate text-[15px] font-semibold tracking-tight text-white">
                  Sentra AI
                </span>
                <span className="block truncate text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Compliance OS
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {!collapsed ? (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Main Menu
          </p>
        ) : null}
        {navigation.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
            <User className="w-4 h-4" />
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">
                {user?.full_name ?? 'Signed In User'}
              </p>
                <p className="truncate text-[11px] text-slate-500">{user?.email ?? 'No email loaded'}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
