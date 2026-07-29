import { useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
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
  path?: string;
  items?: SidebarItem[];
}

interface SidebarGroup {
  name: string;
  items: SidebarItem[];
  requiredRole?: string;
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
      {
        icon: ShieldCheck,
        label: 'Frameworks',
        items: [
          { icon: Shield, label: 'GDPR Compliance', path: '/app/gdpr' },
          { icon: Shield, label: 'DPDP Compliance', path: '/app/dpdp' },
          { icon: Shield, label: 'HIPAA Compliance', path: '/app/hipaa' },
          { icon: ShieldCheck, label: 'PCI-DSS Compliance', path: '/app/pci' },
          { icon: ShieldCheck, label: 'Consent', path: '/app/consent' },
        ]
      }
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
  },
  {
    name: 'PLATFORM ADMIN',
    requiredRole: 'SUPER_ADMIN',
    items: [
      { icon: ShieldCheck, label: 'Platform Console', path: '/superadmin' }
    ]
  }
];

const getLeafCount = (group: SidebarGroup): number => {
  let count = 0;
  for (const item of group.items) {
    if (item.path) count++;
    if (item.items) {
      for (const subItem of item.items) {
        if (subItem.path) count++;
      }
    }
  }
  return count;
};


export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sentra_sidebar_expanded');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse expanded sections', e);
    }
    return { CORE: true };
  });

  const [frameworksExpanded, setFrameworksExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sentra_sidebar_frameworks_expanded') === 'true';
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [sectionName]: !prev[sectionName] };
      localStorage.setItem('sentra_sidebar_expanded', JSON.stringify(next));
      return next;
    });
  };

  const toggleFrameworks = () => {
    setFrameworksExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('sentra_sidebar_frameworks_expanded', String(next));
      return next;
    });
  };

  useEffect(() => {
    let sectionToExpand: string | null = null;
    let expandFrameworks = false;

    for (const group of SIDEBAR_GROUPS) {
      if (group.requiredRole === 'SUPER_ADMIN' && user?.role !== 'SUPER_ADMIN') {
        continue;
      }
      for (const item of group.items) {
        if (item.path && pathname === item.path) {
          sectionToExpand = group.name;
        }
        if (item.items) {
          for (const subItem of item.items) {
            if (subItem.path && pathname === subItem.path) {
              sectionToExpand = group.name;
              if (item.label === 'Frameworks') {
                expandFrameworks = true;
              }
            }
          }
        }
      }
    }

    if (sectionToExpand) {
      setExpandedSections((prev) => {
        if (!prev[sectionToExpand!]) {
          const next = { ...prev, [sectionToExpand!]: true };
          localStorage.setItem('sentra_sidebar_expanded', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }

    if (expandFrameworks) {
      setFrameworksExpanded((prev) => {
        if (!prev) {
          localStorage.setItem('sentra_sidebar_frameworks_expanded', 'true');
          return true;
        }
        return prev;
      });
    }
  }, [pathname, user?.role]);

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
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-[#1e293b] border border-white/10 text-white hover:bg-[#334155] focus:outline-none transition-colors shadow-lg"
        aria-label="Open sidebar menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Backdrop overlay behind open mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setIsOpen(false))}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="lg:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Sidebar navigation drawer */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[var(--sidebar-width)] bg-[#1e293b] border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl shadow-black/5 transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Logo & Mobile Close Button */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-6 border-b border-white/5 bg-[#0f172a]/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mid-indigo)] text-white shadow-lg shadow-indigo-500/20">
              <svg viewBox="55 5 120 125" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="152" y1="30" x2="132" y2="18"/>
                  <line x1="132" y1="18" x2="104" y2="13"/>
                  <line x1="104" y1="13" x2="78" y2="30"/>
                  <line x1="78" y1="30" x2="74" y2="58"/>
                  <line x1="74" y1="58" x2="108" y2="66"/>
                  <line x1="108" y1="66" x2="128" y2="47"/>
                  <line x1="108" y1="66" x2="95" y2="86"/>
                  <line x1="108" y1="66" x2="150" y2="73"/>
                  <line x1="150" y1="73" x2="146" y2="104"/>
                  <line x1="146" y1="104" x2="163" y2="99"/>
                  <line x1="146" y1="104" x2="162" y2="119"/>
                  <line x1="146" y1="104" x2="119" y2="121"/>
                  <line x1="119" y1="121" x2="90" y2="112"/>
                  <line x1="90" y1="112" x2="66" y2="104"/>
                </g>
                <g fill="currentColor">
                  <circle cx="152" cy="30" r="3"/>
                  <circle cx="132" cy="18" r="10"/>
                  <circle cx="104" cy="13" r="6"/>
                  <circle cx="78" cy="30" r="9"/>
                  <circle cx="74" cy="58" r="7"/>
                  <circle cx="128" cy="47" r="3"/>
                  <circle cx="95" cy="86" r="3"/>
                  <circle cx="150" cy="73" r="7"/>
                  <circle cx="146" cy="104" r="10"/>
                  <circle cx="163" cy="99" r="3"/>
                  <circle cx="162" cy="119" r="3"/>
                  <circle cx="119" cy="121" r="6"/>
                  <circle cx="90" cy="112" r="10"/>
                  <circle cx="66" cy="104" r="3"/>
                </g>
                <circle cx="108" cy="66" r="11" fill="none" stroke="currentColor" strokeWidth="7"/>
              </svg>
            </div>
            <div>
              <span className="text-base font-black uppercase tracking-widest text-white">Sentraa</span>
              <span className="text-[11px] block font-bold text-[var(--lavender)] uppercase -mt-1 tracking-tighter opacity-70">Governance</span>
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
          {SIDEBAR_GROUPS.map((group) => {
            if (group.requiredRole === 'SUPER_ADMIN' && user?.role !== 'SUPER_ADMIN') {
              return null;
            }

            const isExpanded = !!expandedSections[group.name];

            return (
              <div key={group.name} className="space-y-1.5">
                <button
                  onClick={() => toggleSection(group.name)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-white transition-colors focus:outline-none"
                  aria-expanded={isExpanded ? 'true' : 'false'}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform duration-200 text-indigo-400/60",
                        isExpanded && "transform rotate-90 text-indigo-400"
                      )}
                    />
                    <span>{group.name}</span>
                  </div>
                  {!isExpanded && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      {getLeafCount(group)}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      if (item.items) {
                        return (
                          <div key={item.label} className="space-y-1">
                            <button
                              onClick={toggleFrameworks}
                              className="w-full group flex items-center justify-between px-4 py-2 rounded transition-all duration-200 text-[var(--lavender)] hover:bg-[#334155]/60 hover:text-white focus:outline-none"
                              aria-expanded={frameworksExpanded ? 'true' : 'false'}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4 transition-transform group-hover:scale-110 text-indigo-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                              </div>
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 text-current transition-transform duration-200",
                                  frameworksExpanded && "transform rotate-90"
                                )}
                              />
                            </button>

                            {frameworksExpanded && (
                              <div className="space-y-1 ml-4 border-l border-white/5 pl-3">
                                {item.items.map((subItem) => (
                                  <NavLink
                                    key={subItem.path}
                                    to={subItem.path!}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) => cn(
                                      "group flex items-center justify-between px-4 py-2 rounded transition-all duration-200",
                                      isActive
                                        ? "bg-[var(--royal-indigo)] text-white shadow-md shadow-black/10"
                                        : "text-white/70 hover:bg-[#334155]/60 hover:text-white"
                                    )}
                                  >
                                    {({ isActive }) => (
                                      <div className="flex items-center gap-3">
                                        <subItem.icon className={cn(
                                          "h-4 w-4 transition-transform group-hover:scale-110",
                                          isActive ? "text-white" : "text-indigo-400"
                                        )} />
                                        <span className={cn(
                                          "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                          isActive ? "text-white" : "text-white/70 group-hover:text-white"
                                        )}>
                                          {subItem.label}
                                        </span>
                                      </div>
                                    )}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path!}
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
                            <item.icon className="h-4 w-4 transition-transform group-hover:scale-110 text-current" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                          </div>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
              {/* Note: The default seeded user fullName in DB is 'Sentra Admin'. We do not modify seed DB values here. */}
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
