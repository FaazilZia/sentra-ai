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
  Radio,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'Connect', href: '/app/connect', icon: Zap },
  { name: 'Security Feed', href: '/app/security', icon: Radio },
  { name: 'Inventory', href: '/app/inventory', icon: Box },
  { name: 'Observability', href: '/app/observability', icon: Activity },
  { name: 'Risk Center', href: '/app/risk', icon: ShieldAlert },
  { name: 'Audit Proof', href: '/app/audit', icon: History },
  { name: 'Governance', href: '/app/governance', icon: FileSignature },
  { name: 'Privacy & Consent', href: '/app/privacy', icon: ShieldCheck },
  { name: 'Board Review', href: '/app/board-review', icon: Presentation },
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
        'relative z-20 hidden h-full flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 shadow-xl transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="border-b border-slate-800 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="logowrap logo-container flex items-center justify-center flex-shrink-0">
            <svg className="logo-svg w-[32px] h-[38px]" viewBox="13 8 65 75" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="63" y1="20" x2="45" y2="12" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="45" y1="12" x2="27" y2="20" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="27" y1="20" x2="22" y2="38" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="22" y1="38" x2="45" y2="46" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="45" y1="46" x2="68" y2="55" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="68" y1="55" x2="63" y2="72" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="63" y1="72" x2="45" y2="79" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
              <line x1="45" y1="79" x2="27" y2="72" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>

              <circle className="n1" cx="63" cy="20" r="4.5" fill="#F59E0B"/>
              <circle cx="45" cy="12" r="3" fill="#F59E0B" opacity="0.65"/>
              <circle className="n2" cx="27" cy="20" r="3.8" fill="#F59E0B" opacity="0.85"/>
              <circle cx="22" cy="38" r="2.8" fill="#F59E0B" opacity="0.6"/>
              <circle cx="45" cy="46" r="5.5" fill="#FFFFFF"/>
              <circle cx="45" cy="46" r="2.5" fill="#F59E0B"/>
              <circle cx="68" cy="55" r="2.8" fill="#F59E0B" opacity="0.6"/>
              <circle className="n3" cx="63" cy="72" r="3.8" fill="#F59E0B" opacity="0.85"/>
              <circle cx="45" cy="79" r="3" fill="#F59E0B" opacity="0.65"/>
              <circle className="n4" cx="27" cy="72" r="4.5" fill="#F59E0B"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="logo-text flex flex-col pt-1 min-w-0">
              <div className="flex items-baseline gap-1" style={{ lineHeight: 1.1 }}>
                <span className="font-sans text-[20px] font-light tracking-[0.1em] text-white uppercase">Sentra</span>
                <span className="font-sans text-[20px] font-bold text-[#F59E0B]">AI</span>
              </div>
              <div className="text-[7.5px] font-light tracking-[0.2em] text-white/40 uppercase mt-0.5">
                Intelligent at the center
              </div>
            </div>
          )}
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
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 bottom-24 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
