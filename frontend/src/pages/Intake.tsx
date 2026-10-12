import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, Send, CheckCircle2, AlertTriangle, XCircle, 
  LoaderCircle, ChevronRight, User, 
  FolderLock, X, Sparkles, Plus, ClipboardList, HelpCircle
} from 'lucide-react';
import { 
  fetchIntakeForm, submitIntake, fetchSubmissions, 
  approveSubmission, rejectSubmission, IntakeSubmission, IntakeForm,
  suggestIntakeQuestions, fetchSubmissionRiskScore
} from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/shared/Badge';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function Intake() {
  const navigate = useNavigate();
  const addToast = useStore(state => state.addToast);
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'submit' | 'queue'>('submit');
  const [formConfig, setFormConfig] = useState<IntakeForm | null>(null);
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([]);
  
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields State
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [useCase, setUseCase] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [selectedDataAccess, setSelectedDataAccess] = useState<string[]>([]);
  const [externalIntegrations, setExternalIntegrations] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  // Auto-scoring response screen state
  const [scoredResult, setScoredResult] = useState<IntakeSubmission | null>(null);
  const [pollingSubmissionId, setPollingSubmissionId] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [riskScoreResult, setRiskScoreResult] = useState<any>(null);

  // Question suggestions states
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Array<{ id: string; question: string; answer: string }>>([]);

  // Queue Detail Drawer State
  const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processingDecision, setProcessingDecision] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    void loadForm();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      void loadSubmissions();
    }
  }, [activeTab]);

  // 3-second dynamic polling effect
  useEffect(() => {
    if (!pollingSubmissionId) return;

    const interval = setInterval(async () => {
      try {
        const score = await fetchSubmissionRiskScore(pollingSubmissionId);
        if (score && score.risk_level) {
          setRiskScoreResult(score);
          setPollingActive(false);
          setPollingSubmissionId(null);
          addToast({ message: 'RISK SCORE COMPILED SUCCESSFULLY', type: 'success' });
          void loadSubmissions();
        }
      } catch (err) {
        console.error('Error polling risk score:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingSubmissionId, addToast]);

  const loadForm = async () => {
    setLoadingForm(true);
    try {
      const data = await fetchIntakeForm();
      setFormConfig(data);
    } catch (err) {
      console.error('Failed to load active intake form:', err);
      addToast({ message: 'FAILED TO LOAD FORM CONFIGURATION', type: 'error' });
    } finally {
      setLoadingForm(false);
    }
  };

  const loadSubmissions = async () => {
    setLoadingQueue(true);
    try {
      const data = await fetchSubmissions();
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      addToast({ message: 'FAILED TO LOAD REVIEW QUEUE', type: 'error' });
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleCheckboxChange = (option: string) => {
    setSelectedDataAccess(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleSuggestQuestions = async () => {
    if (!agentDescription.trim()) return;
    setLoadingSuggestions(true);
    try {
      const qs = await suggestIntakeQuestions(agentDescription);
      setSuggestedQuestions(qs);
      addToast({ message: 'CLAUDE GENERATED SUGGESTIONS', type: 'success' });
    } catch (err) {
      console.error('Failed to suggest questions', err);
      addToast({ message: 'FAILED TO GENERATE QUESTIONS', type: 'error' });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAppendQuestion = (question: string) => {
    if (customQuestions.find(cq => cq.question === question)) {
      addToast({ message: 'QUESTION ALREADY IN QUESTIONNAIRE', type: 'warning' });
      return;
    }
    const newQ = {
      id: crypto.randomUUID(),
      question,
      answer: ''
    };
    setCustomQuestions(prev => [...prev, newQ]);
    setSuggestedQuestions(prev => prev.filter(q => q !== question));
    addToast({ message: 'APPENDED QUESTION TO CUSTOM BUILDER', type: 'success' });
  };

  const handleRemoveCustomQuestion = (id: string) => {
    const target = customQuestions.find(cq => cq.id === id);
    setCustomQuestions(prev => prev.filter(cq => cq.id !== id));
    if (target) {
      setSuggestedQuestions(prev => [...prev, target.question]);
    }
  };

  const handleUpdateCustomAnswer = (id: string, val: string) => {
    setCustomQuestions(prev => prev.map(cq => cq.id === id ? { ...cq, answer: val } : cq));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      addToast({ message: 'YOU MUST ACKNOWLEDGE GOVERNANCE COMPLIANCE', type: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        agentName,
        agentDescription,
        useCase,
        formData: {
          department,
          dataAccess: selectedDataAccess,
          externalIntegrations,
          customQuestions: customQuestions.reduce((acc, cq) => {
            acc[cq.question] = cq.answer;
            return acc;
          }, {} as Record<string, string>)
        }
      };

      const result = await submitIntake(payload);
      setScoredResult(result);
      setPollingSubmissionId(result.id);
      setPollingActive(true);
      setRiskScoreResult(null);
      
      addToast({ message: 'AI REGISTRATION REQUEST SUBMITTED', type: 'success' });
      
      // Clear form
      setAgentName('');
      setAgentDescription('');
      setUseCase('');
      setDepartment('Engineering');
      setSelectedDataAccess([]);
      setExternalIntegrations('');
      setAcknowledged(false);
      setCustomQuestions([]);
    } catch (err) {
      console.error('Intake submission failed:', err);
      addToast({ message: 'SUBMISSION FAILURE', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    setProcessingDecision(true);
    try {
      await approveSubmission(selectedSubmission.id, reviewNote);
      addToast({ message: 'AI AGENT APPROVED & PROVISIONED', type: 'success' });
      setSelectedSubmission(null);
      setReviewNote('');
      void loadSubmissions();
    } catch (err: any) {
      addToast({ message: err.message || 'APPROVAL FAILED', type: 'error' });
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    if (!reviewNote.trim()) {
      addToast({ message: 'REJECTION ANNOTATION REQUIRED', type: 'warning' });
      return;
    }
    setProcessingDecision(true);
    try {
      await rejectSubmission(selectedSubmission.id, reviewNote);
      addToast({ message: 'AI INTAKE REQUEST REJECTED', type: 'success' });
      setSelectedSubmission(null);
      setReviewNote('');
      void loadSubmissions();
    } catch (err: any) {
      addToast({ message: err.message || 'REJECTION FAILED', type: 'error' });
    } finally {
      setProcessingDecision(false);
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'HIGH':
        return 'danger';
      case 'LOW':
        return 'success';
      default:
        return 'warning';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'compliant';
      case 'rejected':
        return 'danger';
      default:
        return 'royal';
    }
  };

  const departmentOptions = formConfig?.fields?.find((f: any) => f.name === 'department')?.options || [];
  const dataAccessOptions = formConfig?.fields?.find((f: any) => f.name === 'dataAccess')?.options || [];

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      <PageHeader 
        title="AI Agent Intake & Scoring"
        description="Register new AI Agents, evaluate automated risk tier scoring, and queue pipelines for safety audits."
        action={
          isAdmin && (
            <button
              onClick={() => navigate('/app/intake/builder')}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-500/10"
            >
              <ClipboardList className="h-4 w-4" />
              Manage Forms
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-default)]/80 gap-6">
        <button
          onClick={() => { setActiveTab('submit'); setScoredResult(null); }}
          className={cn(
            "pb-3.5 text-xs font-semibold uppercase tracking-widest transition-all relative",
            activeTab === 'submit' ? "text-indigo-400" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          Submit Agent
          {activeTab === 'submit' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={cn(
            "pb-3.5 text-xs font-semibold uppercase tracking-widest transition-all relative flex items-center gap-1.5",
            activeTab === 'queue' ? "text-indigo-400" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          Review Queue
          {submissions.filter(s => s.status === 'pending').length > 0 && (
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          )}
          {activeTab === 'queue' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Tab area */}
        <div className="lg:col-span-8">
          
          {/* Tab 1: Submit Form */}
          {activeTab === 'submit' && (
            <div className="space-y-6 text-left">
              {scoredResult ? (
                /* Auto scored output screen */
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)]/80 rounded-2xl p-8 flex flex-col gap-6 animate-scale-in">
                  
                  {pollingActive ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                      <NodePulseLoader label="Loading questionnaire queue..." />
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest animate-pulse">Running Claude Safety Analysis...</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">Polling real-time risk scores from active BullMQ workers...</p>
                      </div>
                    </div>
                  ) : riskScoreResult ? (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                            <Sparkles className="h-5 w-5 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-tight">AI Intake Risk Profile Card</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-0.5">Submission reference: {scoredResult.id.slice(0, 12)}</p>
                          </div>
                        </div>
                        <Badge variant={getRiskBadgeColor(riskScoreResult.risk_level)} className="text-[10px] py-1 px-4 !rounded-full">
                          {riskScoreResult.risk_level} RISK (Score: {riskScoreResult.risk_score}/100)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 rounded-xl">
                          <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-widest block mb-2">Detected Risk Factors</span>
                          <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                            {riskScoreResult.risk_factors?.map((f: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start leading-relaxed">
                                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 rounded-xl">
                          <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-widest block mb-2">Recommended Safety Controls</span>
                          <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                            {riskScoreResult.recommended_controls?.map((c: string, i: number) => (
                              <li key={i} className="flex gap-2 items-start leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-slate-500/5 p-5 rounded-xl border border-[var(--border-default)] text-xs">
                        <span className="font-bold text-[var(--text-primary)] block uppercase text-[9px] tracking-widest mb-1.5">Compliance Officer review memo:</span>
                        <p className="text-[var(--text-secondary)] leading-relaxed italic">"{riskScoreResult.suggested_review_notes}"</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-4 mt-2">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 border border-indigo-500/10 px-2 py-1 rounded">
                          <HelpCircle className="h-3.5 w-3.5" />
                          NIST Risk Tier: {riskScoreResult.nist_risk_classification || 'NOT_HIGH_RISK'}
                        </div>
                        <button
                          onClick={() => setScoredResult(null)}
                          className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest text-indigo-400 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all active:scale-95"
                        >
                          Submit Another
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                      <NodePulseLoader label="Loading questionnaire queue..." />
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest animate-pulse">Running Claude Safety Analysis...</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">Polling real-time risk scores from active BullMQ workers...</p>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* The form itself */
                <form onSubmit={handleSubmit} className="bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl p-6 space-y-6">
                  
                  {loadingForm ? (
                    <div className="flex items-center justify-center py-16 gap-2">
                      <LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Forming schema structure...</span>
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-[var(--border-default)] pb-3">
                        <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider">{formConfig?.title}</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{formConfig?.description}</p>
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-2 gap-5">
                        
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label htmlFor="agent-name" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Agent/System Name *</label>
                          <input 
                            id="agent-name"
                            type="text"
                            required
                            placeholder="e.g. Healthcare Clinical Summarizer"
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2">
                          <div className="flex justify-between items-center">
                            <label htmlFor="agent-desc" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">System Description</label>
                            {agentDescription.trim().length > 10 && (
                              <button
                                type="button"
                                onClick={handleSuggestQuestions}
                                disabled={loadingSuggestions}
                                className="flex items-center gap-1 text-[9px] font-semibold uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                {loadingSuggestions ? (
                                  <LoaderCircle className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                Suggest Compliance Questions
                              </button>
                            )}
                          </div>
                          <textarea 
                            id="agent-desc"
                            rows={3}
                            placeholder="Describe how the system operates, the target models, and how responses are exposed..."
                            value={agentDescription}
                            onChange={e => setAgentDescription(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs resize-none transition-colors"
                          />
                          
                          {/* Suggested questions list */}
                          {suggestedQuestions.length > 0 && (
                            <div className="mt-2 bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 space-y-2">
                              <span className="text-[9px] uppercase font-semibold text-indigo-400 tracking-wider flex items-center gap-1.5 font-bold">
                                <ClipboardList className="h-3.5 w-3.5" />
                                Claude-Suggested Compliance Gaps
                              </span>
                              <div className="flex flex-col gap-2">
                                {suggestedQuestions.map((q, i) => (
                                  <div key={i} className="flex items-center justify-between gap-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] p-2.5 rounded-lg">
                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">{q}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAppendQuestion(q)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[8px] font-semibold uppercase tracking-wider shrink-0 transition-all shadow-md shadow-indigo-600/10"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      Append
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label htmlFor="agent-usecase" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Primary Use Case & Flow *</label>
                          <textarea 
                            id="agent-usecase"
                            required
                            rows={3}
                            placeholder="Outline user base, input sources, decision execution autonomy, and sensitivity of variables processed..."
                            value={useCase}
                            onChange={e => setUseCase(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs resize-none transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="agent-dept" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Target Department *</label>
                          <select 
                            id="agent-dept"
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          >
                            {departmentOptions.map((opt: string) => (
                              <option key={opt} value={opt} className="bg-[var(--bg-page)]">{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="agent-integrations" className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">External Integrations</label>
                          <input 
                            id="agent-integrations"
                            type="text"
                            placeholder="e.g. Salesforce CRM, Epic EHR, none"
                            value={externalIntegrations}
                            onChange={e => setExternalIntegrations(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          />
                        </div>

                        {/* Data Access Scope Checkbox Grid */}
                        <div className="col-span-2 flex flex-col gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] block mb-1">Data Access Scope *</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 rounded-xl">
                            {dataAccessOptions.map((opt: string) => (
                              <label key={opt} className="flex items-center gap-3 cursor-pointer group text-xs text-[var(--text-secondary)] font-bold select-none">
                                <input 
                                  type="checkbox"
                                  checked={selectedDataAccess.includes(opt)}
                                  onChange={() => handleCheckboxChange(opt)}
                                  className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-black"
                                />
                                <span className="group-hover:text-[var(--text-primary)] transition-colors">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Custom Form Builder Questions Rendering */}
                        {customQuestions.length > 0 && (
                          <div className="col-span-2 flex flex-col gap-3">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 font-bold">
                              <ClipboardList className="h-3.5 w-3.5" />
                              Custom Questionnaire Extensions
                            </span>
                            <div className="space-y-3.5">
                              {customQuestions.map((cq) => (
                                <div key={cq.id} className="flex flex-col gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 rounded-xl relative text-left">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomQuestion(cq.id)}
                                    className="absolute top-3.5 right-3.5 text-gray-550 hover:text-[var(--text-primary)] transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  <label className="text-[10px] font-bold text-[var(--text-secondary)] leading-relaxed pr-8">{cq.question}</label>
                                  <input 
                                    type="text"
                                    required
                                    placeholder="Type your compliance specification answer..."
                                    value={cq.answer}
                                    onChange={e => handleUpdateCustomAnswer(cq.id, e.target.value)}
                                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Glassmorphic Acknowledgement Box */}
                        <div className="col-span-2 bg-indigo-950/20 border border-indigo-500/25 p-4 rounded-xl space-y-3">
                          <div className="flex items-start gap-2.5">
                            <FolderLock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 block">Governance Compliance Acknowledgement</span>
                              <p className="text-[10px] text-[var(--text-secondary)] leading-normal mt-1">
                                By registering this AI pipeline, you acknowledge that its inputs and outputs are subject to the active filters and interception rules configured under the organization's policies. High-risk systems will require administrative overrides before full execution is permitted.
                              </p>
                            </div>
                          </div>
                          
                          <label className="flex items-center gap-2 cursor-pointer pt-1 text-[10px] font-semibold uppercase text-indigo-200 tracking-wider">
                            <input 
                              type="checkbox"
                              checked={acknowledged}
                              onChange={e => setAcknowledged(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-indigo-850 bg-[var(--bg-secondary)] text-indigo-500 focus:ring-indigo-500"
                            />
                            I acknowledge organizational AI safety guidelines
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-[var(--border-default)]">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary h-11 px-6 uppercase tracking-widest font-semibold text-[10px] flex items-center justify-center gap-2"
                        >
                          {submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          <span>{submitting ? 'Registering...' : 'Submit AI Agent'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Queue */}
          {activeTab === 'queue' && (
            <div className="space-y-4 text-left">
              {loadingQueue ? (
                <div className="flex items-center justify-center py-20 bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl">
                  <NodePulseLoader label="Synchronizing database records..." />
                </div>
              ) : submissions.length === 0 ? (
                <EmptyState 
                  icon={ClipboardCheck}
                  title="Queue Empty"
                  description="No intake form submissions are currently listed. Standard users can submit agents via the dynamic intake form."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {submissions.map((sub) => (
                    <div 
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSubmission(sub); } }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border p-5 transition-all cursor-pointer text-left flex items-center justify-between gap-4",
                        selectedSubmission?.id === sub.id 
                          ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5' 
                          : 'bg-[var(--bg-page)] border-[var(--border-default)]/60 hover:bg-[var(--bg-page)]/80 hover:border-[var(--border-default)]'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-indigo-500/10 p-2.5 shrink-0">
                          <ClipboardCheck className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)] group-hover:text-indigo-300 transition-all flex items-center gap-2 flex-wrap">
                            {sub.agentName}
                            <Badge variant={getRiskBadgeColor(sub.riskLevel)} className="text-[8px] scale-90 origin-left shrink-0">
                              {sub.riskLevel}
                            </Badge>
                            <Badge variant={getStatusBadgeVariant(sub.status)} className="text-[8px] scale-90 origin-left shrink-0">
                              {sub.status}
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-1">{sub.agentDescription || 'No description provided.'}</p>
                          <div className="flex items-center gap-4 mt-2.5 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Submitter: {sub.submitter?.full_name || 'System Operator'}</span>
                            <span>•</span>
                            <span>Use Case: {sub.useCase}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-1 transition-all shrink-0 self-center" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar help / detail drawer column */}
        <div className="lg:col-span-4">
          {selectedSubmission ? (
            /* Queue Detail Drawer */
            <div className="bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl p-6 flex flex-col gap-6 sticky top-6 text-left animate-scale-in">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)]/80 pb-4">
                <div>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Intake Audit Specifications</span>
                  <h3 className="font-bold text-[var(--text-primary)] text-base mt-0.5">{selectedSubmission.agentName}</h3>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)]/60 rounded-xl p-4 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                
                <div>
                  <span className="text-[9px] uppercase font-semibold text-indigo-400 tracking-wider block mb-0.5">Automated Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getRiskBadgeColor(selectedSubmission.riskLevel)} className="text-[10px] py-0.5 px-3">
                      {selectedSubmission.riskLevel} RISK TIER
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(selectedSubmission.status)} className="text-[10px] py-0.5 px-3">
                      {selectedSubmission.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">Submitter Details</span>
                  <p className="font-bold text-[var(--text-primary)]">{selectedSubmission.submitter?.full_name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{selectedSubmission.submitter?.email}</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">Submitted at {new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">Target Department</span>
                  <p className="text-[var(--text-secondary)] font-semibold">{selectedSubmission.formData?.department || 'Not specified'}</p>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">Data Access Scope</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedSubmission.formData?.dataAccess?.length > 0 ? (
                      selectedSubmission.formData.dataAccess.map((d: string) => (
                        <Badge key={d} variant="royal" className="text-[8px] scale-95 origin-left">
                          {d}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] italic">None specified</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">External Integrations</span>
                  <p className="text-[var(--text-secondary)] leading-relaxed font-mono bg-[var(--bg-secondary)] p-2 rounded border border-[var(--border-default)]">{selectedSubmission.formData?.externalIntegrations || 'None documented'}</p>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">System Description</span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{selectedSubmission.agentDescription || 'No description provided.'}</p>
                </div>

                <div className="border-t border-[var(--border-default)] pt-3">
                  <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-0.5">Primary Use Case</span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{selectedSubmission.useCase}</p>
                </div>

                {selectedSubmission.reviewer && (
                  <div className="border-t border-[var(--border-default)] pt-3 bg-indigo-950/10 p-3 rounded-lg border border-indigo-900/30">
                    <span className="text-[9px] uppercase font-semibold text-indigo-400 tracking-wider block mb-0.5">Reviewer Verdict</span>
                    <p className="font-bold text-[var(--text-primary)]">{selectedSubmission.reviewer.full_name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{selectedSubmission.reviewer.email}</p>
                    {selectedSubmission.reviewNote && (
                      <p className="mt-2 text-[10px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-secondary)] p-2 rounded font-sans border border-[var(--border-default)]">
                        "{selectedSubmission.reviewNote}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Actions Panel */}
              {selectedSubmission.status === 'pending' && (
                <div className="border-t border-[var(--border-default)]/80 pt-4 flex flex-col gap-4">
                  {isAdmin ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="reviewer-note" className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Reviewer Annotation Note</label>
                        <textarea 
                          id="reviewer-note"
                          rows={2}
                          required
                          placeholder="Provide approval instructions or mandatory safety comments here..."
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-xs resize-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleReject}
                          disabled={processingDecision}
                          className="py-2.5 rounded-xl border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:border-red-700/60 font-bold transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" /> Reject Intake
                        </button>
                        <button
                          onClick={handleApprove}
                          disabled={processingDecision}
                          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-700/10 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve & Register
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-yellow-400/90 leading-relaxed text-[11px] font-bold">
                      ⚠️ Operational decisions are restricted. Only Organization Administrators are authorized to review and approve AI agent intakes.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Sidebar Help section */
            <div className="hidden lg:flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] border border-dashed border-[var(--border-default)] rounded-2xl text-center p-6 sticky top-6">
              <ClipboardCheck className="h-10 w-10 text-gray-700 mb-3 animate-pulse" />
              <h4 className="font-semibold text-[var(--text-secondary)] text-sm">AI Governance Intake</h4>
              <p className="text-[var(--text-muted)] text-xs mt-1 max-w-[200px] leading-relaxed">
                Registering a new system triggers an automated risk scoring sweep to match compliance benchmarks.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
