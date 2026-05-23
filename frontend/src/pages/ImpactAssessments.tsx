import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Columns, Plus, X, ArrowRight, CheckCircle2, AlertTriangle, 
  FileText, ShieldAlert, User, Cpu, Sparkles, Building, ChevronRight
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface AISystem {
  id: string;
  name: string;
  risk_tier: string;
}

interface ImpactAssessment {
  id: string;
  type: 'DPIA' | 'AIA';
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  form_data: {
    description?: string;
    benefits?: string;
    data_protection?: string;
    oversight?: string;
  };
  submitted_by: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  ai_system: AISystem;
}

export default function ImpactAssessments() {
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([]);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [type, setType] = useState<'DPIA' | 'AIA'>('DPIA');
  const [formData, setFormData] = useState({
    description: '',
    benefits: '',
    data_protection: '',
    oversight: ''
  });

  // Card View State
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assRes, sysRes] = await Promise.all([
        apiRequest<{ items: ImpactAssessment[] }>('/governance/impact-assessments'),
        apiRequest<{ items: AISystem[] }>('/ai-systems')
      ]);
      setAssessments(assRes.items || []);
      setSystems(sysRes.items || []);
    } catch (err) {
      console.error('Failed to load impact assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<ImpactAssessment>('/governance/impact-assessments', {
        method: 'POST',
        body: JSON.stringify({
          ai_system_id: selectedSystemId,
          type,
          form_data: formData
        })
      });
      
      // Auto-submit into IN_REVIEW
      const updated = await apiRequest<ImpactAssessment>(`/governance/impact-assessments/${res.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_REVIEW' })
      });

      setAssessments([updated, ...assessments]);
      setIsOpen(false);
      setSelectedSystemId('');
      setFormData({ description: '', benefits: '', data_protection: '', oversight: '' });
    } catch (err) {
      console.error('Failed to create impact assessment:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const updated = await apiRequest<ImpactAssessment>(`/governance/impact-assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setAssessments(assessments.map(a => a.id === id ? updated : a));
      if (selectedAssessment?.id === id) {
        setSelectedAssessment(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const columns: Array<{ title: string; status: ImpactAssessment['status']; color: string; border: string }> = [
    { title: 'Draft', status: 'DRAFT', color: 'bg-gray-500/5', border: 'border-gray-800' },
    { title: 'In Review', status: 'IN_REVIEW', color: 'bg-indigo-500/5', border: 'border-indigo-900/40' },
    { title: 'Approved', status: 'APPROVED', color: 'bg-emerald-500/5', border: 'border-emerald-900/40' },
    { title: 'Rejected', status: 'REJECTED', color: 'bg-red-500/5', border: 'border-red-900/40' }
  ];

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <PageHeader 
        title="Impact Assessments (DPIA / AIA)"
        description="Conduct Data Protection Impact Assessments (DPIA) and Algorithmic Impact Assessments (AIA) inside a dynamic Kanban review workflow."
        action={
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Launch Assessment
          </button>
        }
      />

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {columns.map((col) => {
            const list = assessments.filter(a => a.status === col.status);
            return (
              <div
                key={col.status}
                className={`rounded-2xl border ${col.border} ${col.color} p-4 flex flex-col gap-4 min-h-[500px]`}
              >
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">{col.title}</h3>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full border border-gray-800 text-gray-500 font-bold">
                    {list.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">
                  {list.map((ass) => (
                    <div
                      key={ass.id}
                      onClick={() => setSelectedAssessment(ass)}
                      className="bg-[#111827]/40 border border-gray-800/60 hover:border-indigo-500/40 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ass.type === 'DPIA' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {ass.type}
                        </span>
                        <span className="text-[10px] text-gray-500">{new Date(ass.created_at).toLocaleDateString()}</span>
                      </div>

                      <h4 className="font-bold text-white text-sm mt-2 line-clamp-1">{ass.ai_system?.name || 'Unknown System'}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{ass.form_data.description || 'No description entered.'}</p>
                      
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-800/40 text-[10px] text-gray-500">
                        <User className="h-3 w-3" />
                        <span className="truncate">{ass.submitted_by || 'Anonymous'}</span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-gray-600 border border-dashed border-gray-800/40 rounded-xl">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Launch Assessment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Launch Impact Assessment
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="target-ai-system" className="text-gray-400 font-semibold">Select Target AI System *</label>
                  <select
                    id="target-ai-system"
                    required
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">Choose System...</option>
                    {systems.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.risk_tier} Risk)</option>
                    ))}
                  </select>
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-gray-400 font-semibold">Assessment Type *</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('DPIA')}
                      className={`py-2 px-4 rounded-xl border text-center font-semibold transition-all ${
                        type === 'DPIA' ? 'bg-indigo-950/20 border-indigo-500 text-indigo-300' : 'bg-black/30 border-gray-800 text-gray-400'
                      }`}
                    >
                      DPIA (Data Protection)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('AIA')}
                      className={`py-2 px-4 rounded-xl border text-center font-semibold transition-all ${
                        type === 'AIA' ? 'bg-purple-950/20 border-purple-500 text-purple-300' : 'bg-black/30 border-gray-800 text-gray-400'
                      }`}
                    >
                      AIA (Algorithmic)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-description" className="text-gray-400 font-semibold">Description of AI Pipeline *</label>
                  <textarea
                    id="pipeline-description"
                    required
                    placeholder="Provide details on model operations, data flows, and pipeline inputs..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-benefits" className="text-gray-400 font-semibold">Anticipated Usecase Benefits *</label>
                  <textarea
                    id="pipeline-benefits"
                    required
                    placeholder="List expected functional, speed, or performance utility gains..."
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-protection" className="text-gray-400 font-semibold">Data Protection & Privacy Safeguards *</label>
                  <textarea
                    id="pipeline-protection"
                    required
                    placeholder="Detail active masking, filter APIs, retention controls, or PII scrubbers..."
                    value={formData.data_protection}
                    onChange={(e) => setFormData({ ...formData, data_protection: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-oversight" className="text-gray-400 font-semibold">Human Oversight & Fallback Protocols *</label>
                  <textarea
                    id="pipeline-oversight"
                    required
                    placeholder="Explain audit rules, human queues, veto options, and panic-stop configurations..."
                    value={formData.oversight}
                    onChange={(e) => setFormData({ ...formData, oversight: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review / Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{selectedAssessment.type} Assessment</span>
                <h3 className="font-bold text-white text-base mt-0.5">{selectedAssessment.ai_system?.name || 'AI System'}</h3>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto text-gray-300">
              <div>
                <h4 className="font-bold text-white mb-1 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-400" /> Pipeline Description</h4>
                <p className="bg-[#0b0f19]/30 border border-gray-800 p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1 flex items-center gap-1.5"><Building className="h-4 w-4 text-purple-400" /> Anticipated Benefits</h4>
                <p className="bg-[#0b0f19]/30 border border-gray-800 p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.benefits}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-blue-400" /> Privacy & Protection</h4>
                <p className="bg-[#0b0f19]/30 border border-gray-800 p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.data_protection}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Human Oversight</h4>
                <p className="bg-[#0b0f19]/30 border border-gray-800 p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.oversight}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-800/80 pt-4 mt-1 text-[10px] text-gray-500">
                <span>Submitted by: <span className="text-white font-semibold">{selectedAssessment.submitted_by}</span></span>
                <span>Date: <span className="text-white font-semibold">{new Date(selectedAssessment.created_at).toLocaleString()}</span></span>
              </div>
            </div>

            {selectedAssessment.status === 'IN_REVIEW' && (
              <div className="bg-[#0f172a]/60 border-t border-gray-800 p-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleUpdateStatus(selectedAssessment.id, 'REJECTED')}
                  className="rounded-xl border border-red-500/30 px-5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Flag / Reject
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAssessment.id, 'APPROVED')}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all"
                >
                  Approve Assessment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
