import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Activity, 
  ShieldAlert, 
  History, 
  FileSignature, 
  Presentation,
  User
} from 'lucide-react';
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
  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 h-full hidden md:flex flex-col shadow-sm z-20">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-[17px] tracking-tight text-slate-900">Sentra AI</span>
        </div>
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar flex flex-col gap-1.5">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Main Menu</p>
        {navigation.map((item) => (
          <SidebarItem key={item.name} name={item.name} href={item.href} icon={item.icon} />
        ))}
      </div>
      
      {/* Persistent Bottom Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm cursor-pointer transition-all">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">Faazil Zia</p>
            <p className="text-xs text-slate-500 truncate">Enterprise Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
