import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  ClipboardCheck, 
  EyeOff, 
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/app' },
  { icon: ShieldAlert, label: 'Risk Center', path: '/app/risk' },
  { icon: ClipboardCheck, label: 'Compliance', path: '/app/compliance' },
  { icon: EyeOff, label: 'Shadow AI', path: '/app/shadow' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-[var(--sidebar-width)] bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] flex flex-col transition-all duration-300 hidden lg:flex shadow-2xl shadow-black/5">
      {/* Brand Logo */}
      <div className="flex h-[var(--topbar-height)] items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--mid-indigo)] text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-black uppercase tracking-widest text-white">Sentra</span>
            <span className="text-[10px] block font-bold text-[var(--lavender)] uppercase -mt-1 tracking-tighter opacity-70">Governance</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 pt-8">
        <p className="px-4 mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lavender)] opacity-40">Main Interface</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app'}
            className={({ isActive }) => cn(
              "group flex items-center justify-between px-4 py-2.5 rounded transition-all duration-200",
              isActive 
                ? "bg-[var(--mid-indigo)] text-white shadow-md shadow-black/10" 
                : "text-[var(--lavender)] hover:bg-[var(--soft-indigo)] hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                "text-current"
              )} />
              <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
            </div>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-white/5 bg-black/5">
        <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="h-8 w-8 rounded bg-[var(--mid-indigo)] border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">Admin User</p>
            <p className="text-[9px] font-bold text-[var(--lavender)] uppercase opacity-50 truncate">Governance Admin</p>
          </div>
          <LogOut className="h-3.5 w-3.5 text-[var(--lavender)] opacity-40 group-hover:opacity-100 group-hover:text-rose-400 transition-all" />
        </div>
      </div>
    </aside>
  );
}
