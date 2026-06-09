import { useState } from 'react';
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
  Award,
  FolderOpen,
  Folder,
  Layers,
  Sparkles,
  FlaskConical,
  Globe,
  Scale,
  AlertTriangle,
  Network,
  Cpu,
  Search,
  Compass,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface SidebarItem {
  icon: any;
  label: string;
  path: string;
}

interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    name: 'CORE',
    items: [
      { icon: LayoutDashboard, label: 'Overview', path: '/app' },
      { icon: FileText, label: 'Policies', path: '/app/policies' },
      { icon: ShieldCheck, label: 'Guardrails', path: '/app/guardrails' },
      { icon: Activity, label: 'Live Block Feed', path: '/app/live-feed' },
      { icon: Activity, label: 'Drift Detection', path: '/app/drift' },
      { icon: ShieldAlert, label: 'Risk Center', path: '/app/risk' },
      { icon: Network, label: 'Entity Graph', path: '/app/entity-graph' },
    ]
  },
  {
    name: 'COMPLIANCE',
    items: [
      { icon: ClipboardCheck, label: 'Compliance Hub', path: '/app/compliance' },
      { icon: Cpu, label: 'Readiness', path: '/app/readiness' },
      { icon: FolderOpen, label: 'Evidence Hub', path: '/app/evidence' },
      { icon: ShieldCheck, label: 'CCPA Compliance', path: '/app/ccpa' },
      { icon: Shield, label: 'DPDP Compliance', path: '/app/dpdp' },
      { icon: ShieldCheck, label: 'DORA', path: '/app/dora' },
      { icon: Scale, label: 'FTC AI Guidelines', path: '/app/ftc' },
      { icon: Shield, label: 'GDPR Compliance', path: '/app/gdpr' },
      { icon: Shield, label: 'HIPAA Compliance', path: '/app/hipaa' },
      { icon: Globe, label: 'OECD AI Principles', path: '/app/oecd' },
      { icon: ShieldCheck, label: 'PCI-DSS Compliance', path: '/app/pci' },
      { icon: ShieldCheck, label: 'SOC2 Compliance', path: '/app/soc2' },
      { icon: Award, label: 'CE Marking', path: '/app/ce-marking' },
      { icon: ShieldCheck, label: 'Consent', path: '/app/consent' },
    ]
  },
  {
    name: 'GOVERNANCE',
    items: [
      { icon: Activity, label: 'GovernanceOS', path: '/app/governance-os' },
      { icon: ShieldCheck, label: 'Controls', path: '/app/controls' },
      { icon: ListTodo, label: 'Obligations', path: '/app/obligations' },
      { icon: Award, label: 'Risk Audits', path: '/app/risk-assessment' },
      { icon: Layers, label: 'Impact Boards', path: '/app/impact-assessments' },
    ]
  },
  {
    name: 'AI SYSTEMS',
    items: [
      { icon: Bot, label: 'AI Registry', path: '/app/ai-registry' },
      { icon: EyeOff, label: 'Shadow AI', path: '/app/shadow' },
      { icon: Box, label: 'Inventory', path: '/app/inventory' },
      { icon: Box, label: 'Dataset Registry', path: '/app/datasets' },
      { icon: FlaskConical, label: 'LLM Evaluation', path: '/app/evaluation' },
    ]
  },
  {
    name: 'OPERATIONS',
    items: [
      { icon: ClipboardCheck, label: 'Intake Queue', path: '/app/intake' },
      { icon: FileText, label: 'Intake Builder', path: '/app/intake/builder' },
      { icon: GitPullRequestDraft, label: 'Approvals', path: '/app/workflows' },
      { icon: ListTodo, label: 'Tasks', path: '/app/tasks' },
      { icon: Folder, label: 'Files', path: '/app/files' },
      { icon: GitPullRequestDraft, label: 'Automations', path: '/app/automations' },
      { icon: AlertTriangle, label: 'Incidents', path: '/app/incidents' },
    ]
  },
  {
    name: 'INTELLIGENCE',
    items: [
      { icon: Sparkles, label: 'AI Advisor', path: '/app/advisor' },
      { icon: Compass, label: 'Agent Discovery', path: '/app/agent-discovery' },
      { icon: Search, label: 'Audit Log', path: '/app/audit' },
      { icon: BarChart3, label: 'Executive Report', path: '/app/executive-report' },
    ]
  },
  {
    name: 'SETTINGS',
    items: [
      { icon: Settings2, label: 'Settings', path: '/app/settings' },
      { icon: Building2, label: 'Vendor Risk', path: '/app/vendor-risk' },
      { icon: ListTodo, label: 'Training Register', path: '/app/training' },
    ]
  }
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

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
    <>
      {/* Mobile Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-[#1e293b]/90 backdrop-blur-md border border-white/10 text-white hover:bg-[#334155] focus:outline-none transition-colors shadow-lg"
        aria-label="Open sidebar menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Backdrop overlay behind open mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Sidebar navigation drawer */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[var(--sidebar-width)] bg-[#1e293b] backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl shadow-black/5 transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Logo & Mobile Close Button */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-6 border-b border-white/5 bg-[#0f172a]/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--mid-indigo)] text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-widest text-white">Sentra</span>
              <span className="text-[10px] block font-bold text-[var(--lavender)] uppercase -mt-1 tracking-tighter opacity-70">Governance</span>
            </div>
          </div>

          {/* Close button inside mobile drawer */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--lavender)] hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
            aria-label="Close sidebar menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-6 px-3 pt-6 overflow-y-auto custom-scrollbar pb-6">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.name}>
              <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-80">
                {group.name}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/app'}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => cn(
                      "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                      isActive
                        ? "bg-[var(--royal-indigo)] text-white shadow-md shadow-black/10"
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
          ))}

          {/* Platform Admin Console */}
          {user?.role === 'SUPER_ADMIN' && (
            <div>
              <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-80">Platform Admin</p>
              <div className="space-y-1">
                <NavLink
                  to="/superadmin"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => cn(
                    "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                    isActive
                      ? "bg-[var(--royal-indigo)] text-white shadow-md shadow-black/10"
                      : "text-[var(--lavender)] hover:bg-[#334155]/60 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={cn(
                      "h-4 w-4 transition-transform group-hover:scale-110",
                      "text-indigo-400"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Platform Console</span>
                  </div>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* Footer Profile */}
        <div className="p-4 border-t border-white/5 bg-[#0f172a]/20">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') { 
                e.preventDefault(); 
                setIsOpen(false);
                handleLogout(); 
              } 
            }}
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
    </>
  );
}
