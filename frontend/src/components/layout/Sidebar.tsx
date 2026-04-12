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
import { Link } from 'react-router-dom';
import { SidebarItem } from '../ui/SidebarItem';

const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'Inventory', href: '/app/inventory', icon: Box },
  { name: 'Observability', href: '/app/observability', icon: Activity },
  { name: 'Risk Center', href: '/app/risk', icon: ShieldAlert },
  { name: 'Audit Log', href: '/app/audit', icon: History },
  { name: 'Governance', href: '/app/governance', icon: FileSignature },
  { name: 'Board Review', href: '/app/board-review', icon: Presentation },
];

export function Sidebar() {
  return (
    <div className="w-64 flex-shrink-0 bg-slate-950/45 border-r border-white/10 h-full hidden md:flex flex-col shadow-2xl shadow-slate-950/30 backdrop-blur-xl z-20">
      {/* Logo Area */}
      <div className="p-8 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all">
            <span className="font-black text-xl italic">S</span>
          </div>
          <span className="text-xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors">
            SENTRA AI
          </span>
        </Link>
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar flex flex-col gap-1.5">
        <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Main Menu</p>
        {navigation.map((item) => (
          <SidebarItem key={item.name} name={item.name} href={item.href} icon={item.icon} />
        ))}
      </div>
      
      {/* Persistent Bottom Profile */}
      <div className="p-4 border-t border-white/8 bg-slate-950/25">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 hover:shadow-sm cursor-pointer transition-all">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center text-cyan-200 shadow-inner shadow-white/10">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">Faazil Zia</p>
            <p className="text-xs text-slate-400 truncate">Enterprise Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
