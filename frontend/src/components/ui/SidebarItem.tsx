import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
}

export function SidebarItem({ name, href, icon: Icon }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      to={href}
      className={cn(
        "group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-in-out",
        isActive
          ? "bg-white/10 border border-white/10 text-slate-50 shadow-lg shadow-cyan-950/10 backdrop-blur-md"
          : "text-slate-400 hover:bg-white/6 hover:text-slate-100 border border-transparent hover:border-white/8"
      )}
    >
      <Icon
        className={cn(
          "mr-3 flex-shrink-0 h-[18px] w-[18px] transition-all duration-300 ease-in-out",
          isActive ? "text-cyan-200" : "group-hover:scale-110 group-hover:text-slate-100"
        )}
        aria-hidden="true"
      />
      {name}
    </NavLink>
  );
}
