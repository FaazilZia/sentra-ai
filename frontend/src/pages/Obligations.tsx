import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  ListTodo, Search, Filter, 
  Calendar, Link as LinkIcon, Edit, Save, X
} from 'lucide-react';

interface Control {
  id: string;
  control_id: string;
  title: string;
  framework: string;
}

interface Obligation {
  id: string;
  framework: string;
  article_or_task: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'MET' | 'NOT_APPLICABLE';
  owner_user_id: string | null;
  deadline: string | null;
  linked_control_id: string | null;
  control?: Control | null;
}

export default function Obligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('ALL');
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Obligation['status']>('PENDING');
  const [editDeadline, setEditDeadline] = useState('');
  const [editControlId, setEditControlId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [obRes, ctrlRes] = await Promise.all([
        apiRequest<{ items: Obligation[] }>('/governance/compliance/obligations'),
        apiRequest<{ items: Control[] }>('/governance/controls')
      ]);
      setObligations(obRes.items || []);
      setControls(ctrlRes.items || []);
    } catch (err) {
      console.error('Failed to load compliance obligations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (ob: Obligation) => {
    setEditingId(ob.id);
    setEditStatus(ob.status);
    setEditDeadline(ob.deadline ? new Date(ob.deadline).toISOString().split('T')[0] : '');
    setEditControlId(ob.linked_control_id || '');
  };

  const handleSave = async (id: string) => {
    try {
      const updated = await apiRequest<Obligation>(`/governance/compliance/obligations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
          linked_control_id: editControlId || ''
        })
      });
      setObligations(obligations.map(o => o.id === id ? updated : o));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update obligation:', err);
    }
  };

  const getFrameworkLabel = (fw: string) => {
    switch (fw) {
      case 'EU_AI_ACT': return 'EU AI Act';
      case 'NIST_AI_RMF': return 'NIST AI RMF';
      default: return fw.replaceAll('_', ' ');
    }
  };

  const getStatusBadgeColor = (st: string) => {
    switch (st) {
      case 'MET': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'IN_PROGRESS': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'NOT_APPLICABLE': return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    }
  };

  const uniqueFrameworks = Array.from(new Set(obligations.map(o => o.framework)));
  const filteredObligations = obligations.filter(o => {
    const matchesSearch = o.article_or_task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFw = frameworkFilter === 'ALL' || o.framework === frameworkFilter;
    return matchesSearch && matchesFw;
  });

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <ListTodo className="h-8 w-8 text-indigo-400" />
          COMPLIANCE OBLIGATION TRACKER
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Monitor and track article-level or task-level legal obligations from global regulatory frameworks.
        </p>
      </div>

      {/* Operations Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-[#111827]/20 border border-gray-800/40 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by article title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
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

      {/* Obligations List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : filteredObligations.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-xs">
          No compliance obligations match the filters.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredObligations.map((ob) => {
            const isEditing = editingId === ob.id;
            return (
              <div
                key={ob.id}
                className={`bg-[#111827]/40 border rounded-2xl p-6 flex flex-col gap-4 transition-all relative overflow-hidden group ${
                  isEditing ? 'border-indigo-500/50 bg-[#111827]/80' : 'border-gray-800/80 hover:border-gray-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 font-mono uppercase tracking-widest">{getFrameworkLabel(ob.framework)}</span>
                    <h3 className="font-bold text-white text-base mt-0.5">{ob.article_or_task}</h3>
                  </div>

                  {!isEditing ? (
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase ${getStatusBadgeColor(ob.status)}`}>
                      {ob.status}
                    </span>
                  ) : (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="bg-black/40 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white focus:outline-none uppercase"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="MET">MET</option>
                      <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                    </select>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">{ob.description}</p>

                {/* Integration Details / Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0b0f19]/30 border border-gray-800/40 p-4 rounded-xl text-[10px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Compliance Deadline:</span>
                    {!isEditing ? (
                      <span className="text-white font-semibold">{ob.deadline ? new Date(ob.deadline).toLocaleDateString() : 'None'}</span>
                    ) : (
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="bg-black/40 border border-gray-800 rounded px-2 py-0.5 text-white focus:outline-none text-[10px]"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-gray-500" />
                    <span>Linked Control Safeguard:</span>
                    {!isEditing ? (
                      <span className="text-indigo-400 font-semibold">{ob.control ? `${ob.control.control_id} - ${ob.control.title}` : 'Unlinked'}</span>
                    ) : (
                      <select
                        value={editControlId}
                        onChange={(e) => setEditControlId(e.target.value)}
                        className="bg-black/40 border border-gray-800 rounded px-2 py-0.5 text-white focus:outline-none text-[10px] max-w-[200px]"
                      >
                        <option value="">Unlinked / None</option>
                        {controls.filter(c => c.framework === ob.framework).map(c => (
                          <option key={c.id} value={c.id}>{c.control_id} - {c.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="border-t border-gray-800/40 pt-3 mt-1 flex items-center justify-end gap-2 text-[10px]">
                  {!isEditing ? (
                    <button
                      onClick={() => handleStartEdit(ob)}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Obligation Status
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-white font-semibold flex items-center gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                      <button
                        onClick={() => handleSave(ob.id)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
