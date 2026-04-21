import {
  LayoutDashboard,
  Activity,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Gavel,
  ShieldCheck,
  Shield,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'AI Activity Logs', href: '/app/activity-logs', icon: Activity },
  { name: 'Compliance', href: '/app/compliance', icon: Gavel },
  { name: 'Policies', href: '/app/governance', icon: ShieldCheck },
  { name: 'AI Guardrails', href: '/app/guardrails', icon: Shield },
  { name: 'Audit Proof', href: '/app/audit-proof', icon: FileText },
  { name: 'Alerts / Overrides', href: '/app/security', icon: Radio },
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
        'relative z-20 hidden h-full flex-shrink-0 flex-col border-r border-white/5 bg-slate-950 text-slate-400 transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-white">
            <span className="text-lg font-black italic">S</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-black tracking-tight text-white uppercase">Sentra AI</span>
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Governance OS</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
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

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-900 border border-white/5 text-slate-500">
            <User className="w-4 h-4" />
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white uppercase tracking-tighter">
                {user?.full_name ?? 'User'}
              </p>
              <p className="truncate text-[9px] text-slate-600 font-medium">{user?.email ?? 'No email'}</p>
            </div>
          ) : null}
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-400 hover:text-white transition-all shadow-lg"
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>
    </aside>
  );
}
