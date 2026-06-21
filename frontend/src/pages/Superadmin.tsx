import { useEffect, useState } from 'react';
import { 
  Users, Building, Activity, Settings, Search, Lock, Unlock, 
  Trash2, Play, RefreshCw, ChevronLeft, ShieldAlert, Award, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

interface OrgStats {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  plan: string;
  custom_domain: string | null;
  created_at: string;
  _count: {
    users: number;
    ai_agents: number;
    incidents: number;
  };
}

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  mfa_enabled: boolean;
  email_verified: boolean;
  organizations: {
    name: string;
    slug: string;
  };
}

interface GlobalStats {
  organizations: { total: number; active: number; suspended: number };
  users: number;
  aiAgents: number;
  incidents: number;
  activePolicies: number;
  evaluationRuns: number;
  timestamp: string;
}

interface QueueStats {
  name: string;
  status: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null;
}

interface FailedJob {
  id: string;
  name: string;
  payload: any;
  error: string;
  attemptsMade: number;
  timestamp: number;
}

export default function Superadmin() {
  const addToast = useStore((state) => state.addToast);
  const { impersonate } = useAuth();
  
  // Tab states: 'users' | 'orgs' | 'queues'
  const [activeTab, setActiveTab] = useState<'users' | 'orgs' | 'queues'>('users');
  
  // Search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  
  // Data loading states
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [orgs, setOrgs] = useState<OrgStats[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [queues, setQueues] = useState<QueueStats[]>([]);
  
  // Active queue failed jobs view
  const [activeQueueName, setActiveQueueName] = useState<string | null>(null);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [failedJobsLoading, setFailedJobsLoading] = useState(false);

  // General loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);
  const [queuesLoading, setQueuesLoading] = useState(true);

  // Load global counts
  const loadGlobalStats = async () => {
    try {
      const res = await apiRequest<GlobalStats>('/superadmin/stats');
      setStats(res);
    } catch (err: any) {
      console.error('Failed to load global stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load users list
  const loadUsers = async (searchVal = '') => {
    setUsersLoading(true);
    try {
      const url = `/superadmin/users${searchVal ? `?search=${encodeURIComponent(searchVal)}` : ''}`;
      const data = await apiRequest<PlatformUser[]>(url);
      setUsers(data);
    } catch (err: any) {
      addToast({ message: 'Failed to fetch platform users', type: 'error' });
    } finally {
      setUsersLoading(false);
    }
  };

  // Load orgs list
  const loadOrgs = async (searchVal = '') => {
    setOrgsLoading(true);
    try {
      const url = `/superadmin/organizations${searchVal ? `?search=${encodeURIComponent(searchVal)}` : ''}`;
      const res = await apiRequest<any>(url);
      setOrgs(res.data || res || []);
    } catch (err: any) {
      addToast({ message: 'Failed to fetch organizations list', type: 'error' });
    } finally {
      setOrgsLoading(false);
    }
  };

  // Load single org detail
  const loadOrgDetail = async (orgId: string) => {
    setOrgDetailLoading(true);
    try {
      const data = await apiRequest<any>(`/superadmin/organizations/${orgId}`);
      setSelectedOrg(data);
    } catch (err: any) {
      addToast({ message: 'Failed to fetch organization details', type: 'error' });
    } finally {
      setOrgDetailLoading(false);
    }
  };

  // Load queues
  const loadQueues = async () => {
    setQueuesLoading(true);
    try {
      const res = await apiRequest<any>('/admin/queues');
      setQueues(res.data || res || []);
    } catch (err: any) {
      addToast({ message: 'Failed to fetch BullMQ queue statistics', type: 'error' });
    } finally {
      setQueuesLoading(false);
    }
  };

  // Load failed jobs for queue
  const loadFailedJobs = async (queueName: string) => {
    setFailedJobsLoading(true);
    try {
      const res = await apiRequest<any>(`/admin/queues/${queueName}/failed`);
      setFailedJobs(res.data || res || []);
    } catch (err: any) {
      addToast({ message: `Failed to load failed jobs for ${queueName}`, type: 'error' });
    } finally {
      setFailedJobsLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalStats();
    loadUsers();
    loadOrgs();
    loadQueues();
  }, []);

  // Debounced search triggers
  useEffect(() => {
    const delay = setTimeout(() => {
      loadUsers(userSearch);
    }, 400);
    return () => clearTimeout(delay);
  }, [userSearch]);

  useEffect(() => {
    const delay = setTimeout(() => {
      loadOrgs(orgSearch);
    }, 400);
    return () => clearTimeout(delay);
  }, [orgSearch]);

  // Actions: Users
  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await apiRequest(`/superadmin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      addToast({ message: `Role updated to ${role} successfully`, type: 'success' });
      loadUsers(userSearch);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update user role', type: 'error' });
    }
  };

  const handleToggleUserBan = async (user: PlatformUser) => {
    const action = user.is_active ? 'ban' : 'reactivate';
    const messageConfirm = user.is_active 
      ? `Are you sure you want to suspend access for ${user.full_name}?`
      : `Reactivate access for ${user.full_name}?`;

    if (!confirm(messageConfirm)) return;

    try {
      const endpoint = `/superadmin/users/${user.id}/${action === 'ban' ? 'ban' : 'reactivate'}`;
      await apiRequest(endpoint, {
        method: 'PATCH',
        body: action === 'ban' ? JSON.stringify({ reason: 'Suspended by system administrator' }) : undefined
      });
      addToast({ message: `User account has been ${action === 'ban' ? 'suspended' : 'reactivated'}`, type: 'success' });
      loadUsers(userSearch);
    } catch (err: any) {
      addToast({ message: err.message || `Failed to ${action} user`, type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`CRITICAL WARNING: Soft-delete user ${name}? Sensitive metadata will be purged and active sessions terminated.`)) return;

    try {
      await apiRequest(`/superadmin/users/${userId}`, { method: 'DELETE' });
      addToast({ message: 'User record deleted successfully', type: 'success' });
      loadUsers(userSearch);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete user record', type: 'error' });
    }
  };

  const handleImpersonate = async (userId: string, name: string) => {
    if (!confirm(`Warning: You are about to impersonate ${name}. You will be logged in as them and have their exact permissions. Continue?`)) return;

    try {
      await impersonate(userId);
      addToast({ message: `Now impersonating ${name}`, type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to initiate impersonation session', type: 'error' });
    }
  };

  // Actions: Orgs
  const handleToggleOrgSuspend = async (org: any) => {
    const action = org.is_active ? 'suspend' : 'reactivate';
    const messageConfirm = org.is_active 
      ? `SUSPEND Organization "${org.name}"? All associated API keys, agents, and users will immediately fail requests.`
      : `Reactivate Organization "${org.name}"?`;

    if (!confirm(messageConfirm)) return;

    try {
      const endpoint = `/superadmin/organizations/${org.id}/${action}`;
      await apiRequest(endpoint, {
        method: 'PATCH',
        body: action === 'suspend' ? JSON.stringify({ reason: 'Administrative suspension' }) : undefined
      });
      addToast({ message: `Organization has been ${action === 'suspend' ? 'suspended' : 'reactivated'}`, type: 'success' });
      loadOrgs(orgSearch);
      if (selectedOrgId === org.id) {
        loadOrgDetail(org.id);
      }
    } catch (err: any) {
      addToast({ message: err.message || `Failed to change organization status`, type: 'error' });
    }
  };

  const handleDeleteOrg = async (orgId: string, name: string) => {
    if (!confirm(`🚨 CRITICAL DANGER ZONE 🚨\nAre you absolutely sure you want to SOFT-DELETE Organization "${name}"?\nThis is a final action: the slug will be permanently scrambled, access revoked, and the organization isolated.`)) return;

    try {
      await apiRequest(`/superadmin/organizations/${orgId}`, { method: 'DELETE' });
      addToast({ message: 'Organization soft-deleted successfully', type: 'success' });
      setSelectedOrgId(null);
      setSelectedOrg(null);
      loadOrgs(orgSearch);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete organization', type: 'error' });
    }
  };

  // Actions: Queues
  const handleRetryJob = async (queueName: string, jobId: string) => {
    try {
      await apiRequest(`/admin/queues/${queueName}/failed/${jobId}/retry`, { method: 'POST' });
      addToast({ message: `Job ${jobId} resubmitted for execution`, type: 'success' });
      loadFailedJobs(queueName);
      loadQueues();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to retry job', type: 'error' });
    }
  };

  const handleFlushFailed = async (queueName: string) => {
    if (!confirm(`Are you sure you want to permanently purge all failed jobs in queue "${queueName}"?`)) return;

    try {
      await apiRequest(`/admin/queues/${queueName}/failed`, { method: 'DELETE' });
      addToast({ message: 'Failed jobs purged successfully', type: 'success' });
      loadFailedJobs(queueName);
      loadQueues();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to flush queue', type: 'error' });
    }
  };

  // Organization drill-down wrapper
  const handleDrillDownOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    loadOrgDetail(orgId);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-[var(--bg-page)] text-[var(--text-primary)] min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
            <Award className="h-6 w-6 text-indigo-500" />
            <span>Platform Admin Console</span>
          </h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Global governance controls, multi-tenant monitoring, and process orchestration
          </p>
        </div>
        <button 
          onClick={() => {
            loadGlobalStats();
            loadUsers(userSearch);
            loadOrgs(orgSearch);
            loadQueues();
            addToast({ message: 'Platform status cache refreshed', type: 'info' });
          }}
          className="flex items-center justify-center gap-2 h-9 px-4 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Global Core Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Tenants</span>
            <span className="text-2xl font-semibold text-white mt-2">{stats.organizations.total}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Active Tenants</span>
            <span className="text-2xl font-semibold text-emerald-400 mt-2">{stats.organizations.active}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Suspended Tenants</span>
            <span className="text-2xl font-semibold text-amber-500 mt-2">{stats.organizations.suspended}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Global User Accounts</span>
            <span className="text-2xl font-semibold text-indigo-400 mt-2">{stats.users}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">AI Agents Registered</span>
            <span className="text-2xl font-semibold text-purple-400 mt-2">{stats.aiAgents}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Security Incidents</span>
            <span className="text-2xl font-semibold text-rose-500 mt-2">{stats.incidents}</span>
          </div>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="border-b border-[var(--border-default)] flex items-center gap-6">
        <button 
          onClick={() => { setActiveTab('users'); setSelectedOrgId(null); setSelectedOrg(null); }}
          className={cn(
            "pb-3 text-xs font-semibold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
            activeTab === 'users' && !selectedOrgId
              ? "border-indigo-500 text-white" 
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Users className="h-4 w-4" />
          <span>User Accounts</span>
        </button>
        <button 
          onClick={() => { setActiveTab('orgs'); }}
          className={cn(
            "pb-3 text-xs font-semibold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
            activeTab === 'orgs' || selectedOrgId
              ? "border-indigo-500 text-white" 
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Building className="h-4 w-4" />
          <span>Organizations (Tenants)</span>
        </button>
        <button 
          onClick={() => { setActiveTab('queues'); setSelectedOrgId(null); setSelectedOrg(null); }}
          className={cn(
            "pb-3 text-xs font-semibold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
            activeTab === 'queues'
              ? "border-indigo-500 text-white" 
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          <Activity className="h-4 w-4" />
          <span>BullMQ Dashboard</span>
        </button>
      </div>

      {/* Dynamic Tab Body */}
      <div className="flex flex-col gap-6">

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && !selectedOrgId && (
          <div className="flex flex-col gap-6">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Showing {users.length} active platform accounts
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search email, name..." 
                  className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold text-[var(--text-primary)] w-72 focus:outline-none focus:border-indigo-500" 
                />
              </div>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Loading User Registry...</span>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] bg-[var(--bg-card)] text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                        <th className="px-6 py-4">Account Profile</th>
                        <th className="px-6 py-4">Associated Organization</th>
                        <th className="px-6 py-4">System Role</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]/60">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)] text-xs uppercase tracking-wider font-bold">
                            No user accounts matched the filter
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-[var(--bg-page)] transition-all text-xs">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-white">{user.full_name}</span>
                                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {user.organizations ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-[var(--text-primary)]">{user.organizations.name}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] tracking-wider uppercase">{user.organizations.slug}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-500">PLATFORM ADMIN</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                value={user.role} 
                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-2.5 py-1 text-[10px] font-bold text-white focus:outline-none focus:border-indigo-500"
                              >
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MEMBER">MEMBER</option>
                                <option value="ENGINEER">ENGINEER</option>
                                <option value="AUDITOR">AUDITOR</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={cn(
                                "text-[9px] font-semibold uppercase px-2 py-0.5 rounded",
                                user.is_active 
                                  ? "bg-emerald-500/10 text-emerald-400" 
                                  : "bg-rose-500/10 text-rose-400"
                              )}>
                                {user.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleImpersonate(user.id, user.full_name)}
                                  className="p-1.5 rounded hover:bg-indigo-500/10 text-indigo-400 border border-transparent hover:border-indigo-500/30 transition-all flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider"
                                  title="Impersonate User"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Login</span>
                                </button>
                                <button
                                  onClick={() => handleToggleUserBan(user)}
                                  className={cn(
                                    "p-1.5 rounded border border-transparent transition-all text-[9px] font-semibold uppercase tracking-wider",
                                    user.is_active 
                                      ? "hover:bg-amber-500/10 text-amber-400 hover:border-amber-500/30" 
                                      : "hover:bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/30"
                                  )}
                                  title={user.is_active ? 'Suspend Account' : 'Reactivate Account'}
                                >
                                  {user.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.full_name)}
                                  className="p-1.5 rounded hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/30 transition-all"
                                  title="Soft Delete User"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ORGANIZATIONS TAB ── */}
        {(activeTab === 'orgs' && !selectedOrgId) && (
          <div className="flex flex-col gap-6">
            
            {/* Search Bar */}
            <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Multi-Tenant Administration Screen
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search tenant name or slug..." 
                  className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold text-[var(--text-primary)] w-72 focus:outline-none focus:border-indigo-500" 
                />
              </div>
            </div>

            {/* Orgs List */}
            {orgsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Loading Organization Ledger...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orgs.length === 0 ? (
                  <div className="col-span-full bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)] font-semibold uppercase tracking-widest text-xs">
                    No active tenants match the query
                  </div>
                ) : (
                  orgs.map((org) => (
                    <div 
                      key={org.id} 
                      className={cn(
                        "card-base p-6 transition-all relative overflow-hidden flex flex-col justify-between h-[210px]",
                        !org.is_active && "border-rose-950 bg-rose-950/5 opacity-80"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-white">{org.name}</h3>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] block mt-0.5">
                              SLUG: {org.slug}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[8px] font-semibold uppercase px-2 py-0.5 rounded",
                            org.is_active 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-rose-500/10 text-rose-400"
                          )}>
                            {org.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </div>

                        {/* Middle stats grid */}
                        <div className="grid grid-cols-3 gap-2 mt-6 border-y border-[var(--border-default)]/40 py-3 text-center">
                          <div>
                            <span className="text-[8px] font-semibold uppercase tracking-tighter text-[var(--text-secondary)] block">Users</span>
                            <span className="text-xs font-semibold text-white mt-1 block">{org._count.users}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-semibold uppercase tracking-tighter text-[var(--text-secondary)] block">Agents</span>
                            <span className="text-xs font-semibold text-white mt-1 block">{org._count.ai_agents}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-semibold uppercase tracking-tighter text-[var(--text-secondary)] block">Violations</span>
                            <span className="text-xs font-semibold text-rose-400 mt-1 block">{org._count.incidents}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400">
                          {org.plan.toUpperCase()} PLAN
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDrillDownOrg(org.id)}
                            className="btn-secondary h-7 !px-2.5 !py-0 !text-[8.5px] uppercase font-semibold tracking-widest flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            <span>Drill down</span>
                          </button>
                          <button
                            onClick={() => handleToggleOrgSuspend(org)}
                            className={cn(
                              "h-7 px-2.5 rounded text-[8.5px] font-semibold uppercase tracking-widest transition-all border flex items-center justify-center gap-1",
                              org.is_active 
                                ? "bg-amber-500/5 text-amber-400 border-amber-500/20 hover:bg-amber-500/10" 
                                : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                            )}
                          >
                            {org.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ORGANIZATION DRILL DOWN DETAIL ── */}
        {selectedOrgId && (
          <div className="flex flex-col gap-6">
            
            {/* Back Button */}
            <div>
              <button 
                onClick={() => { setSelectedOrgId(null); setSelectedOrg(null); }}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Return to organizations grid</span>
              </button>
            </div>

            {orgDetailLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Retrieving Tenant Metadata...</span>
              </div>
            ) : selectedOrg ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Organization Details Panel */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="card-base p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{selectedOrg.name}</h2>
                        <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1 font-bold">
                          TENANT ID: {selectedOrg.id}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-semibold uppercase px-2 py-0.5 rounded",
                        selectedOrg.is_active 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-rose-500/10 text-rose-400"
                      )}>
                        {selectedOrg.is_active ? 'Active Status' : 'Suspended Status'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Tenant Slug</span>
                        <span className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 rounded p-2 text-xs font-mono font-bold text-white">
                          {selectedOrg.slug}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Custom Domain</span>
                        <span className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 rounded p-2 text-xs font-mono font-bold text-white">
                          {selectedOrg.custom_domain || 'NOT CONFIGURATION'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Creation Timestamp</span>
                        <span className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 rounded p-2 text-xs font-bold text-white">
                          {new Date(selectedOrg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">System Region</span>
                        <span className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 rounded p-2 text-xs font-bold text-white uppercase">
                          {selectedOrg.data_region || 'US'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-default)]/50 pt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Active Tier</span>
                        <span className="text-sm font-semibold text-white mt-1 uppercase">{selectedOrg.plan} Tier</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const newPlan = prompt('Enter new plan name (free, business, enterprise):', selectedOrg.plan);
                            if (!newPlan) return;
                            try {
                              await apiRequest(`/superadmin/organizations/${selectedOrg.id}/plan`, {
                                method: 'PATCH',
                                body: JSON.stringify({ plan: newPlan })
                              });
                              addToast({ message: 'Plan modified successfully', type: 'success' });
                              loadOrgDetail(selectedOrg.id);
                            } catch (err: any) {
                              addToast({ message: 'Feature not supported', type: 'error' });
                            }
                          }}
                          className="btn-secondary h-8 !px-3 !py-0 !text-[9px] uppercase font-semibold tracking-widest"
                        >
                          Modify Plan
                        </button>
                        <button
                          onClick={() => handleToggleOrgSuspend(selectedOrg)}
                          className={cn(
                            "h-8 px-3 rounded text-[9px] font-semibold uppercase tracking-widest transition-all border flex items-center justify-center gap-1.5",
                            selectedOrg.is_active 
                              ? "bg-amber-500/5 text-amber-400 border-amber-500/20 hover:bg-amber-500/10" 
                              : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                          )}
                        >
                          {selectedOrg.is_active ? 'Suspend Tenant' : 'Activate Tenant'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Workspaces List inside Tenant */}
                  <div className="card-base p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white border-b border-[var(--border-default)]/50 pb-3 mb-4">
                      Associated Workspaces
                    </h3>
                    <div className="divide-y divide-[var(--border-default)]/40">
                      {selectedOrg.workspaces && selectedOrg.workspaces.length === 0 ? (
                        <div className="text-center text-[var(--text-muted)] text-[10px] uppercase font-semibold py-4">
                          No active workspaces found
                        </div>
                      ) : (
                        selectedOrg.workspaces?.map((workspace: any) => (
                          <div key={workspace.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                            <div>
                              <span className="font-bold text-xs text-white block">{workspace.name}</span>
                              <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block uppercase tracking-wider font-mono">
                                ID: {workspace.id}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold uppercase px-2 py-0.5 bg-[var(--bg-page)] border border-[var(--border-default)] rounded">
                              Active
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Sidebar: Danger Zone */}
                <div className="flex flex-col gap-6">
                  
                  {/* Stats Counter */}
                  <div className="card-base p-6 bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
                      Activity Metrics
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-[var(--border-default)]/30 pb-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Active Users</span>
                        <span className="text-sm font-semibold text-white">{selectedOrg._count?.users || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-[var(--border-default)]/30 pb-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">AI Agents</span>
                        <span className="text-sm font-semibold text-white">{selectedOrg._count?.ai_agents || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-[var(--border-default)]/30 pb-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Incidents</span>
                        <span className="text-sm font-semibold text-rose-400">{selectedOrg._count?.incidents || 0}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Governance Policies</span>
                        <span className="text-sm font-semibold text-purple-400">{selectedOrg._count?.policies || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="card-base p-6 border-rose-950 bg-rose-950/5">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-4 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Danger Zone</span>
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-6 font-bold uppercase tracking-tight">
                      Deleting an organization soft-deletes the tenant immediately. The slug is scrambled to free up space. All active sessions are terminated.
                    </p>
                    <button
                      onClick={() => handleDeleteOrg(selectedOrg.id, selectedOrg.name)}
                      className="w-full h-9 flex items-center justify-center gap-2 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Tenant</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        )}

        {/* ── QUEUE DASHBOARD TAB ── */}
        {activeTab === 'queues' && (
          <div className="flex flex-col gap-6">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  BullMQ Queue Orchestrator
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <button 
                onClick={() => { loadQueues(); setActiveQueueName(null); setFailedJobs([]); }}
                className="flex items-center justify-center gap-2 h-7 px-3 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[9px] font-semibold uppercase tracking-wider rounded transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh Queues</span>
              </button>
            </div>

            {/* Queues list grid */}
            {queuesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Loading BullMQ engine data...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {queues.map((q) => (
                  <div 
                    key={q.name}
                    className={cn(
                      "card-base p-6 hover:border-indigo-500/60 transition-all flex flex-col justify-between h-[230px]",
                      activeQueueName === q.name && "border-indigo-500 shadow-md shadow-indigo-500/10"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--border-default)]/40 pb-2">
                        <span className="font-mono font-semibold text-white text-xs">{q.name}</span>
                        <span className={cn(
                          "text-[8px] font-semibold uppercase px-2 py-0.5 rounded",
                          q.status === 'online' 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-slate-500/10 text-slate-400"
                        )}>
                          {q.status}
                        </span>
                      </div>

                      {/* Stats grid */}
                      {q.counts ? (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[var(--text-muted)] font-bold uppercase">Waiting</span>
                            <span className="font-mono font-semibold text-white">{q.counts.waiting}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[var(--text-muted)] font-bold uppercase">Active</span>
                            <span className="font-mono font-semibold text-white">{q.counts.active}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[var(--text-muted)] font-bold uppercase">Delayed</span>
                            <span className="font-mono font-semibold text-white">{q.counts.delayed}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-rose-400 font-bold uppercase">Failed</span>
                            <span className="font-mono font-semibold text-rose-400">{q.counts.failed}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[var(--text-muted)] uppercase py-6 text-center font-bold">
                          Stats currently offline
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 mt-4 border-t border-[var(--border-default)]/30 pt-3">
                      {q.counts && q.counts.failed > 0 && (
                        <button
                          onClick={() => handleFlushFailed(q.name)}
                          className="h-7 px-2.5 rounded bg-rose-500/5 text-[9px] font-semibold uppercase tracking-widest text-rose-400 border border-rose-500/25 hover:bg-rose-500/10"
                        >
                          Purge Failed
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveQueueName(q.name);
                          loadFailedJobs(q.name);
                        }}
                        className="btn-secondary h-7 !px-2.5 !py-0 !text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect Failures</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inspect Failures section */}
            {activeQueueName && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-xl shadow-md mt-4 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[var(--border-default)]/40 pb-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
                      Inspect Failures: <span className="text-indigo-400 font-mono">{activeQueueName}</span>
                    </h3>
                    <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mt-1">
                      Failed Job dead-letter-queue explorer
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleFlushFailed(activeQueueName)}
                      className="btn-secondary h-8 !px-3 !py-0 !text-[9px] uppercase text-rose-400"
                    >
                      Flush Dead Letter Queue
                    </button>
                    <button 
                      onClick={() => loadFailedJobs(activeQueueName)}
                      className="flex items-center justify-center gap-1.5 h-8 px-3 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[9px] font-semibold uppercase tracking-wider rounded-lg transition-all"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {failedJobsLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Querying failures...</span>
                  </div>
                ) : failedJobs.length === 0 ? (
                  <div className="text-center text-[var(--text-muted)] text-[10px] uppercase font-semibold py-8 border border-[var(--border-default)] border-dashed rounded-lg">
                    No failed jobs in this queue. Everything operational.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {failedJobs.map((job) => (
                      <div key={job.id} className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-xs text-white">JOB_ID: {job.id}</span>
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">
                              {job.name}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono">
                              {new Date(job.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-rose-400 font-mono mt-2 bg-rose-500/5 border border-rose-500/10 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {job.error}
                          </p>
                          {job.payload && (
                            <details className="mt-2 group">
                              <summary className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none">
                                View Payload
                              </summary>
                              <pre className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-default)] rounded p-2.5 mt-1 overflow-x-auto">
                                {JSON.stringify(job.payload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>

                        <div className="flex items-center shrink-0 gap-2">
                          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                            Attempts: {job.attemptsMade}
                          </span>
                          <button
                            onClick={() => handleRetryJob(activeQueueName, job.id)}
                            className="btn-primary h-8 flex items-center gap-1.5 !px-3.5 !py-0 !text-[9px] font-semibold uppercase tracking-widest shadow-lg shadow-indigo-500/10"
                          >
                            <Play className="h-3 w-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
