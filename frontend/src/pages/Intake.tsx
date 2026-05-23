import React, { useEffect, useState } from 'react';
import { 
  ClipboardCheck, Send, CheckCircle2, AlertTriangle, XCircle, 
  HelpCircle, Eye, LoaderCircle, Check, ChevronRight, User, 
  FolderLock, RefreshCw, X 
} from 'lucide-react';
import { 
  fetchIntakeForm, submitIntake, fetchSubmissions, 
  approveSubmission, rejectSubmission, IntakeSubmission, IntakeForm 
} from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/shared/Badge';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function Intake() {
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

  // Queue Detail Drawer State
  const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processingDecision, setProcessingDecision] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadForm();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      loadSubmissions();
    }
  }, [activeTab]);

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
          externalIntegrations
        }
      };

      const result = await submitIntake(payload);
      setScoredResult(result);
      addToast({ message: 'AI REGISTRATION REQUEST SUBMITTED', type: 'success' });
      
      // Clear form
      setAgentName('');
      setAgentDescription('');
      setUseCase('');
      setDepartment('Engineering');
      setSelectedDataAccess([]);
      setExternalIntegrations('');
      setAcknowledged(false);
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
      loadSubmissions();
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
      loadSubmissions();
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
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      <PageHeader 
        title="AI Agent Intake & Scoring"
        description="Register new AI Agents, evaluate automated risk tier scoring, and queue pipelines for safety audits."
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-800/80 gap-6">
        <button
          onClick={() => { setActiveTab('submit'); setScoredResult(null); }}
          className={cn(
            "pb-3.5 text-xs font-black uppercase tracking-widest transition-all relative",
            activeTab === 'submit' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
          )}
        >
          Submit Agent
          {activeTab === 'submit' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={cn(
            "pb-3.5 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5",
            activeTab === 'queue' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
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
                <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-8 flex flex-col gap-6 animate-scale-in">
                  <div className="flex items-center gap-3 border-b border-gray-850 pb-4">
                    <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">AI Intake Registered</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Submission reference: {scoredResult.id.slice(0, 12)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0b0f19]/40 border border-gray-850 p-5 rounded-xl flex flex-col justify-center items-center text-center">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">Scored Risk Tier</span>
                      <Badge variant={getRiskBadgeColor(scoredResult.riskLevel)} className="text-xs py-1 px-4 !rounded-full">
                        {scoredResult.riskLevel} RISK
                      </Badge>
                    </div>
                    <div className="bg-[#0b0f19]/40 border border-gray-850 p-5 rounded-xl flex flex-col justify-center items-center text-center">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">Queue Status</span>
                      <Badge variant="royal" className="text-xs py-1 px-4 !rounded-full">
                        {scoredResult.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-500/5 p-5 rounded-xl border border-gray-850">
                    <div className="flex gap-2 items-start text-xs leading-relaxed">
                      <AlertTriangle className={cn(
                        "h-4 w-4 shrink-0 mt-0.5",
                        scoredResult.riskLevel === 'HIGH' ? "text-red-400" : "text-yellow-400"
                      )} />
                      <div>
                        <span className="font-bold text-white block uppercase text-[9px] tracking-widest mb-0.5">Automated Safety Note:</span>
                        {scoredResult.riskLevel === 'HIGH' ? (
                          <span className="text-gray-400">
                            High risk signals were identified based on sensitive keywords. 
                            An operational block has been scheduled on the target model. 
                            Your organization administrator must manually verify integrations and grant an operational override.
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Automated parameters indicate a standard or low risk score. 
                            Your registration has been queued in the architecture review board.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setScoredResult(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-400 border border-gray-800 hover:bg-gray-800 transition-all"
                    >
                      Submit Another
                    </button>
                  </div>
                </div>
              ) : (
                /* The form itself */
                <form onSubmit={handleSubmit} className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 space-y-6">
                  
                  {loadingForm ? (
                    <div className="flex items-center justify-center py-16 gap-2">
                      <LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Forming schema structure...</span>
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-gray-800 pb-3">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">{formConfig?.title}</h3>
                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{formConfig?.description}</p>
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-2 gap-5">
                        
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label htmlFor="agent-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agent/System Name *</label>
                          <input 
                            id="agent-name"
                            type="text"
                            required
                            placeholder="e.g. Healthcare Clinical Summarizer"
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label htmlFor="agent-desc" className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Description</label>
                          <textarea 
                            id="agent-desc"
                            rows={3}
                            placeholder="Describe how the system operates, the target models, and how responses are exposed..."
                            value={agentDescription}
                            onChange={e => setAgentDescription(e.target.value)}
                            className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs resize-none transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label htmlFor="agent-usecase" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Use Case & Flow *</label>
                          <textarea 
                            id="agent-usecase"
                            required
                            rows={3}
                            placeholder="Outline user base, input sources, decision execution autonomy, and sensitivity of variables processed..."
                            value={useCase}
                            onChange={e => setUseCase(e.target.value)}
                            className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs resize-none transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="agent-dept" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Department *</label>
                          <select 
                            id="agent-dept"
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                            className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          >
                            {departmentOptions.map((opt: string) => (
                              <option key={opt} value={opt} className="bg-[#111827]">{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="agent-integrations" className="text-[10px] font-black uppercase tracking-widest text-gray-400">External Integrations</label>
                          <input 
                            id="agent-integrations"
                            type="text"
                            placeholder="e.g. Salesforce CRM, Epic EHR, none"
                            value={externalIntegrations}
                            onChange={e => setExternalIntegrations(e.target.value)}
                            className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                          />
                        </div>

                        {/* Data Access Scope Checkbox Grid */}
                        <div className="col-span-2 flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Data Access Scope *</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-black/10 border border-gray-850 p-4 rounded-xl">
                            {dataAccessOptions.map((opt: string) => (
                              <label key={opt} className="flex items-center gap-3 cursor-pointer group text-xs text-gray-300 font-bold select-none">
                                <input 
                                  type="checkbox"
                                  checked={selectedDataAccess.includes(opt)}
                                  onChange={() => handleCheckboxChange(opt)}
                                  className="h-4 w-4 rounded border-gray-850 bg-black/30 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-black"
                                />
                                <span className="group-hover:text-white transition-colors">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Glassmorphic Acknowledgement Box */}
                        <div className="col-span-2 bg-indigo-950/20 border border-indigo-500/25 p-4 rounded-xl space-y-3">
                          <div className="flex items-start gap-2.5">
                            <FolderLock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block">Governance Compliance Acknowledgement</span>
                              <p className="text-[10px] text-gray-400 leading-normal mt-1">
                                By registering this AI pipeline, you acknowledge that its inputs and outputs are subject to the active filters and interception rules configured under the organization's policies. High-risk systems will require administrative overrides before full execution is permitted.
                              </p>
                            </div>
                          </div>
                          
                          <label className="flex items-center gap-2 cursor-pointer pt-1 text-[10px] font-black uppercase text-indigo-200 tracking-wider">
                            <input 
                              type="checkbox"
                              checked={acknowledged}
                              onChange={e => setAcknowledged(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-indigo-800 bg-black/30 text-indigo-500 focus:ring-indigo-500"
                            />
                            I acknowledge organizational AI safety guidelines
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-gray-800">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary h-11 px-6 uppercase tracking-widest font-black text-[10px] flex items-center justify-center gap-2"
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
                <div className="flex items-center justify-center py-20 bg-[#111827]/40 border border-gray-800/80 rounded-2xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
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
                          : 'bg-[#111827]/40 border-gray-800/60 hover:bg-[#111827]/80 hover:border-gray-700'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-indigo-500/10 p-2.5 shrink-0">
                          <ClipboardCheck className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white group-hover:text-indigo-300 transition-all flex items-center gap-2 flex-wrap">
                            {sub.agentName}
                            <Badge variant={getRiskBadgeColor(sub.riskLevel)} className="text-[8px] scale-90 origin-left shrink-0">
                              {sub.riskLevel}
                            </Badge>
                            <Badge variant={getStatusBadgeVariant(sub.status)} className="text-[8px] scale-90 origin-left shrink-0">
                              {sub.status}
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{sub.agentDescription || 'No description provided.'}</p>
                          <div className="flex items-center gap-4 mt-2.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Submitter: {sub.submitter?.full_name || 'System Operator'}</span>
                            <span>•</span>
                            <span>Use Case: {sub.useCase}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all shrink-0 self-center" />
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
            <div className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-6 sticky top-6 text-left animate-scale-in">
              <div className="flex items-start justify-between gap-4 border-b border-gray-800/80 pb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Intake Audit Specifications</span>
                  <h3 className="font-bold text-white text-base mt-0.5">{selectedSubmission.agentName}</h3>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-gray-300 bg-[#0f172a]/40 border border-gray-800/60 rounded-xl p-4 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                
                <div>
                  <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider block mb-0.5">Automated Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getRiskBadgeColor(selectedSubmission.riskLevel)} className="text-[10px] py-0.5 px-3">
                      {selectedSubmission.riskLevel} RISK TIER
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(selectedSubmission.status)} className="text-[10px] py-0.5 px-3">
                      {selectedSubmission.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">Submitter Details</span>
                  <p className="font-bold text-white">{selectedSubmission.submitter?.full_name}</p>
                  <p className="text-[10px] text-gray-400">{selectedSubmission.submitter?.email}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Submitted at {new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">Target Department</span>
                  <p className="text-gray-400 font-semibold">{selectedSubmission.formData?.department || 'Not specified'}</p>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">Data Access Scope</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedSubmission.formData?.dataAccess?.length > 0 ? (
                      selectedSubmission.formData.dataAccess.map((d: string) => (
                        <Badge key={d} variant="royal" className="text-[8px] scale-95 origin-left">
                          {d}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">External Integrations</span>
                  <p className="text-gray-400 leading-relaxed font-mono bg-black/10 p-2 rounded border border-gray-850">{selectedSubmission.formData?.externalIntegrations || 'None documented'}</p>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">System Description</span>
                  <p className="text-gray-400 leading-relaxed">{selectedSubmission.agentDescription || 'No description provided.'}</p>
                </div>

                <div className="border-t border-gray-850 pt-3">
                  <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider block mb-0.5">Primary Use Case</span>
                  <p className="text-gray-400 leading-relaxed">{selectedSubmission.useCase}</p>
                </div>

                {selectedSubmission.reviewer && (
                  <div className="border-t border-gray-850 pt-3 bg-indigo-950/10 p-3 rounded-lg border border-indigo-900/30">
                    <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider block mb-0.5">Reviewer Verdict</span>
                    <p className="font-bold text-white">{selectedSubmission.reviewer.full_name}</p>
                    <p className="text-[10px] text-gray-400">{selectedSubmission.reviewer.email}</p>
                    {selectedSubmission.reviewNote && (
                      <p className="mt-2 text-[10px] text-gray-300 leading-relaxed bg-black/20 p-2 rounded font-sans border border-indigo-950">
                        "{selectedSubmission.reviewNote}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Actions Panel */}
              {selectedSubmission.status === 'pending' && (
                <div className="border-t border-gray-800/80 pt-4 flex flex-col gap-4">
                  {isAdmin ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="reviewer-note" className="text-[10px] uppercase font-black text-gray-400">Reviewer Annotation Note</label>
                        <textarea 
                          id="reviewer-note"
                          rows={2}
                          required
                          placeholder="Provide approval instructions or mandatory safety comments here..."
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
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
            <div className="hidden lg:flex flex-col items-center justify-center py-20 bg-[#111827]/20 border border-dashed border-gray-800 rounded-2xl text-center p-6 sticky top-6">
              <ClipboardCheck className="h-10 w-10 text-gray-700 mb-3 animate-pulse" />
              <h4 className="font-semibold text-gray-400 text-sm">AI Governance Intake</h4>
              <p className="text-gray-500 text-xs mt-1 max-w-[200px] leading-relaxed">
                Registering a new system triggers an automated risk scoring sweep to match compliance benchmarks.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
