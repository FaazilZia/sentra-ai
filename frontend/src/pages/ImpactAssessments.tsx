import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Plus, X, CheckCircle2, FileText, ShieldAlert, 
  User, Sparkles, Building, ArrowRight, ArrowLeft,
  AlertTriangle, HelpCircle, FileCheck
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

interface FriaResponse {
  id: string;
  question_code: string;
  question_text: string;
  answer: string;
  risk_flag: boolean;
  notes: string | null;
}

interface FriaAssessment {
  id: string;
  ai_system_id: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  ai_system: AISystem;
  responses: FriaResponse[];
}

export default function ImpactAssessments() {
  const [activeTab, setActiveTab] = useState<'DPIA_AIA' | 'FRIA'>('DPIA_AIA');
  
  // DPIA/AIA State
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([]);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State DPIA/AIA
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [type, setType] = useState<'DPIA' | 'AIA'>('DPIA');
  const [formData, setFormData] = useState({
    description: '',
    benefits: '',
    data_protection: '',
    oversight: ''
  });
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null);

  // FRIA State
  const [friaAssessments, setFriaAssessments] = useState<FriaAssessment[]>([]);
  const [isFriaOpen, setIsFriaOpen] = useState(false);
  const [friaSystemId, setFriaSystemId] = useState('');
  const [currentFria, setCurrentFria] = useState<FriaAssessment | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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
      console.error('Failed to load assessments:', err);
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
      
      const updated = await apiRequest<ImpactAssessment>(`/governance/impact-assessments/${res.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_REVIEW' })
      });

      setAssessments([updated, ...assessments]);
      setIsOpen(false);
      setSelectedSystemId('');
      setFormData({ description: '', benefits: '', data_protection: '', oversight: '' });
    } catch (err) {
      console.error('Failed to create DPIA:', err);
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

  // --- FRIA Handlers ---
  const handleLaunchFria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friaSystemId) return;
    try {
      const newFria = await apiRequest<FriaAssessment>('/fria/assessments', {
        method: 'POST',
        body: JSON.stringify({ aiSystemId: friaSystemId })
      });
      setFriaAssessments([newFria, ...friaAssessments]);
      setIsFriaOpen(false);
      // Immediately open in Wizard
      openFriaWizard(newFria.id);
    } catch (err) {
      console.error('Failed to launch FRIA:', err);
    }
  };

  const openFriaWizard = async (id: string) => {
    try {
      const fullFria = await apiRequest<FriaAssessment>(`/fria/assessments/${id}`);
      setCurrentFria(fullFria);
      setCurrentQuestionIndex(0);
    } catch (err) {
      console.error('Failed to load FRIA details:', err);
    }
  };

  const handleUpdateFriaResponse = (field: 'answer' | 'notes' | 'risk_flag', value: any) => {
    if (!currentFria) return;
    const updatedResponses = [...currentFria.responses];
    const item = updatedResponses[currentQuestionIndex];
    if (field === 'risk_flag') {
      item.risk_flag = value;
    } else if (field === 'notes') {
      item.notes = value;
    } else {
      item.answer = value;
    }
    setCurrentFria({
      ...currentFria,
      responses: updatedResponses
    });
  };

  const saveFriaProgress = async (complete: boolean = false) => {
    if (!currentFria) return;
    try {
      // Save all current responses to backend
      const payload = currentFria.responses.map(r => ({
        question_code: r.question_code,
        answer: r.answer,
        risk_flag: r.risk_flag,
        notes: r.notes || ''
      }));

      await apiRequest(`/fria/assessments/${currentFria.id}/responses`, {
        method: 'PATCH',
        body: JSON.stringify({ responses: payload })
      });

      if (complete) {
        const completedFria = await apiRequest<FriaAssessment>(`/fria/assessments/${currentFria.id}/complete`, {
          method: 'POST'
        });
        setFriaAssessments(friaAssessments.map(f => f.id === currentFria.id ? completedFria : f));
        setCurrentFria(null);
      } else {
        // Just fetch updated assessment to sync
        const updated = await apiRequest<FriaAssessment>(`/fria/assessments/${currentFria.id}`);
        setFriaAssessments(friaAssessments.map(f => f.id === currentFria.id ? updated : f));
      }
    } catch (err) {
      console.error('Failed to save FRIA responses:', err);
    }
  };

  const columns: Array<{ title: string; status: ImpactAssessment['status']; color: string; border: string }> = [
    { title: 'Draft', status: 'DRAFT', color: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-strong)]' },
    { title: 'In Review', status: 'IN_REVIEW', color: 'bg-[var(--bg-secondary)]', border: 'border-indigo-500/30' },
    { title: 'Approved', status: 'APPROVED', color: 'bg-[var(--bg-secondary)]', border: 'border-emerald-500/30' },
    { title: 'Rejected', status: 'REJECTED', color: 'bg-[var(--bg-secondary)]', border: 'border-red-500/30' }
  ];

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      
      {/* Header section */}
      <PageHeader 
        title="Impact Assessments"
        description="Conduct comprehensive Data Protection (DPIA), Algorithmic (AIA), and GDPR / DPDP Compliance Impact Assessments."
        action={
          activeTab === 'DPIA_AIA' ? (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
            >
              <Plus className="h-5 w-5" />
              Launch DPIA/AIA
            </button>
          ) : (
            <button
              onClick={() => setIsFriaOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
            >
              <Sparkles className="h-5 w-5" />
              Launch FRIA (Art. 27)
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-default)] gap-6">
        <button
          onClick={() => setActiveTab('DPIA_AIA')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'DPIA_AIA' ? 'text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          DPIA / AIA Kanban Board
          {activeTab === 'DPIA_AIA' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('FRIA')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'FRIA' ? 'text-purple-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          EU AI Act FRIA assessments (Art. 27)
          {activeTab === 'FRIA' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <NodePulseLoader label="Compiling assessment workspace..." />
        </div>
      ) : activeTab === 'DPIA_AIA' ? (
        /* Kanban Board Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {columns.map((col) => {
            const list = assessments.filter(a => a.status === col.status);
            return (
              <div
                key={col.status}
                className={`rounded-2xl border ${col.border} ${col.color} p-4 flex flex-col gap-4 min-h-[500px]`}
              >
                <div className="flex items-center justify-between border-b border-[var(--border-default)]/80 pb-2">
                  <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">{col.title}</h3>
                  <span className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)] font-bold">
                    {list.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">
                  {list.map((ass) => (
                    <div
                      key={ass.id}
                      onClick={() => setSelectedAssessment(ass)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedAssessment(ass);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 hover:border-indigo-500/40 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ass.type === 'DPIA' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {ass.type}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{new Date(ass.created_at).toLocaleDateString()}</span>
                      </div>

                      <h4 className="font-bold text-[var(--text-primary)] text-sm mt-2 line-clamp-1">{ass.ai_system?.name || 'Unknown System'}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{ass.form_data.description || 'No description entered.'}</p>
                      
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[var(--border-default)]/40 text-[10px] text-[var(--text-muted)]">
                        <User className="h-3 w-3" />
                        <span className="truncate">{ass.submitted_by || 'Anonymous'}</span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-[var(--text-muted)] border border-dashed border-[var(--border-default)]/40 rounded-xl">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FRIA Table / Wizards View */
        <div className="flex flex-col gap-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border-default)]/80 bg-[var(--bg-page)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Fundamental Rights Impact Assessments</h3>
              <span className="text-xs text-[var(--text-secondary)]">{friaAssessments.length} total assessments</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-default)]/80 text-[var(--text-secondary)] bg-[var(--bg-card)] font-semibold">
                    <th className="p-4">AI System Name</th>
                    <th className="p-4">Risk Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Updated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {friaAssessments.map((fria) => (
                    <tr key={fria.id} className="hover:bg-[var(--bg-hover)]/20 transition-all">
                      <td className="p-4 font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-purple-400" />
                        {fria.ai_system?.name}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          fria.ai_system?.risk_tier === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {fria.ai_system?.risk_tier}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          fria.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {fria.status}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {new Date(fria.updated_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openFriaWizard(fria.id)}
                          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all text-xs ${
                            fria.status === 'COMPLETED'
                              ? 'bg-gray-800 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-gray-700'
                              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/10'
                          }`}
                        >
                          {fria.status === 'COMPLETED' ? 'View Assessment' : 'Continue Questionnaire'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {friaAssessments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-20 text-[var(--text-muted)]">
                        No FRIA assessments completed. Launch one to evaluate system impact on fundamental rights under EU AI Act Art. 27.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Launch DPIA/AIA Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[var(--bg-secondary)]">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Launch Impact Assessment
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="target-ai-system" className="text-[var(--text-secondary)] font-semibold">Select Target AI System *</label>
                  <select
                    id="target-ai-system"
                    required
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">Choose System...</option>
                    {systems.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.risk_tier} Risk)</option>
                    ))}
                  </select>
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-[var(--text-secondary)] font-semibold">Assessment Type *</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('DPIA')}
                      className={`py-2 px-4 rounded-xl border text-center font-semibold transition-all ${
                        type === 'DPIA' ? 'bg-indigo-950/20 border-indigo-500 text-indigo-300' : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      DPIA (Data Protection)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('AIA')}
                      className={`py-2 px-4 rounded-xl border text-center font-semibold transition-all ${
                        type === 'AIA' ? 'bg-purple-950/20 border-purple-500 text-purple-300' : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      AIA (Algorithmic)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-description" className="text-[var(--text-secondary)] font-semibold">Description of AI Pipeline *</label>
                  <textarea
                    id="pipeline-description"
                    required
                    placeholder="Provide details on model operations, data flows, and pipeline inputs..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-benefits" className="text-[var(--text-secondary)] font-semibold">Anticipated Usecase Benefits *</label>
                  <textarea
                    id="pipeline-benefits"
                    required
                    placeholder="List expected functional, speed, or performance utility gains..."
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-protection" className="text-[var(--text-secondary)] font-semibold">Data Protection & Privacy Safeguards *</label>
                  <textarea
                    id="pipeline-protection"
                    required
                    placeholder="Detail active masking, filter APIs, retention controls, or PII scrubbers..."
                    value={formData.data_protection}
                    onChange={(e) => setFormData({ ...formData, data_protection: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-oversight" className="text-[var(--text-secondary)] font-semibold">Human Oversight & Fallback Protocols *</label>
                  <textarea
                    id="pipeline-oversight"
                    required
                    placeholder="Explain audit rules, human queues, veto options, and panic-stop configurations..."
                    value={formData.oversight}
                    onChange={(e) => setFormData({ ...formData, oversight: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
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

      {/* Launch FRIA Modal */}
      {isFriaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[var(--bg-secondary)]">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                Launch EU AI Act FRIA (Art. 27)
              </h3>
              <button
                onClick={() => setIsFriaOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
 
            <form onSubmit={handleLaunchFria} className="p-6 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fria-system" className="text-[var(--text-secondary)] font-semibold">Select AI System for Rights Impact Audit *</label>
                <select
                  id="fria-system"
                  required
                  value={friaSystemId}
                  onChange={(e) => setFriaSystemId(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 text-xs"
                >
                  <option value="">Choose System...</option>
                  {systems.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.risk_tier} Risk)</option>
                  ))}
                </select>
              </div>

              <div className="bg-purple-950/10 border border-purple-900/40 rounded-xl p-3 text-purple-300/80 leading-relaxed text-[11px]">
                Under Art. 27 of the EU AI Act, deployers of high-risk AI systems must perform a fundamental rights impact assessment covering affected groups, right to explainability, and specific discrimination controls prior to launch.
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFriaOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  Initiate Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FRIA Wizard Drawer/Overlay */}
      {currentFria && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-md">
          <div className="bg-[var(--bg-page)] border-l border-[var(--border-default)] h-full max-w-2xl w-full flex flex-col justify-between shadow-2xl animate-slide-in text-xs">
            
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-default)]/80 bg-[var(--bg-page)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">EU AI ACT ARTICLE 27 FRIA</span>
                <h3 className="font-bold text-[var(--text-primary)] text-base mt-0.5">{currentFria.ai_system?.name}</h3>
              </div>
              <button
                onClick={() => {
                  saveFriaProgress(false);
                  setCurrentFria(null);
                }}
                className="rounded-lg p-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions Step-through body */}
            <div className="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
              
              {/* Progress Indicator */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)] font-bold">Progress</span>
                  <span className="text-purple-400 font-bold">
                    Question {currentQuestionIndex + 1} of {currentFria.responses.length}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / currentFria.responses.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question block */}
              {currentFria.responses.length > 0 && (
                <div className="flex flex-col gap-4 animate-fade-in mt-2" key={currentQuestionIndex}>
                  <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded-xl flex gap-3 items-start">
                    <HelpCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-purple-400 uppercase tracking-widest text-[9px]">
                        {currentFria.responses[currentQuestionIndex].question_code}
                      </span>
                      <p className="font-bold text-white text-sm mt-1 leading-relaxed">
                        {currentFria.responses[currentQuestionIndex].question_text}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <label htmlFor="wizard-answer" className="text-[var(--text-secondary)] font-bold">Deployer Assessment Response *</label>
                    <textarea
                      id="wizard-answer"
                      placeholder="Detail system controls, impact constraints, processes, and verification evidence for this right..."
                      disabled={currentFria.status === 'COMPLETED'}
                      value={currentFria.responses[currentQuestionIndex].answer}
                      onChange={(e) => handleUpdateFriaResponse('answer', e.target.value)}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 min-h-[160px] text-xs leading-relaxed"
                    />
                  </div>
 
                  <div className="flex flex-col gap-2">
                    <label htmlFor="wizard-notes" className="text-[var(--text-secondary)] font-bold">Internal Compliance Notes</label>
                    <input
                      id="wizard-notes"
                      type="text"
                      placeholder="Add compliance notes, auditor follow-ups, or cross-checks..."
                      disabled={currentFria.status === 'COMPLETED'}
                      value={currentFria.responses[currentQuestionIndex].notes || ''}
                      onChange={(e) => handleUpdateFriaResponse('notes', e.target.value)}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl mt-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--text-primary)]">Flag Rights Risk</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Toggle this to flag active high risk to fundamental rights.</span>
                    </div>
                    <button
                      type="button"
                      disabled={currentFria.status === 'COMPLETED'}
                      onClick={() => handleUpdateFriaResponse('risk_flag', !currentFria.responses[currentQuestionIndex].risk_flag)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase transition-all ${
                        currentFria.responses[currentQuestionIndex].risk_flag
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-md shadow-red-500/5'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {currentFria.responses[currentQuestionIndex].risk_flag ? 'Flagged High Risk' : 'Scored Stable'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Panel */}
            <div className="p-6 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveFriaProgress(false);
                    setCurrentFria(null);
                  }}
                  className="rounded-xl border border-[var(--border-default)] px-4 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Close & Save
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={async () => {
                    await saveFriaProgress(false);
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-[var(--border-default)] px-4 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Prev
                </button>

                {currentQuestionIndex < currentFria.responses.length - 1 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await saveFriaProgress(false);
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-lg hover:bg-purple-500 transition-all"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  currentFria.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => saveFriaProgress(true)}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-2 font-semibold text-white shadow-lg shadow-emerald-500/10 hover:from-emerald-500 hover:to-green-500 transition-all"
                    >
                      Submit Compliance
                    </button>
                  )
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Review / Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[var(--bg-secondary)]">
              <div>
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">{selectedAssessment.type} Assessment</span>
                <h3 className="font-bold text-[var(--text-primary)] text-base mt-0.5">{selectedAssessment.ai_system?.name || 'AI System'}</h3>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto text-[var(--text-secondary)]">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-400" /> Pipeline Description</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><Building className="h-4 w-4 text-purple-400" /> Anticipated Benefits</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.benefits}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-blue-400" /> Privacy & Protection</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.data_protection}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Human Oversight</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.oversight}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-default)]/80 pt-4 mt-1 text-[10px] text-[var(--text-muted)]">
                <span>Submitted by: <span className="text-[var(--text-primary)] font-semibold">{selectedAssessment.submitted_by}</span></span>
                <span>Date: <span className="text-[var(--text-primary)] font-semibold">{new Date(selectedAssessment.created_at).toLocaleString()}</span></span>
              </div>
            </div>

            {selectedAssessment.status === 'IN_REVIEW' && (
              <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-default)] p-5 flex items-center justify-end gap-3">
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
