import { useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  ClipboardCheck,
  EyeOff,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  Box,
  Settings2,
  Activity,
  Bot,
  Building2,
  ListTodo,
  GitPullRequestDraft,
  BarChart3,
  Globe,
  Award,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const operationsItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/app' },
  { icon: FileText, label: 'Policies', path: '/app/policies' },
  { icon: ShieldCheck, label: 'Guardrails', path: '/app/guardrails' },
  { icon: ShieldAlert, label: 'Risk Center', path: '/app/risk' },
  { icon: ClipboardCheck, label: 'Compliance', path: '/app/compliance' },
  { icon: FolderOpen, label: 'Evidence Hub', path: '/app/evidence' },
  { icon: Activity, label: 'Drift Detection', path: '/app/drift' },
  { icon: EyeOff, label: 'Shadow AI', path: '/app/shadow' },
  { icon: Box, label: 'Inventory', path: '/app/inventory' },
];

const governanceItems = [
  { icon: Bot, label: 'AI Registry', path: '/app/ai-registry' },
  { icon: Award, label: 'Risk Audits', path: '/app/risk-assessment' },
  { icon: LayoutKanban, label: 'Impact Boards', path: '/app/impact-assessments' },
  { icon: ShieldCheck, label: 'Controls', path: '/app/controls' },
  { icon: Building2, label: 'Vendor Risk', path: '/app/vendor-risk' },
  { icon: ListTodo, label: 'Obligations', path: '/app/obligations' },
  { icon: GitPullRequestDraft, label: 'Approvals', path: '/app/workflows' },
  { icon: BarChart3, label: 'Executive Report', path: '/app/executive-report' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const userInitials = user?.fullName
    ? user.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
    : 'AD';

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-[var(--sidebar-width)] bg-[#1e293b] backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 hidden lg:flex shadow-2xl shadow-black/5">
      {/* Brand Logo */}
      <div className="flex h-[var(--topbar-height)] items-center px-6 border-b border-white/5 bg-[#0f172a]/20">
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
      <nav className="flex-1 space-y-6 px-3 pt-6 overflow-y-auto custom-scrollbar pb-6">

        {/* Operations Section */}
        <div>
          <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-80">Security Operations</p>
          <div className="space-y-1">
            {operationsItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) => cn(
                  "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                  isActive
                    ? "bg-[#2563eb] text-white shadow-md shadow-black/10"
                    : "text-[var(--lavender)] hover:bg-[#334155]/60 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    "text-current"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </NavLink>
            ))}
          </div>
        </div>

        {/* Governance Section */}
        <div>
          <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 opacity-80">AI Governance</p>
          <div className="space-y-1">
            {governanceItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                  isActive
                    ? "bg-[#8b5cf6] text-white shadow-md shadow-black/10"
                    : "text-[var(--lavender)] hover:bg-[#334155]/60 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    "text-current"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </NavLink>
            ))}
          </div>
        </div>

        {/* System Settings Section */}
        <div>
          <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 opacity-80">System Config</p>
          <div className="space-y-1">
            <NavLink
              to="/app/settings"
              className={({ isActive }) => cn(
                "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                isActive
                  ? "bg-[#64748b] text-white shadow-md shadow-black/10"
                  : "text-[var(--lavender)] hover:bg-[#334155]/60 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings2 className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  "text-current"
                )} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
              </div>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          </div>
        </div>

      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-white/5 bg-[#0f172a]/20">
        <div
          role="button"
          tabIndex={0}
          onClick={handleLogout}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogout(); } }}
          className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="h-8 w-8 rounded bg-[#4f46e5] border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{user?.fullName || 'Admin User'}</p>
            <p className="text-[9px] font-bold text-[var(--lavender)] uppercase opacity-50 truncate">{user?.role || 'Governance Admin'}</p>
          </div>
          <LogOut className="h-3.5 w-3.5 text-[var(--lavender)] opacity-40 group-hover:opacity-100 group-hover:text-rose-400 transition-all" />
        </div>
      </div>
    </aside>
  );
}

