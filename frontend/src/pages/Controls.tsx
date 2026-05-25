import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Search, Filter, BookOpen, CheckCircle2, 
  Edit, X, ListTodo
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface ControlImplementation {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
  evidence: Array<Record<string, any>>;
  notes: string | null;
  due_date: string | null;
}

interface Control {
  id: string;
  framework: string;
  control_id: string;
  title: string;
  description: string;
  category: string;
  control_implementations: ControlImplementation[];
}

export default function Controls() {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('ALL');
  
  // Implementation Update Modal State
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [status, setStatus] = useState<ControlImplementation['status']>('NOT_STARTED');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceList, setEvidenceList] = useState<Array<Record<string, any>>>([]);

  useEffect(() => {
    loadControls();
  }, []);

  const loadControls = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: Control[] }>('/governance/controls');
      setControls(res.items || []);
    } catch (err) {
      console.error('Failed to load controls library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpdate = (ctrl: Control) => {
    setSelectedControl(ctrl);
    const impl = ctrl.control_implementations?.[0];
    setStatus(impl?.status || 'NOT_STARTED');
    setNotes(impl?.notes || '');
    setDueDate(impl?.due_date ? new Date(impl.due_date).toISOString().split('T')[0] : '');
    setEvidenceList(impl?.evidence || []);
    setEvidenceName('');
    setEvidenceUrl('');
  };

  const handleAddEvidence = () => {
    if (!evidenceName) return;
    setEvidenceList([
      ...evidenceList,
      { name: evidenceName, url: evidenceUrl || '#', date: new Date().toLocaleDateString() }
    ]);
    setEvidenceName('');
    setEvidenceUrl('');
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index));
  };

  const handleSaveImplementation = async () => {
    if (!selectedControl) return;

    try {
      await apiRequest(`/governance/controls/implementations/${selectedControl.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          notes,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
          evidence: evidenceList
        })
      });
      setSelectedControl(null);
      loadControls();
    } catch (err) {
      console.error('Failed to update control implementation:', err);
    }
  };

  const getFrameworkLabel = (fw: string) => {
    switch (fw) {
      case 'EU_AI_ACT': return 'EU AI Act';
      case 'NIST_AI_RMF': return 'NIST AI RMF';
      case 'ISO_42001': return 'ISO/IEC 42001';
      default: return fw.replaceAll('_', ' ');
    }
  };

  const getStatusBadgeColor = (st?: string) => {
    switch (st) {
      case 'IMPLEMENTED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'IN_PROGRESS': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'NOT_APPLICABLE': return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    }
  };

  // Group controls for stats
  const uniqueFrameworks = Array.from(new Set(controls.map(c => c.framework)));
  const filteredControls = controls.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.control_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFw = frameworkFilter === 'ALL' || c.framework === frameworkFilter;
    return matchesSearch && matchesFw;
  });

  // Calculate progress stats by framework
  const getProgressStats = (fw: string) => {
    const fwCtrls = controls.filter(c => c.framework === fw);
    const total = fwCtrls.length;
    if (total === 0) return { percent: 0, implemented: 0, total: 0 };
    const implemented = fwCtrls.filter(c => c.control_implementations?.[0]?.status === 'IMPLEMENTED').length;
    const percent = Math.round((implemented / total) * 100);
    return { percent, implemented, total };
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <PageHeader 
        title="Governance & Controls Library"
        description="Track alignment, compliance implementation states, and operational evidence mapping for standard AI frameworks."
      />

      {/* Framework Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {uniqueFrameworks.map((fw) => {
          const stats = getProgressStats(fw);
          return (
            <div key={fw} className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{getFrameworkLabel(fw)}</span>
                <span className="text-xs font-mono font-black text-indigo-400">{stats.percent}% MET</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase">{stats.implemented} of {stats.total} controls verified</span>
            </div>
          );
        })}
      </div>

      {/* Control List Operations */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#111827]/20 border border-gray-800/40 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search controls by title, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="bg-[#111827]/60 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Frameworks</option>
            {uniqueFrameworks.map(fw => (
              <option key={fw} value={fw}>{getFrameworkLabel(fw)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Controls Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : filteredControls.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-xs">
          No controls match the filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredControls.map((ctrl) => {
            const impl = ctrl.control_implementations?.[0];
            return (
              <div
                key={ctrl.id}
                className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4 hover:bg-[#111827]/80 hover:border-gray-700 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 font-mono uppercase tracking-widest">{ctrl.control_id}</span>
                    <h3 className="font-bold text-white text-sm mt-0.5">{ctrl.title}</h3>
                  </div>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase ${getStatusBadgeColor(impl?.status)}`}>
                    {impl?.status || 'NOT_STARTED'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{ctrl.description}</p>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-800/40 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1.5 font-bold uppercase"><BookOpen className="h-3.5 w-3.5" /> {getFrameworkLabel(ctrl.framework)}</span>
                  <button
                    onClick={() => handleOpenUpdate(ctrl)}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <Edit className="h-3 w-3" /> Update Compliance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Implementation Modal */}
      {selectedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 font-mono uppercase tracking-widest">{selectedControl.control_id}</span>
                <h3 className="font-bold text-white text-sm mt-0.5">{selectedControl.title}</h3>
              </div>
              <button
                onClick={() => setSelectedControl(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              
              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <span className="text-gray-400 font-semibold">Compliance Status *</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 px-1 rounded-xl border text-center font-bold tracking-tight text-[10px] transition-all uppercase ${
                        status === st ? 'bg-indigo-950/20 border-indigo-500 text-indigo-300' : 'bg-black/30 border-gray-800 text-gray-500'
                      }`}
                    >
                      {st.replaceAll('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="control-notes" className="text-gray-400 font-semibold">Notes / Implementation Details</label>
                <textarea
                  id="control-notes"
                  placeholder="Describe how your AI systems implement or comply with this control safeguard..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                />
              </div>
 
              {/* Due date */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="control-due-date" className="text-gray-400 font-semibold">Compliance Due Date</label>
                <input
                  id="control-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Evidence */}
              <div className="flex flex-col gap-1.5 border-t border-gray-800/80 pt-4 mt-1">
                <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-purple-400" />
                  Compliance Evidence Audit Trail
                </span>
                
                {/* Form fields for new evidence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  <input
                    type="text"
                    aria-label="Evidence name"
                    placeholder="Evidence name (e.g. LLM Guardrail Logs)"
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label="URL or Reference Link"
                      placeholder="URL/Reference Link (optional)"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="bg-black/30 border border-gray-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500 flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddEvidence}
                      className="bg-purple-950/20 border border-purple-500/40 hover:border-purple-400 hover:text-purple-300 text-purple-400 px-3 rounded-xl font-bold transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Evidence List */}
                {evidenceList.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3 bg-black/20 p-3 rounded-xl border border-gray-800/60 max-h-[140px] overflow-y-auto">
                    {evidenceList.map((ev, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 p-2 bg-[#0b0f19]/30 rounded-lg border border-gray-800/40 text-[10px]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="font-semibold text-white truncate max-w-[200px]">{ev.name}</span>
                          <span className="text-gray-500 font-mono">({ev.date})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(index)}
                          className="text-red-400 hover:text-red-300 p-0.5 hover:bg-gray-800 rounded transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="bg-[#0f172a]/60 border-t border-gray-800 p-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedControl(null)}
                className="rounded-xl border border-gray-800 px-5 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImplementation}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                Save Compliance Safeguard
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
