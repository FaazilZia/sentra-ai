import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  collapsed?: boolean;
  indicator?: "dot" | "badge";
  indicatorValue?: number;
}

export function SidebarItem({ name, href, icon: Icon, collapsed = false, indicator, indicatorValue }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      to={href}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-200",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      )}
      title={collapsed ? name : undefined}
    >
      <div className="flex items-center">
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-all duration-200",
            !collapsed && "mr-3",
            isActive ? "text-cyan-400" : "group-hover:text-cyan-300"
          )}
          aria-hidden="true"
        />
        {!collapsed ? name : <span className="sr-only">{name}</span>}
      </div>

      {/* Indicators */}
      {!collapsed && indicator === "dot" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {!collapsed && indicator === "badge" && indicatorValue !== undefined && (
        <span className="flex items-center justify-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/20">
          {indicatorValue > 99 ? '99+' : indicatorValue}
        </span>
      )}
      
      {collapsed && indicator && (
        <span className={cn(
          "absolute right-1 top-1 h-2 w-2 rounded-full",
          indicator === "dot" ? "bg-emerald-500" : "bg-rose-500"
        )} />
      )}
    </NavLink>
  );
}
