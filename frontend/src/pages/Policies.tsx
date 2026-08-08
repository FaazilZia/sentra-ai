import { useEffect, useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  LoaderCircle,
  X,
  History,
  ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { fetchPolicies, PolicyResponse, apiBaseUrl, apiRequest, patchPolicy, deletePolicy } from '@/lib/api';
import { EvidenceSection } from '../components/shared/EvidenceSection';
import { ChangeHistoryTimeline } from '../components/shared/ChangeHistoryTimeline';
import RichPolicyEditor from '../components/shared/RichPolicyEditor';
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOW_ARIA_ATTR: true,
  ADD_ATTR: ['target', 'style', 'class', 'data-type', 'data-checked', 'role', 'alt'],
};


export default function Policies() {
  const addToast = useStore((state) => state.addToast);
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyResponse | null>(null);

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [versionHistoryPolicyId, setVersionHistoryPolicyId] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEffect, setNewEffect] = useState<'allow' | 'deny'>('deny');
  const [creating, setCreating] = useState(false);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.length < 3) {
      addToast({ message: 'Policy name must be at least 3 characters', type: 'warning' });
      return;
    }
    setCreating(true);
    try {
      await apiRequest('/policies', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          effect: newEffect,
          enabled: true,
          priority: 1,
          scope: {},
          conditions: {},
          obligations: {}
        })
      });
      addToast({ message: 'Policy created successfully!', type: 'success' });
      setIsCreateOpen(false);
      setNewName('');
      setNewDesc('');
      setNewEffect('deny');
      await loadPolicies();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to create policy', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const loadPolicies = async () => {
    try {
      const data = await fetchPolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      addToast({ message: 'Failed to load policies from governance engine', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePolicy(id);
      addToast({ message: 'Policy deleted successfully', type: 'success' });
      setSelectedPolicy(null);
      await loadPolicies();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete policy', type: 'error' });
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [addToast]);

  useEffect(() => {
    if (selectedPolicy) {
      setEditDesc(selectedPolicy.description || '');
      setIsEditing(false);
    } else {
      setEditDesc('');
      setIsEditing(false);
    }
  }, [selectedPolicy]);

  const handleSavePolicy = async () => {
    if (!selectedPolicy) return;
    setSavingPolicy(true);
    try {
      const updated = await patchPolicy(selectedPolicy.id, { description: editDesc });
      addToast({ message: 'Policy updated successfully', type: 'success' });
      setSelectedPolicy(updated);
      setIsEditing(false);
      await loadPolicies();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save policy', type: 'error' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const openVersionHistory = async (policy: any) => {
    setVersionHistoryPolicyId(policy.id);
    setShowVersionHistory(true);
    setVersionsLoading(true);
    try {
      const res = await apiRequest<any>(`/policies/${policy.id}/versions`);
      setVersions(res?.data || res || []);
    } catch {
      addToast({ message: 'Failed to load version history', type: 'error' });
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRollback = async (policyId: string, versionNumber: number) => {
    if (!confirm(`Roll back to version ${versionNumber}? This will create a new version with the previous content.`)) return;
    setRollingBack(true);
    try {
      await apiRequest(`/policies/${policyId}/rollback`, { method: 'POST', body: JSON.stringify({ version: versionNumber }) });
      addToast({ message: `Rolled back to version ${versionNumber}`, type: 'success' });
      setShowVersionHistory(false);
      await loadPolicies();
    } catch (err: any) {
      addToast({ message: err.message || 'Rollback failed', type: 'error' });
    } finally {
      setRollingBack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Querying Ledger...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Governance Policies</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Organizational Guardrails & Compliance Standards
          </p>
        </div>
        <button 
          onClick={() => { setNewName(''); setNewDesc(''); setNewEffect('deny'); setIsCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create Policy
        </button>
      </div>

      <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 border-r border-[var(--border-default)] pr-6">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Total</span>
            <span className="text-[var(--text-md)] font-semibold text-[var(--text-primary)]">{policies.length}</span>
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--border-default)] pr-6">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Enabled</span>
             <span className="text-[var(--text-md)] font-semibold text-[var(--text-primary)]">{policies.filter(p => p.enabled).length}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-amber-500" />
             <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Draft</span>
             <span className="text-[var(--text-md)] font-semibold text-[var(--text-primary)]">{policies.filter(p => p.status === 'draft').length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search policies..." className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold text-[var(--text-primary)] w-64 focus:outline-none" />
          </div>
          <button 
            aria-label="Filter policies"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {policies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {policies.map((policy) => (
            <div 
              key={policy.id}
              onClick={() => setSelectedPolicy(policy)}
              className="card-base p-6 group hover:border-[var(--royal-indigo)] transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="h-10 w-10 rounded-lg bg-[var(--bg-page)] flex items-center justify-center text-[var(--royal-indigo)]">
                  <FileText className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-[9px] font-semibold uppercase px-2 py-0.5 rounded flex items-center gap-1",
                  policy.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {policy.enabled ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                  {policy.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              <h3 className="text-[var(--text-md)] font-semibold text-[var(--text-primary)] uppercase tracking-tight mb-2 group-hover:text-[var(--royal-indigo)] transition-colors">
                {policy.name}
              </h3>
              <div className="flex items-center gap-3 mb-6">
                <span onClick={(e) => { e.stopPropagation(); openVersionHistory(policy); }} className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer">
                  <History className="h-3 w-3" />
                  v{policy.current_version || 1}
                </span>
                <span className="h-1 w-1 rounded-full bg-[var(--border-default)]" />
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{policy.effect}</span>
              </div>
              
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] line-clamp-2 mb-6 min-h-[32px]">
                {policy.description || 'No description provided.'}
              </p>
              
              <div className="pt-6 border-t border-[var(--border-default)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[var(--bg-page)] flex items-center justify-center">
                    <User className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">Governance Admin</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Calendar className="h-3 w-3" />
                  <span className="text-[9px] font-bold">{new Date(policy.created_at || '').toLocaleDateString()}</span>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                <ArrowRight className="h-4 w-4 text-[var(--royal-indigo)]" />
              </div>
            </div>
          ))}

          {/* Create Placeholder */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { setNewName(''); setNewDesc(''); setNewEffect('deny'); setIsCreateOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewName(''); setNewDesc(''); setNewEffect('deny'); setIsCreateOpen(true); } }}
            className="border-2 border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-[var(--bg-page)] transition-all cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-full bg-[var(--bg-page)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">New Policy Document</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl w-full">
          <ShieldOff className="h-12 w-12 text-[var(--text-muted)] mb-4 animate-pulse" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">No policies yet</h3>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1.5 leading-relaxed">
            Create your first governance policy to protect your AI pipeline.
          </p>
          <button 
            onClick={() => { setNewName(''); setNewDesc(''); setNewEffect('deny'); setIsCreateOpen(true); }}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold uppercase tracking-widest rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </button>
        </div>
      )}

      {selectedPolicy && (
        <div className="fixed inset-y-0 right-0 z-50 w-[440px] bg-white border-l border-[var(--border-default)] shadow-2xl p-6 flex flex-col justify-between animate-fade-in text-left">
          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-primary)]">Policy details</span>
              </div>
              <button 
                onClick={() => setSelectedPolicy(null)}
                aria-label="Close policy details"
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all outline-none"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-tight text-[var(--text-primary)]">{selectedPolicy.name}</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <span>v{selectedPolicy.current_version || 1}</span>
                  <span>•</span>
                  <span>{selectedPolicy.effect}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.open(`${apiBaseUrl}/reports/policy/${selectedPolicy.id}/pdf`, '_blank')}
                    className="px-2 py-1 text-[8px] font-semibold bg-indigo-50 border border-indigo-100 text-[var(--royal-indigo)] rounded hover:bg-indigo-100 transition-all uppercase tracking-widest"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => window.open(`${apiBaseUrl}/reports/policy/${selectedPolicy.id}/docx`, '_blank')}
                    className="px-2 py-1 text-[8px] font-semibold bg-teal-50 border border-teal-100 text-teal-700 rounded hover:bg-teal-100 transition-all uppercase tracking-widest"
                  >
                    Export Word
                  </button>
                  <button
                    onClick={() => handleDeletePolicy(selectedPolicy.id)}
                    className="px-2 py-1 text-[8px] font-semibold bg-rose-50 border border-rose-100 text-rose-700 rounded hover:bg-rose-100 transition-all uppercase tracking-widest"
                    id="delete-policy-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex justify-between items-center pb-1 border-b border-[var(--border-default)]/40">
                <h4 className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Description & Content</h4>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-[9px] font-semibold uppercase text-indigo-500 hover:text-indigo-400 font-bold"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSavePolicy}
                      disabled={savingPolicy}
                      className="text-[9px] font-semibold uppercase text-green-500 hover:text-green-400 font-bold disabled:opacity-40"
                    >
                      {savingPolicy ? '...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="text-[9px] font-semibold uppercase text-rose-500 hover:text-rose-400 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <RichPolicyEditor 
                  content={editDesc} 
                  onChange={setEditDesc} 
                />
              ) : (
                <div 
                  className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed prose prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedPolicy.description || 'No description provided.', SANITIZE_CONFIG) }}
                />
              )}
            </div>

            {/* Evidence Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <EvidenceSection entityType="policy" entityId={selectedPolicy.id} />
            </div>

            {/* Change History Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <ChangeHistoryTimeline entityType="policy" entityId={selectedPolicy.id} />
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="flex-1" 
            onClick={() => setShowVersionHistory(false)} 
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setShowVersionHistory(false))}
            role="button"
            tabIndex={0}
            aria-label="Close version history"
          />
          <div className="w-[480px] bg-[#0f172a] border-l border-[var(--border-default)] flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-tight">Version History</h2>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Click Restore to roll back to a previous version.</p>
              </div>
              <button 
                onClick={() => setShowVersionHistory(false)} 
                aria-label="Close version history"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {versionsLoading ? (
                <p className="text-[var(--text-muted)] text-sm text-center py-8">Loading versions...</p>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest">No version history yet</p>
                  <p className="text-[10px] mt-1">Versions are captured automatically when policies are edited.</p>
                </div>
              ) : versions.map((v: any) => (
                <div key={v.id || v.version} className="bg-gray-900/60 border border-[var(--border-default)] rounded-xl p-4 hover:border-indigo-500/30 transition-all text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">v{v.version}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{v.captured_at ? new Date(v.captured_at).toLocaleString() : ''}</span>
                    </div>
                    <button onClick={() => handleRollback(versionHistoryPolicyId!, v.version)} disabled={rollingBack} className="text-[9px] font-semibold uppercase text-[var(--text-muted)] hover:text-amber-400 border border-[var(--border-default)] hover:border-amber-500/30 px-2 py-1 rounded transition-all disabled:opacity-50">
                      {rollingBack ? '...' : 'Restore'}
                    </button>
                  </div>
                  {v.snapshot?.name && <p className="text-xs font-bold text-white mb-1">{v.snapshot.name}</p>}
                  {v.snapshot?.description && <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{v.snapshot.description}</p>}
                  {v.snapshot?.rules && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{Array.isArray(v.snapshot.rules) ? `${v.snapshot.rules.length} rules` : 'Rules captured'}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-6 shadow-2xl relative text-left">
            <button 
              onClick={() => setIsCreateOpen(false)}
              aria-label="Close create policy modal"
              className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-850 p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-semibold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Create Governance Policy
            </h3>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label htmlFor="policy-name-input" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Policy Name</label>
                <input 
                  id="policy-name-input"
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Policy Name" 
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="policy-desc-input" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  id="policy-desc-input"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description" 
                  rows={3}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label htmlFor="policy-effect-select" className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-1">Policy Effect</label>
                <select 
                  id="policy-effect-select"
                  value={newEffect}
                  onChange={e => setNewEffect(e.target.value as any)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                >
                  <option value="deny">deny</option>
                  <option value="allow">allow</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]/60">
                <button 
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-white text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  id="submit-create-policy-btn"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-semibold text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                >
                  {creating ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

