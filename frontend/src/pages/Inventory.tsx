import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Cpu, 
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import KPICard from '@/components/dashboard/KPICard';
import { apiRequest } from '@/lib/api';

function timeAgo(dateString?: string) {
  if (!dateString) return 'Never';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Inventory() {
  const addToast = useStore((state) => state.addToast);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Registration modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerModel, setRegisterModel] = useState('');
  const [registerProvider, setRegisterProvider] = useState('');
  const [registerDepartment, setRegisterDepartment] = useState('');
  const [registering, setRegistering] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/inventory/agents');
      setInventory(data || []);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load inventory assets', type: 'error' });
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await apiRequest('/inventory/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: registerName,
          model: registerModel,
          status: 'Active',
          permissions: [],
          metadata: {
            provider: registerProvider || 'Internal',
            department: registerDepartment || 'Unassigned',
            riskScore: 0.3,
          }
        })
      });
      addToast({ message: `Successfully registered ${registerName}`, type: 'success' });
      setShowRegisterModal(false);
      setRegisterName('');
      setRegisterModel('');
      setRegisterProvider('');
      setRegisterDepartment('');
      void loadData();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to register system', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };

  const handleExportCSV = () => {
    if (inventory.length === 0) {
      addToast({ message: 'No registered systems to export', type: 'warning' });
      return;
    }

    addToast({ message: 'Compiling CSV inventory report...', type: 'info' });

    const headers = ['ID', 'Name', 'Model', 'Status', 'Provider', 'Department', 'Risk Level', 'Created At'];
    const rows = inventory.map(item => [
      item.id,
      item.name,
      item.model,
      item.status,
      item.metadata?.provider || 'Internal',
      item.metadata?.department || 'Unassigned',
      `${Math.round((item.metadata?.riskScore || 0) * 100)}%`,
      item.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai-system-inventory-${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalSystems = inventory.length;
  const externalProviders = new Set(
    inventory
      .map(item => item.metadata?.provider || 'Internal')
      .filter(p => p !== 'Internal' && p !== 'Unassigned')
  ).size;
  const pendingEvaluation = inventory.filter(item => !item.metadata || item.metadata.riskScore === undefined).length;
  const blockedSystems = inventory.filter(item => item.status?.toLowerCase() === 'blocked').length;

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.model && item.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.metadata?.provider && item.metadata.provider.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">AI System Inventory</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Comprehensive Registry of Authorized AI Assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest hover:bg-[var(--soft-indigo)] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Register New System
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Registered Systems" 
          value={totalSystems.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="External Providers" 
          value={externalProviders.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Risk Evaluation Pending" 
          value={pendingEvaluation.toString()} 
          icon="risks" 
          status="warning" 
        />
        <KPICard 
          label="Blocked Systems" 
          value={blockedSystems.toString()} 
          icon="risks" 
          status="danger" 
        />
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search by name, provider or type..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[11px] font-bold text-[var(--text-primary)] w-80 focus:outline-none focus:border-[var(--royal-indigo)] transition-colors" 
            />
          </div>
          <div className="h-8 w-px bg-[var(--border-default)] mx-2" />
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">
            Department <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">
            Provider <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">
            Status <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-4">System Name</th>
                <th className="px-6 py-4">Architecture / Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[var(--royal-indigo)]" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Loading Inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const riskScorePercent = Math.round((item.metadata?.riskScore ?? 0) * 100);
                  const providerLabel = item.metadata?.provider ?? 'Internal';
                  const departmentLabel = item.metadata?.department ?? 'Unassigned';
                  
                  return (
                    <tr key={item.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-[var(--ghost-violet)] flex items-center justify-center text-[var(--royal-indigo)]">
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{item.name}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{providerLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[var(--text-xs)] text-[var(--lavender)] font-bold">{item.model || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-tight",
                          item.status === 'Active' || item.status === 'active' ? "bg-emerald-500/10 text-emerald-400" :
                          item.status === 'Blocked' || item.status === 'blocked' ? "bg-rose-500/10 text-rose-500" :
                          "bg-amber-500/10 text-amber-400"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-1 bg-[var(--bg-page)] rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                riskScorePercent > 75 ? "bg-rose-500" :
                                riskScorePercent > 40 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${riskScorePercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-[var(--text-primary)] tabular-nums">{riskScorePercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-page)] text-[var(--text-secondary)] text-[10px] font-bold uppercase">
                          {departmentLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{timeAgo(item.updated_at || item.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => addToast({ message: `Opening ${item.name} external link...`, type: 'info' })}
                            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-[var(--bg-page)] transition-all"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => addToast({ message: `Viewing actions for ${item.name}...`, type: 'info' })}
                            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-[var(--bg-page)] transition-all"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Cpu className="h-8 w-8 text-[var(--text-muted)]" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">No AI systems registered yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-left">
            <div className="p-4 border-b border-zinc-900 bg-[#0c0c14]/40 flex justify-between items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                Register New AI System
              </span>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-zinc-500 hover:text-[var(--text-primary)] font-mono text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-name" className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">System Name</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g. Finance Auditing Copilot"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="reg-model" className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Model Architecture</label>
                <input
                  id="reg-model"
                  type="text"
                  required
                  value={registerModel}
                  onChange={(e) => setRegisterModel(e.target.value)}
                  placeholder="e.g. GPT-4o, Claude 3.5 Sonnet"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="reg-provider" className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Provider</label>
                <input
                  id="reg-provider"
                  type="text"
                  required
                  value={registerProvider}
                  onChange={(e) => setRegisterProvider(e.target.value)}
                  placeholder="e.g. OpenAI, Anthropic, Internal"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="reg-dept" className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Department</label>
                <input
                  id="reg-dept"
                  type="text"
                  required
                  value={registerDepartment}
                  onChange={(e) => setRegisterDepartment(e.target.value)}
                  placeholder="e.g. Finance, Customer Support, Engineering"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-zinc-900/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[var(--text-primary)] rounded text-[9px] font-semibold uppercase tracking-widest transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-[9px] font-semibold uppercase tracking-widest transition shadow-lg shadow-indigo-600/10"
                >
                  {registering ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
