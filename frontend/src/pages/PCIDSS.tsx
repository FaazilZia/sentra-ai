import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { 
  Shield, ChevronRight, Save, Search, HelpCircle, FileText
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface PCIChapter {
  id: string;
  chapterNumber: string;
  title: string;
  description: string | null;
}

interface PCIImplementation {
  id: string;
  controlId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
}

interface PCIControl {
  id: string;
  chapterId: string;
  articleNumber: string;
  title: string;
  description: string | null;
  requirement: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
  notes: string | null;
  chapter?: PCIChapter;
  implementations?: PCIImplementation[];
}

interface PCIStats {
  total_controls: number;
  implemented: number;
  in_progress: number;
  not_started: number;
  not_applicable: number;
  compliance_score: number;
}

export default function PCIDSS() {
  const addToast = useStore((s) => s.addToast);
  const [stats, setStats] = useState<PCIStats | null>(null);
  const [chapters, setChapters] = useState<PCIChapter[]>([]);
  const [controls, setControls] = useState<PCIControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tab/Filter states
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Control update states
  const [editingControl, setEditingControl] = useState<PCIControl | null>(null);
  const [editStatus, setEditStatus] = useState<string>('NOT_STARTED');
  const [editNotes, setEditNotes] = useState<string>('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, chaptersRes, controlsRes] = await Promise.all([
        apiRequest<PCIStats>('/pci/stats'),
        apiRequest<PCIChapter[]>('/pci/chapters'),
        apiRequest<PCIControl[]>('/pci/controls'),
      ]);

      if (statsRes) setStats(statsRes);
      if (chaptersRes) {
        setChapters(chaptersRes);
      }
      if (controlsRes) {
        setControls(controlsRes);
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load PCI-DSS data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditControl = (ctrl: PCIControl) => {
    setEditingControl(ctrl);
    setEditStatus(ctrl.status || 'NOT_STARTED');
    setEditNotes(ctrl.notes || '');
  };

  const handleSaveControl = async () => {
    if (!editingControl) return;
    setSaving(true);
    try {
      await apiRequest(`/pci/controls/${editingControl.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
        })
      });
      addToast({ message: `Successfully updated ${editingControl.articleNumber}`, type: 'success' });
      setEditingControl(null);
      await loadData(true);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update control', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'IMPLEMENTED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'IN_PROGRESS':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'NOT_APPLICABLE':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-[var(--text-secondary)] bg-gray-500/10 border-gray-500/20';
    }
  };

  if (loading && chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-[var(--text-muted)]">
          <NodePulseLoader label="Loading PCI-DSS compliance space..." />
          <p className="text-xs font-semibold uppercase tracking-widest">Loading PCI-DSS Framework...</p>
        </div>
      </div>
    );
  }

    if (!loading && controls.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-fade-in text-[var(--text-secondary)]">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-[var(--royal-indigo)]" />
            PCI-DSS Framework Compliance
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Payment Card Industry Data Security Standard (PCI-DSS v4.0) Technical Controls
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <EmptyState 
            icon={Shield}
            title="No PCI-DSS Controls Seeded"
            description="Contact your administrator to initialise the PCI-DSS framework for your organisation."
          />
        </div>
      </div>
    );
  }

  const summary = stats || {
    total_controls: 0,
    implemented: 0,
    in_progress: 0,
    not_started: 0,
    not_applicable: 0,
    compliance_score: 0
  };

  const filteredControls = controls.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.requirement && c.requirement.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesChapter = selectedChapterId === 'ALL' || c.chapterId === selectedChapterId;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    
    return matchesSearch && matchesChapter && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-rose-400" />
          PCI-DSS Framework Compliance
        </h1>
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
          Payment Card Industry Data Security Standard (PCI-DSS v4.0) Technical Controls
        </p>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-6">
        <div className="md:col-span-1 flex items-center justify-center md:border-r md:border-[var(--border-default)] p-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="6" fill="transparent" />
              <circle 
                cx="50" cy="50" r="40" 
                stroke="#f43f5e" strokeWidth="6" fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 40}`} 
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - summary.compliance_score / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="text-center">
              <span className="text-3xl font-semibold text-[var(--text-primary)]">{summary.compliance_score}%</span>
              <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Posture Score</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Total Controls</span>
            <span className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{summary.total_controls}</span>
          </div>
          <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Implemented</span>
            <span className="text-2xl font-semibold text-emerald-400 mt-1">{summary.implemented}</span>
          </div>
          <div className="bg-amber-950/10 border border-amber-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-amber-500 uppercase">In Progress</span>
            <span className="text-2xl font-semibold text-amber-400 mt-1">{summary.in_progress}</span>
          </div>
          <div className="bg-blue-950/10 border border-blue-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-blue-500 uppercase">Not Applicable</span>
            <span className="text-2xl font-semibold text-blue-400 mt-1">{summary.not_applicable}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search PCI-DSS controls..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'IMPLEMENTED', 'IN_PROGRESS', 'NOT_STARTED', 'NOT_APPLICABLE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-semibold uppercase tracking-wider transition-all shrink-0",
                statusFilter === status 
                  ? "bg-rose-600 border-rose-500 text-white" 
                  : "bg-[var(--bg-page)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chapters Left Nav Panel */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-2 mb-1">Requirements</span>
          <button
            onClick={() => setSelectedChapterId('ALL')}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border text-left transition-all",
              selectedChapterId === 'ALL'
                ? "bg-rose-950/15 border-rose-500/30 text-[var(--text-primary)]"
                : "bg-[var(--bg-page)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover: "
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-tight">All Requirements</span>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>

          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChapterId(ch.id)}
              className={cn(
                "flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all",
                selectedChapterId === ch.id
                  ? "bg-rose-950/15 border-rose-500/30 text-[var(--text-primary)]"
                  : "bg-[var(--bg-page)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover: "
              )}
            >
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">{ch.chapterNumber}</span>
              <span className="text-xs font-semibold uppercase tracking-tight line-clamp-1">{ch.title}</span>
            </button>
          ))}
        </div>

        {/* Controls Middle Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1">
              Controls ({filteredControls.length})
            </span>
          </div>

          {filteredControls.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] border-dashed rounded-2xl p-12 text-center text-[var(--text-muted)]">
              <Shield className="h-8 w-8 mx-auto mb-3 text-gray-650" />
              <h4 className="text-xs font-semibold uppercase text-[var(--text-secondary)]">No Controls Found</h4>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Try relaxing filters or search query.</p>
            </div>
          ) : (
            filteredControls.map((ctrl) => (
              <div 
                key={ctrl.id} 
                className={cn(
                  "bg-[var(--bg-page)] border rounded-2xl p-5 flex flex-col gap-3.5 transition-all hover:border-[var(--border-default)]",
                  editingControl?.id === ctrl.id ? "border-rose-500/40 ring-1 ring-rose-500/20" : "border-[var(--border-default)]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                        {ctrl.articleNumber}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">{ctrl.title}</h4>
                    </div>
                    {ctrl.description && (
                      <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed mt-2">{ctrl.description}</p>
                    )}
                  </div>

                  <span className={cn('text-[9px] font-semibold uppercase px-2.5 py-1 rounded border shadow-sm shrink-0', statusColor(ctrl.status))}>
                    {ctrl.status.replace('_', ' ')}
                  </span>
                </div>

                {ctrl.requirement && (
                  <div className="bg-gray-950/20 border border-[var(--border-default)] rounded-xl p-3 text-[10px] text-[var(--text-secondary)] italic">
                    <span className="font-bold uppercase not-italic text-[8.5px] text-[var(--text-muted)] block mb-1">Requirement Overview</span>
                    {ctrl.requirement}
                  </div>
                )}

                {ctrl.notes && (
                  <div className="text-[10px] text-rose-350 flex items-start gap-1.5 bg-rose-950/5 border border-rose-950/20 rounded-xl p-3">
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold text-[8.5px] text-rose-400 uppercase block mb-0.5">Implementation Notes</span>
                      {ctrl.notes}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleEditControl(ctrl)}
                    className="px-3.5 py-1.5 rounded-xl border border-[var(--border-default)] hover:border-rose-500/30 bg-[var(--bg-page)] text-[9px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Update Panel */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl p-6 flex flex-col gap-6 sticky top-6">
            {!editingControl ? (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest mb-3">Regulatory Context</h3>
                  <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                    The Payment Card Industry Data Security Standard (PCI-DSS) ensures secure handling of cardholder accounts data and strict logical controls inside Cardholder Data Environments.
                  </p>
                </div>
                
                <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-4 text-[10px] text-rose-300 leading-relaxed">
                  <HelpCircle className="h-4 w-4 mb-1 text-rose-400 block animate-pulse" />
                  Sentraa AI validates logical separation parameters, PAN masking configurations, and database query restrictions to verify active compliance checks.
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">Update Control</h3>
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{editingControl.articleNumber} — {editingControl.title}</p>
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-status-select" className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Implementation Status</label>
                  <select
                    id="control-status-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-rose-500"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-notes" className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Implementation Notes</label>
                  <textarea
                    id="control-notes"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Enter compliance justification notes, evidence links, checklist completions..."
                    rows={8}
                    className="w-full bg-white border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingControl(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-white text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveControl} 
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-[10px] font-semibold text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Control
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
