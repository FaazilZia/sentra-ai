import { useState, useEffect } from 'react';
import { 
  Shield, ChevronRight, Save, Search, HelpCircle, RefreshCw, FileText
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface SOC2Chapter {
  id: string;
  chapterNumber: string;
  title: string;
  description: string | null;
}

interface SOC2Implementation {
  id: string;
  controlId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
}

interface SOC2Control {
  id: string;
  chapterId: string;
  articleNumber: string;
  title: string;
  description: string | null;
  requirement: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
  notes: string | null;
  chapter?: SOC2Chapter;
  implementations?: SOC2Implementation[];
}

interface SOC2Stats {
  total_controls: number;
  implemented: number;
  in_progress: number;
  not_started: number;
  not_applicable: number;
  compliance_score: number;
}

export default function SOC2() {
  const addToast = useStore((s) => s.addToast);
  const [stats, setStats] = useState<SOC2Stats | null>(null);
  const [chapters, setChapters] = useState<SOC2Chapter[]>([]);
  const [controls, setControls] = useState<SOC2Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tab/Filter states
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Control update states
  const [editingControl, setEditingControl] = useState<SOC2Control | null>(null);
  const [editStatus, setEditStatus] = useState<string>('NOT_STARTED');
  const [editNotes, setEditNotes] = useState<string>('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, chaptersRes, controlsRes] = await Promise.all([
        apiRequest<SOC2Stats>('/soc2/stats'),
        apiRequest<SOC2Chapter[]>('/soc2/chapters'),
        apiRequest<SOC2Control[]>('/soc2/controls'),
      ]);

      if (statsRes) setStats(statsRes);
      if (chaptersRes) {
        setChapters(chaptersRes);
      }
      if (controlsRes) {
        setControls(controlsRes);
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load SOC2 data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditControl = (ctrl: SOC2Control) => {
    setEditingControl(ctrl);
    setEditStatus(ctrl.status || 'NOT_STARTED');
    setEditNotes(ctrl.notes || '');
  };

  const handleSaveControl = async () => {
    if (!editingControl) return;
    setSaving(true);
    try {
      await apiRequest(`/soc2/controls/${editingControl.id}`, {
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
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (loading && chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-violet-500" />
          <p className="text-xs font-black uppercase tracking-widest">Loading SOC2 Framework...</p>
        </div>
      </div>
    );
  }

  if (!loading && controls.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-400" />
            SOC2 Framework Compliance
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
            System and Organization Controls (SOC 2) Trust Services Criteria Compliance
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="bg-[#111827]/40 border border-gray-800 rounded-2xl p-12 max-w-md w-full text-center backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 mx-auto mb-4 animate-pulse">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">No SOC 2 Controls Seeded</h3>
            <p className="text-xs text-gray-450 leading-relaxed">
              Contact your administrator to initialise the SOC 2 framework for your organisation.
            </p>
          </div>
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
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-violet-400" />
          SOC2 Framework Compliance
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
          System and Organization Controls (SOC 2) Trust Services Criteria Compliance
        </p>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#111827]/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="md:col-span-1 flex items-center justify-center md:border-r md:border-gray-850 p-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="6" fill="transparent" />
              <circle 
                cx="50" cy="50" r="40" 
                stroke="#a78bfa" strokeWidth="6" fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 40}`} 
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - summary.compliance_score / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="text-center">
              <span className="text-3xl font-black text-white">{summary.compliance_score}%</span>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Posture Score</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          <div className="bg-gray-900/40 border border-gray-850/60 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Total Controls</span>
            <span className="text-2xl font-black text-white mt-1">{summary.total_controls}</span>
          </div>
          <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Implemented</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">{summary.implemented}</span>
          </div>
          <div className="bg-amber-950/10 border border-amber-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-amber-500 uppercase">In Progress</span>
            <span className="text-2xl font-black text-amber-400 mt-1">{summary.in_progress}</span>
          </div>
          <div className="bg-blue-950/10 border border-blue-900/20 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-blue-500 uppercase">Not Applicable</span>
            <span className="text-2xl font-black text-blue-400 mt-1">{summary.not_applicable}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search SOC2 controls..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111827]/40 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'IMPLEMENTED', 'IN_PROGRESS', 'NOT_STARTED', 'NOT_APPLICABLE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all shrink-0",
                statusFilter === status 
                  ? "bg-violet-600 border-violet-500 text-white" 
                  : "bg-[#111827]/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white"
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
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-1">Trust Services</span>
          <button
            onClick={() => setSelectedChapterId('ALL')}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border text-left transition-all",
              selectedChapterId === 'ALL'
                ? "bg-violet-950/15 border-violet-500/30 text-white"
                : "bg-[#111827]/40 border-gray-800 text-gray-400 hover:border-gray-750 hover:text-gray-200"
            )}
          >
            <span className="text-xs font-black uppercase tracking-tight">All Criteria</span>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>

          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChapterId(ch.id)}
              className={cn(
                "flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all",
                selectedChapterId === ch.id
                  ? "bg-violet-950/15 border-violet-500/30 text-white"
                  : "bg-[#111827]/40 border-gray-800 text-gray-400 hover:border-gray-750 hover:text-gray-200"
              )}
            >
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">{ch.chapterNumber}</span>
              <span className="text-xs font-black uppercase tracking-tight line-clamp-1">{ch.title}</span>
            </button>
          ))}
        </div>

        {/* Controls Middle Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
              Criteria Controls ({filteredControls.length})
            </span>
          </div>

          {filteredControls.length === 0 ? (
            <div className="bg-[#111827]/20 border border-gray-800 border-dashed rounded-2xl p-12 text-center text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-3 text-gray-650" />
              <h4 className="text-xs font-black uppercase text-gray-400">No Controls Found</h4>
              <p className="text-[10px] text-gray-500 mt-1">Try relaxing filters or search query.</p>
            </div>
          ) : (
            filteredControls.map((ctrl) => (
              <div 
                key={ctrl.id} 
                className={cn(
                  "bg-[#111827]/40 border rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3.5 transition-all hover:border-gray-700",
                  editingControl?.id === ctrl.id ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-gray-800"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-bold text-violet-400 bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10">
                        {ctrl.articleNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-tight">{ctrl.title}</h4>
                    </div>
                    {ctrl.description && (
                      <p className="text-[10.5px] text-gray-400 leading-relaxed mt-2">{ctrl.description}</p>
                    )}
                  </div>

                  <span className={cn('text-[9px] font-black uppercase px-2.5 py-1 rounded border shadow-sm shrink-0', statusColor(ctrl.status))}>
                    {ctrl.status.replace('_', ' ')}
                  </span>
                </div>

                {ctrl.requirement && (
                  <div className="bg-gray-950/20 border border-gray-850 rounded-xl p-3 text-[10px] text-gray-400 italic">
                    <span className="font-bold uppercase not-italic text-[8.5px] text-gray-500 block mb-1">Requirement Overview</span>
                    {ctrl.requirement}
                  </div>
                )}

                {ctrl.notes && (
                  <div className="text-[10px] text-violet-350 flex items-start gap-1.5 bg-violet-950/5 border border-violet-950/20 rounded-xl p-3">
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-violet-400 shrink-0" />
                    <div>
                      <span className="font-bold text-[8.5px] text-violet-400 uppercase block mb-0.5">Implementation Notes</span>
                      {ctrl.notes}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleEditControl(ctrl)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-800 hover:border-violet-500/30 bg-gray-900/40 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest active:scale-95 transition-all"
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
          <div className="bg-[#111827]/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 sticky top-6">
            {!editingControl ? (
              <>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">Regulatory Context</h3>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed">
                    SOC 2 compliance evaluates an organization's controls based on five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy.
                  </p>
                </div>
                
                <div className="bg-violet-950/10 border border-violet-900/30 rounded-xl p-4 text-[10px] text-violet-300 leading-relaxed">
                  <HelpCircle className="h-4 w-4 mb-1 text-violet-400 block animate-pulse" />
                  Sentra AI maps logical access boundaries, vulnerability checks, and automated systems resilience directly to Trust Services Criteria.
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Update Control</h3>
                  <p className="text-[10px] font-mono text-violet-400 mt-1">{editingControl.articleNumber} — {editingControl.title}</p>
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-status-select" className="text-[10px] font-bold text-gray-500 uppercase">Implementation Status</label>
                  <select
                    id="control-status-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-notes" className="text-[10px] font-bold text-gray-500 uppercase">Implementation Notes</label>
                  <textarea
                    id="control-notes"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Enter compliance justification notes, evidence links, checklist completions..."
                    rows={8}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-700 resize-none focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingControl(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-900 text-[10px] font-black text-gray-400 uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveControl} 
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
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
