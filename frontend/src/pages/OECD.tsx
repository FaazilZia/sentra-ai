import { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp,
  Save, Search, HelpCircle, RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface OECDControl {
  control_code: string;
  title: string;
  description: string;
  evidence_required: string[];
  checklist_items: string[];
  implementation: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
    notes: string | null;
    due_date: string | null;
    last_reviewed: string | null;
  } | null;
}

interface OECDSection {
  section_code: string;
  title: string;
  description: string;
  section_type: string;
  controls: OECDControl[];
}

interface OECDOverview {
  sections: OECDSection[];
  summary: {
    total_controls: number;
    implemented: number;
    in_progress: number;
    not_started: number;
    not_applicable: number;
    compliance_score: number;
  };
}

export default function OECD() {
  const addToast = useStore((s) => s.addToast);
  const [data, setData] = useState<OECDOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'OECD-P1': true,
  });
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Control update states
  const [editingControl, setEditingControl] = useState<OECDControl | null>(null);
  const [editStatus, setEditStatus] = useState<string>('NOT_STARTED');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiRequest<OECDOverview>('/oecd/overview');
      if (res) {
        setData(res);
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load OECD data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleSection = (code: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const handleEditControl = (ctrl: OECDControl) => {
    setEditingControl(ctrl);
    setEditStatus(ctrl.implementation?.status || 'NOT_STARTED');
    setEditNotes(ctrl.implementation?.notes || '');
    setEditDueDate(ctrl.implementation?.due_date ? new Date(ctrl.implementation.due_date).toISOString().split('T')[0] : '');
  };

  const handleSaveControl = async () => {
    if (!editingControl || !data) return;
    setSaving(true);
    try {
      await apiRequest(`/oecd/controls/${editingControl.control_code}/implementation`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
          due_date: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        })
      });
      addToast({ message: `Successfully updated control ${editingControl.control_code}`, type: 'success' });
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="text-xs font-black uppercase tracking-widest">Loading OECD Governance...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total_controls: 0,
    implemented: 0,
    in_progress: 0,
    not_started: 0,
    not_applicable: 0,
    compliance_score: 0
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          OECD AI Principles
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
          OECD Recommendation on Artificial Intelligence Compliance OS
        </p>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#111827]/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="md:col-span-1 flex items-center justify-center md:border-r md:border-gray-850 p-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="6" fill="transparent" />
              <circle 
                cx="50" cy="50" r="40" 
                stroke="#6366f1" strokeWidth="6" fill="transparent" 
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
          <div className="bg-gray-900/40 border border-gray-855 rounded-xl p-4 flex flex-col justify-between">
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
            placeholder="Search OECD controls..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111827]/40 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'IMPLEMENTED', 'IN_PROGRESS', 'NOT_STARTED', 'NOT_APPLICABLE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                statusFilter === status 
                  ? "bg-indigo-600 border-indigo-500 text-white" 
                  : "bg-[#111827]/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white"
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sections Checklist */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {data?.sections.map((section) => {
            const isExpanded = expandedSections[section.section_code];
            
            // Filter controls based on search query and status filter
            const filteredControls = section.controls.filter(c => {
              const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    c.control_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    c.description.toLowerCase().includes(searchQuery.toLowerCase());
              
              const currentStatus = c.implementation?.status || 'NOT_STARTED';
              const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
              
              return matchesSearch && matchesStatus;
            });

            if (filteredControls.length === 0 && searchQuery !== '') return null;

            const sectionTotal = section.controls.length;
            const sectionCompleted = section.controls.filter(c => c.implementation?.status === 'IMPLEMENTED' || c.implementation?.status === 'NOT_APPLICABLE').length;

            return (
              <div key={section.section_code} className="bg-[#111827]/40 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-md">
                {/* Header */}
                <button 
                  onClick={() => toggleSection(section.section_code)}
                  className="w-full flex items-center justify-between p-5 bg-gray-900/20 hover:bg-gray-900/40 border-b border-gray-850/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="h-6 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                      {section.section_code}
                    </span>
                    <div className="text-left">
                      <h3 className="text-xs font-black text-white uppercase tracking-tight">{section.title}</h3>
                      <p className="text-[10px] text-gray-500 max-w-md line-clamp-1">{section.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Section Progress</span>
                      <p className="text-[10px] font-bold text-white mt-0.5">{sectionCompleted}/{sectionTotal} controls</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </div>
                </button>

                {/* Controls List */}
                {isExpanded && (
                  <div className="p-5 flex flex-col gap-4">
                    {filteredControls.map((ctrl) => {
                      const currentStatus = ctrl.implementation?.status || 'NOT_STARTED';
                      return (
                        <div key={ctrl.control_code} className="bg-gray-950/20 border border-gray-855 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                {ctrl.control_code}
                              </span>
                              <h4 className="text-xs font-bold text-white uppercase tracking-tight">{ctrl.title}</h4>
                            </div>
                            <p className="text-[10.5px] text-gray-400 leading-relaxed mt-1.5">{ctrl.description}</p>
                            
                            {/* Checklist & Evidence Required */}
                            {ctrl.checklist_items.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {ctrl.checklist_items.map((item, idx) => (
                                  <span key={idx} className="text-[9px] bg-gray-900 border border-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                                    ✓ {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                            <span className={cn('text-[9px] font-black uppercase px-2.5 py-1 rounded border shadow-sm', statusColor(currentStatus))}>
                              {currentStatus.replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => handleEditControl(ctrl)}
                              className="px-3 py-1.5 rounded-xl border border-gray-800 hover:border-indigo-500/30 bg-gray-900/40 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest active:scale-95 transition-all"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Panel for Editing & Context */}
        <div className="lg:col-span-1">
          <div className="bg-[#111827]/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 sticky top-6">
            {!editingControl ? (
              <>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">Regulatory Context</h3>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed">
                    The OECD AI Principles foster trust in AI by promoting principles like inclusive growth, human-centric values, fairness, transparency, robustness, security, and accountability.
                  </p>
                </div>
                
                <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-4 text-[10px] text-indigo-300 leading-relaxed">
                  <HelpCircle className="h-4 w-4 mb-1 text-indigo-400 block animate-pulse" />
                  Sentra AI maps algorithmic fairness logs, user interaction disclosures, and model cards against OECD Principles to guarantee trustworthy operations.
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Update Control</h3>
                  <p className="text-[10px] font-mono text-indigo-400 mt-1">{editingControl.control_code} — {editingControl.title}</p>
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-status-select" className="text-[10px] font-bold text-gray-500 uppercase">Implementation Status</label>
                  <select
                    id="control-status-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-due-date" className="text-[10px] font-bold text-gray-500 uppercase">Due Date</label>
                  <input
                    id="control-due-date"
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="control-notes" className="text-[10px] font-bold text-gray-500 uppercase">Implementation Notes</label>
                  <textarea
                    id="control-notes"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Enter compliance justification notes, evidence links, checklist completions..."
                    rows={5}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-700 resize-none focus:outline-none focus:border-indigo-500"
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
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
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
