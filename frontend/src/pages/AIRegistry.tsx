import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Bot, Plus, Search, ChevronRight, ShieldAlert, Cpu, 
  Layers, User, CheckCircle2, AlertCircle, X, Edit, Save, 
  Sparkles, FileText, Info, Trash2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChangeHistoryTimeline } from '../components/shared/ChangeHistoryTimeline';

interface AISystem {
  id: string;
  name: string;
  description: string | null;
  model_name: string;
  model_version: string;
  vendor: string;
  use_case: string;
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner_user_id: string | null;
  status: 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW';
  created_at: string;
  lifecycle_stage?: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  model_card?: ModelCard | null;
}

interface LifecycleHistoryItem {
  id: string;
  stage: string;
  notes: string | null;
  changed_by: string;
  effective_date: string;
  created_at: string;
}

interface ModelCard {
  id: string;
  ai_system_id: string;
  intended_use: string;
  out_of_scope_use: string;
  training_data_description: string;
  known_limitations: string;
  bias_considerations: string;
  performance_metrics: Record<string, any>;
  version: string;
  updated_at: string;
}

export default function AIRegistry() {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newSystem, setNewSystem] = useState({
    name: '',
    description: '',
    model_name: '',
    model_version: '',
    vendor: '',
    use_case: '',
    risk_tier: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    status: 'ACTIVE' as 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW'
  });

  // Detail & Model Card View State
  const [selectedSystem, setSelectedSystem] = useState<AISystem | null>(null);
  const [isModelCardEdit, setIsModelCardEdit] = useState(false);
  const [modelCardData, setModelCardData] = useState<Partial<ModelCard>>({
    intended_use: '',
    out_of_scope_use: '',
    training_data_description: '',
    known_limitations: '',
    bias_considerations: '',
    performance_metrics: {}
  });
  const [performanceMetricsText, setPerformanceMetricsText] = useState('{\n  "accuracy": 0.94,\n  "latency_ms": 120\n}');

  // Lifecycle stage management states
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lifecycleHistory, setLifecycleHistory] = useState<LifecycleHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadSystems();
  }, []);

  const getLifecycleColor = (stage?: string) => {
    switch (stage?.toUpperCase()) {
      case 'DEVELOPMENT': return 'bg-gray-500/10 text-[var(--text-secondary)] border-gray-500/20';
      case 'TESTING': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'STAGING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PRODUCTION': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DEPRECATED': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'RETIRED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-[var(--text-secondary)] border-gray-500/20';
    }
  };

  const getNextStage = (currentStage?: string) => {
    const current = currentStage || 'DEVELOPMENT';
    if (current === 'DEVELOPMENT') return 'TESTING';
    if (current === 'TESTING') return 'STAGING';
    if (current === 'STAGING') return 'PRODUCTION';
    return null;
  };

  const fetchLifecycleHistory = async (aiSystemId: string) => {
    setLoadingHistory(true);
    try {
      const res = await apiRequest<LifecycleHistoryItem[]>(`/model-lifecycle/${aiSystemId}/history`);
      setLifecycleHistory(res || []);
    } catch (err) {
      console.error('Failed to fetch lifecycle history:', err);
      setLifecycleHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSystem || !targetStage) return;

    setIsTransitioning(true);
    try {
      await apiRequest('/model-lifecycle/transition', {
        method: 'POST',
        body: JSON.stringify({
          aiSystemId: selectedSystem.id,
          newStage: targetStage,
          notes: transitionNotes
        })
      });

      setIsTransitionOpen(false);

      // Refresh system list
      const refreshedSystemsRes = await apiRequest<{ items: AISystem[] }>('/ai-systems');
      const items = refreshedSystemsRes.items || [];
      setSystems(items);
      
      const updatedSys = items.find(s => s.id === selectedSystem.id);
      if (updatedSys) {
        setSelectedSystem(updatedSys);
      }

      // Refresh history
      await fetchLifecycleHistory(selectedSystem.id);
    } catch (err) {
      console.error('Failed to transition stage:', err);
      alert('Failed to transition stage');
    } finally {
      setIsTransitioning(false);
    }
  };

  const loadSystems = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: AISystem[] }>('/ai-systems');
      setSystems(res.items || []);
    } catch (err) {
      console.error('Failed to load AI systems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSystem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this AI system? This action cannot be undone.')) {
      return;
    }
    try {
      await apiRequest(`/ai-systems/${id}`, {
        method: 'DELETE'
      });
      setSelectedSystem(null);
      loadSystems();
    } catch (err) {
      console.error('Failed to delete AI system:', err);
      alert('Failed to delete AI system');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<AISystem>('/ai-systems', {
        method: 'POST',
        body: JSON.stringify(newSystem)
      });
      setSystems([res, ...systems]);
      setIsRegisterOpen(false);
      setNewSystem({
        name: '',
        description: '',
        model_name: '',
        model_version: '',
        vendor: '',
        use_case: '',
        risk_tier: 'MEDIUM',
        status: 'ACTIVE'
      });
    } catch (err) {
      console.error('Failed to register system:', err);
    }
  };

  const handleSelectSystem = async (sys: AISystem) => {
    setSelectedSystem(sys);
    setIsModelCardEdit(false);
    fetchLifecycleHistory(sys.id);
    
    // Fetch model card
    try {
      const card = await apiRequest<ModelCard>(`/ai-systems/${sys.id}/model-card`);
      setModelCardData(card);
      setPerformanceMetricsText(JSON.stringify(card.performance_metrics || {}, null, 2));
    } catch (err: any) {
      // 404 is normal if it doesn't exist
      setModelCardData({
        intended_use: '',
        out_of_scope_use: '',
        training_data_description: '',
        known_limitations: '',
        bias_considerations: '',
        performance_metrics: {}
      });
      setPerformanceMetricsText('{\n  "accuracy": 0.0,\n  "latency_ms": 0\n}');
    }
  };

  const handleSaveModelCard = async () => {
    if (!selectedSystem) return;

    let parsedMetrics = {};
    try {
      parsedMetrics = JSON.parse(performanceMetricsText);
    } catch (e) {
      alert('Invalid JSON in Performance Metrics');
      return;
    }

    try {
      const res = await apiRequest<ModelCard>(`/ai-systems/${selectedSystem.id}/model-card`, {
        method: 'PUT',
        body: JSON.stringify({
          ...modelCardData,
          performance_metrics: parsedMetrics
        })
      });
      setModelCardData(res);
      setIsModelCardEdit(false);
      
      // Update system list with new model card reference
      setSystems(systems.map(s => s.id === selectedSystem.id ? { ...s, model_card: res } : s));
    } catch (err) {
      console.error('Failed to save model card:', err);
    }
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'UNDER_REVIEW': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      default: return <X className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  const filteredSystems = systems.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.use_case.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      <PageHeader 
        title="AI System Registry"
        description="Maintain your enterprise inventory of AI systems, versions, owners, and dynamic model cards."
        action={
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Register System
          </button>
        }
      />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by system name, vendor, model, use case..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-page)]/60 border border-[var(--border-default)] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl">
              <NodePulseLoader label="Loading AI systems registry..." />
            </div>
          ) : filteredSystems.length === 0 ? (
            <EmptyState 
              icon={Bot}
              title="No AI Systems Registered"
              description="Get started by registering your first LLM, Agent, or Custom AI Pipeline in the inventory."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredSystems.map((sys) => (
                <div
                  key={sys.id}
                  onClick={() => handleSelectSystem(sys)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectSystem(sys);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative overflow-hidden rounded-xl border p-5 transition-all cursor-pointer ${
                    selectedSystem?.id === sys.id 
                      ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5' 
                      : 'bg-[var(--bg-page)] border-[var(--border-default)]/60 hover:bg-[var(--bg-page)]/80 hover:border-[var(--border-default)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-indigo-500/10 p-2.5 group-hover:bg-indigo-500/20 transition-all">
                        <Cpu className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-indigo-300 transition-all flex items-center gap-2.5">
                          {sys.name}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getRiskColor(sys.risk_tier)}`}>
                            {sys.risk_tier} RISK
                          </span>
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{sys.description || 'No description provided.'}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {sys.model_name} (v{sys.model_version})</span>
                          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {sys.vendor}</span>
                          <span className="flex items-center gap-1.5">{getStatusIcon(sys.status)} {sys.status}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-1 transition-all self-center" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model Card / Details Column */}
        <div className="lg:col-span-1">
          {selectedSystem ? (
            <div className="bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl p-6 flex flex-col gap-6 sticky top-6">
              
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)]/80 pb-4">
                <div>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Model Specification</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{selectedSystem.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getLifecycleColor(selectedSystem.lifecycle_stage)}`}>
                      {selectedSystem.lifecycle_stage || 'DEVELOPMENT'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSystem(null)}
                  className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Lifecycle Stage Controls */}
              <div className="bg-[#0f172a]/40 border border-[var(--border-default)]/60 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Lifecycle Management</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getLifecycleColor(selectedSystem.lifecycle_stage)}`}>
                    {selectedSystem.lifecycle_stage || 'DEVELOPMENT'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {getNextStage(selectedSystem.lifecycle_stage) && (
                    <button
                      onClick={() => {
                        setTargetStage(getNextStage(selectedSystem.lifecycle_stage)!);
                        setTransitionNotes('');
                        setIsTransitionOpen(true);
                      }}
                      className="flex-1 min-w-[120px] rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all active:scale-95"
                    >
                      Advance to {getNextStage(selectedSystem.lifecycle_stage)}
                    </button>
                  )}
                  
                  {selectedSystem.lifecycle_stage !== 'DEPRECATED' && selectedSystem.lifecycle_stage !== 'RETIRED' && (
                    <>
                      <button
                        onClick={() => {
                          setTargetStage('DEPRECATED');
                          setTransitionNotes('');
                          setIsTransitionOpen(true);
                        }}
                        className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all active:scale-95"
                      >
                        Deprecate
                      </button>
                      <button
                        onClick={() => {
                          setTargetStage('RETIRED');
                          setTransitionNotes('');
                          setIsTransitionOpen(true);
                        }}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                      >
                        Retire
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handleDeleteSystem(selectedSystem.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete System
                  </button>
                </div>
              </div>

              {/* Model Card Block */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--text-secondary)]">
                    <FileText className="h-4 w-4 text-purple-400" />
                    Model Card
                  </h3>
                  {!isModelCardEdit ? (
                    <button
                      onClick={() => setIsModelCardEdit(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <Edit className="h-3 w-3" /> Edit Card
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveModelCard}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                    >
                      <Save className="h-3 w-3" /> Save Card
                    </button>
                  )}
                </div>

                {!isModelCardEdit ? (
                  <div className="flex flex-col gap-4 text-xs text-[var(--text-secondary)] bg-[#0f172a]/40 border border-[var(--border-default)]/60 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                    <div>
                      <h4 className="font-semibold text-indigo-400 mb-1 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Intended Use</h4>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{modelCardData.intended_use || 'No intended use documented yet.'}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-purple-400 mb-1 flex items-center gap-1"><X className="h-3.5 w-3.5" /> Out of Scope Use</h4>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{modelCardData.out_of_scope_use || 'No restrictions documented yet.'}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-blue-400 mb-1 flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Training Data</h4>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{modelCardData.training_data_description || 'No data specifications documented yet.'}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-orange-400 mb-1 flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Limitations & Bias</h4>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{modelCardData.known_limitations || 'No limitations documented yet.'}</p>
                      <p className="text-[var(--text-secondary)] leading-relaxed mt-1.5">{modelCardData.bias_considerations || 'No bias considerations documented yet.'}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Performance Metrics</h4>
                      <pre className="mt-1 bg-black/30 p-2.5 rounded-lg border border-[var(--border-default)] text-[10px] text-emerald-300 font-mono overflow-x-auto">
                        {performanceMetricsText}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-xs bg-[#0f172a]/20 rounded-xl p-4 max-h-[500px] overflow-y-auto border border-[var(--border-default)]/80">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-intended-use" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Intended Use</label>
                      <textarea
                        id="card-intended-use"
                        value={modelCardData.intended_use || ''}
                        onChange={(e) => setModelCardData({ ...modelCardData, intended_use: e.target.value })}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-out-of-scope" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Out of Scope Use</label>
                      <textarea
                        id="card-out-of-scope"
                        value={modelCardData.out_of_scope_use || ''}
                        onChange={(e) => setModelCardData({ ...modelCardData, out_of_scope_use: e.target.value })}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-training-data" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Training Data Description</label>
                      <textarea
                        id="card-training-data"
                        value={modelCardData.training_data_description || ''}
                        onChange={(e) => setModelCardData({ ...modelCardData, training_data_description: e.target.value })}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-limitations" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Known Limitations</label>
                      <textarea
                        id="card-limitations"
                        value={modelCardData.known_limitations || ''}
                        onChange={(e) => setModelCardData({ ...modelCardData, known_limitations: e.target.value })}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-bias" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Bias Considerations</label>
                      <textarea
                        id="card-bias"
                        value={modelCardData.bias_considerations || ''}
                        onChange={(e) => setModelCardData({ ...modelCardData, bias_considerations: e.target.value })}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="card-metrics" className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Performance Metrics (JSON)</label>
                      <textarea
                        id="card-metrics"
                        value={performanceMetricsText}
                        onChange={(e) => setPerformanceMetricsText(e.target.value)}
                        className="bg-black/30 border border-[var(--border-default)] rounded-lg p-2 text-emerald-300 font-mono focus:outline-none focus:border-indigo-500 min-h-[80px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lifecycle History Timeline */}
              <div className="pt-4 border-t border-[var(--border-default)] flex flex-col gap-3">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--text-secondary)]">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  Lifecycle History
                </h3>
                {loadingHistory ? (
                  <div className="text-xs text-[var(--text-muted)] font-mono">Loading history...</div>
                ) : lifecycleHistory.length === 0 ? (
                  <div className="text-xs text-[var(--text-muted)] italic">No lifecycle transitions recorded yet.</div>
                ) : (
                  <div className="flex flex-col gap-4 pl-2 border-l border-[var(--border-default)] mt-2 ml-1.5">
                    {lifecycleHistory.map((item) => (
                      <div key={item.id} className="relative pl-4">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 border border-[#111827]" />
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] border font-bold ${getLifecycleColor(item.stage)}`}>
                            {item.stage}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(item.effective_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                          Changed by: <span className="font-semibold text-[var(--text-secondary)]">{item.changed_by}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-[var(--text-muted)] italic mt-1 bg-black/10 p-1.5 rounded border border-[var(--border-default)]/40">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change History Sub-section */}
              <div className="pt-4 border-t border-[var(--border-default)]">
                <ChangeHistoryTimeline entityType="agent" entityId={selectedSystem.id} />
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center py-24 bg-[var(--bg-page)]/20 border border-dashed border-[var(--border-default)] rounded-2xl text-center p-6">
              <Bot className="h-10 w-10 text-gray-700 mb-3 animate-pulse" />
              <h3 className="font-semibold text-[var(--text-secondary)] text-sm">No System Selected</h3>
              <p className="text-[var(--text-muted)] text-xs mt-1 max-w-[200px]">
                Click on any system in the inventory list to view full specifications and update its model card.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[#0f172a]/60">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-400" />
                Register New AI System
              </h3>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="reg-system-name" className="text-xs font-semibold text-[var(--text-secondary)]">System Name *</label>
                  <input
                    id="reg-system-name"
                    type="text"
                    required
                    placeholder="e.g. Sentraa Support Agent"
                    value={newSystem.name}
                    onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="reg-description" className="text-xs font-semibold text-[var(--text-secondary)]">Description</label>
                  <textarea
                    id="reg-description"
                    placeholder="Short description of the system's architecture and capabilities..."
                    value={newSystem.description}
                    onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-model-name" className="text-xs font-semibold text-[var(--text-secondary)]">Model Name *</label>
                  <input
                    id="reg-model-name"
                    type="text"
                    required
                    placeholder="e.g. gpt-4o"
                    value={newSystem.model_name}
                    onChange={(e) => setNewSystem({ ...newSystem, model_name: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-model-version" className="text-xs font-semibold text-[var(--text-secondary)]">Model Version *</label>
                  <input
                    id="reg-model-version"
                    type="text"
                    required
                    placeholder="e.g. 1.0.0"
                    value={newSystem.model_version}
                    onChange={(e) => setNewSystem({ ...newSystem, model_version: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-vendor" className="text-xs font-semibold text-[var(--text-secondary)]">Vendor *</label>
                  <input
                    id="reg-vendor"
                    type="text"
                    required
                    placeholder="e.g. OpenAI"
                    value={newSystem.vendor}
                    onChange={(e) => setNewSystem({ ...newSystem, vendor: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-use-case" className="text-xs font-semibold text-[var(--text-secondary)]">Use Case *</label>
                  <input
                    id="reg-use-case"
                    type="text"
                    required
                    placeholder="e.g. Customer Support"
                    value={newSystem.use_case}
                    onChange={(e) => setNewSystem({ ...newSystem, use_case: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Risk Tier *</label>
                  <select
                    value={newSystem.risk_tier}
                    onChange={(e) => setNewSystem({ ...newSystem, risk_tier: e.target.value as any })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Status *</label>
                  <select
                    value={newSystem.status}
                    onChange={(e) => setNewSystem({ ...newSystem, status: e.target.value as any })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="DEPRECATED">DEPRECATED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  Register System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lifecycle Transition Modal */}
      {isTransitionOpen && selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[#0f172a]/60">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                Transition Lifecycle Stage
              </h3>
              <button
                onClick={() => setIsTransitionOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">
                  You are about to transition <span className="font-bold text-white">{selectedSystem.name}</span> to the stage:
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${getLifecycleColor(targetStage)}`}>
                    {targetStage}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="transition-notes" className="text-xs font-semibold text-[var(--text-secondary)]">Optional Notes / Rationale</label>
                <textarea
                  id="transition-notes"
                  placeholder="e.g. Completed initial security checks and standard evaluations."
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[85px] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsTransitionOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransitioning}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                >
                  {isTransitioning ? 'Transitioning...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
