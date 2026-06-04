import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/useStore';
import { 
  CheckCircle2, XCircle, Clock, 
  Cpu, AlertTriangle, ShieldCheck, 
  Terminal, ArrowRight, X, ListTodo,
  Play, FileText, Calendar, User
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChangeHistoryTimeline } from '../components/shared/ChangeHistoryTimeline';

interface PendingWorkflow {
  id: string;
  title: string;
  description: string;
  state: 'PENDING_REVIEW';
  priority: string;
  category: 'GOVERNANCE';
  framework: string;
  created_at: string;
  metadata: {
    agent: string;
    action: string;
    organizationId: string;
    decision: {
      status: string;
      risk: string;
      reason: string;
      impact: string;
      compliance: string[];
      explanation?: string;
    };
    metadata?: Record<string, any>;
  };
}

interface ComplianceTask {
  id: string;
  title: string;
  description: string | null;
  state: string;
  priority: string;
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  category: string;
  framework: string | null;
  created_at: string;
  creator: { full_name: string; email: string };
  assignee?: { full_name: string; email: string } | null;
}

export default function Workflows() {
  const addToast = useStore((state) => state.addToast);
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'agent' | 'task'>('agent');
  const [pendingAgents, setPendingAgents] = useState<PendingWorkflow[]>([]);
  const [pendingTasks, setPendingTasks] = useState<ComplianceTask[]>([]);
  const [draftTasks, setDraftTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resolution Dialog State (Agent overrides)
  const [selectedAgent, setSelectedAgent] = useState<PendingWorkflow | null>(null);
  const [agentDecision, setAgentDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [agentComment, setAgentComment] = useState('');

  // Resolution Dialog State (Task approvals)
  const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);
  const [taskDecision, setTaskDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [taskComment, setTaskComment] = useState('');

  // Request Approval Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [taskToSubmit, setTaskToSubmit] = useState('');
  const [submitComment, setSubmitComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'agent') {
        const res = await apiRequest<{ items: PendingWorkflow[] }>('/workflows/pending');
        setPendingAgents(res.items || []);
      } else {
        const resTasks = await apiRequest<{ tasks: ComplianceTask[] }>('/workflows?state=PENDING_REVIEW');
        setPendingTasks(resTasks.tasks || []);

        const resDrafts = await apiRequest<{ tasks: ComplianceTask[] }>('/workflows?state=DRAFT');
        setDraftTasks(resDrafts.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load workflow tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    if (agentDecision === 'REJECTED' && !agentComment.trim()) {
      alert('A comment is required when rejecting/blocking an action.');
      return;
    }

    try {
      await apiRequest(`/workflows/${selectedAgent.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          decision: agentDecision,
          comment: agentComment.trim()
        })
      });
      addToast({ message: 'Agent action resolved successfully', type: 'success' });
      setSelectedAgent(null);
      setAgentComment('');
      loadData();
    } catch (err) {
      console.error('Failed to resolve workflow task:', err);
      addToast({ message: 'Failed to resolve agent action', type: 'error' });
    }
  };

  const handleResolveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (taskDecision === 'REJECT' && !taskComment.trim()) {
      alert('A comment is required when rejecting a task.');
      return;
    }

    try {
      const endpoint = taskDecision === 'APPROVE' 
        ? `/workflows/${selectedTask.id}/approve`
        : `/workflows/${selectedTask.id}/reject`;

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ comment: taskComment.trim() || undefined })
      });

      addToast({ message: 'Task approval decision recorded', type: 'success' });
      setSelectedTask(null);
      setTaskComment('');
      loadData();
    } catch (err: any) {
      console.error('Failed to resolve compliance task:', err);
      addToast({ message: err.message || 'Failed to submit decision', type: 'error' });
    }
  };

  const handleSubmitTaskForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSubmit) return;

    try {
      setSubmitting(true);
      await apiRequest(`/workflows/${taskToSubmit}/submit`, {
        method: 'POST',
        body: JSON.stringify({ comment: submitComment.trim() || undefined })
      });
      addToast({ message: 'Task submitted for review', type: 'success' });
      setSubmitModalOpen(false);
      setTaskToSubmit('');
      setSubmitComment('');
      loadData();
    } catch (err: any) {
      console.error('Failed to submit task for review:', err);
      addToast({ message: err.message || 'Failed to submit task', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (tier?: string) => {
    switch (tier) {
      case 'high': return 'text-red-400 bg-red-500/10 border border-red-500/20';
      case 'medium': return 'text-orange-400 bg-orange-500/10 border border-orange-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
    }
  };

  const isReviewer = user?.role === 'ADMIN' || user?.role === 'COMPLIANCE_MANAGER';

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Governance Approval Workflows"
          description="Manage blocked autonomous agent actions and verify compliance/governance review requests."
        />
        {activeTab === 'task' && (
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95 w-fit"
          >
            <Play className="h-4 w-4" />
            Submit Task for Review
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('agent')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'agent'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          AI Agent Oversight
        </button>
        <button
          onClick={() => setActiveTab('task')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'task'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ListTodo className="h-3.5 w-3.5" />
          Task Approvals
        </button>
      </div>

      {/* Loader */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : activeTab === 'agent' ? (
        /* Agent Oversight Queue */
        pendingAgents.length === 0 ? (
          <EmptyState 
            icon={ShieldCheck}
            title="Approval Queue Empty"
            description="All intercepted AI actions are successfully resolved. No pending overrides outstanding."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {pendingAgents.map((task) => (
              <div
                key={task.id}
                className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-all relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-4 border-b border-gray-800/40 pb-3">
                  <div className="flex items-start gap-3.5">
                    <div className="rounded-xl bg-indigo-500/10 p-3 group-hover:bg-indigo-500/20 transition-all">
                      <Cpu className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-all">
                        {task.metadata?.agent || 'Autonomous Agent'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Terminal className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-[10px] text-gray-400 font-mono font-semibold">{task.metadata?.action}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase ${getRiskColor(task.metadata?.decision?.risk)}`}>
                    {task.metadata?.decision?.risk} risk
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-400/80 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Intercept Block Reason
                  </span>
                  <p className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl text-xs text-red-300/90 leading-relaxed font-semibold">
                    {task.metadata?.decision?.reason}
                  </p>
                </div>

                {task.metadata?.metadata?.prompt && (
                  <div className="flex flex-col gap-1.5 bg-[#0b0f19]/30 border border-gray-800/60 p-4 rounded-xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">User Input / Prompt context</span>
                    <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap mt-1 leading-relaxed max-h-[100px] overflow-y-auto">
                      {task.metadata.metadata.prompt}
                    </pre>
                  </div>
                )}

                <div className="border-t border-gray-800/40 pt-4 mt-1 flex items-center justify-between text-[10px] text-gray-500">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Intercepted {new Date(task.created_at).toLocaleTimeString()}</span>
                  <button
                    onClick={() => {
                      setSelectedAgent(task);
                      setAgentDecision('APPROVED');
                      setAgentComment('');
                    }}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95"
                  >
                    Resolve Override <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Task Approvals Queue */
        pendingTasks.length === 0 ? (
          <EmptyState 
            icon={ListTodo}
            title="No Compliance Approvals Pending"
            description="Compliance tasks requiring review are currently empty. Submit draft tasks for approval."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-all relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-4 border-b border-gray-800/40 pb-3">
                  <div className="flex items-start gap-3.5">
                    <div className="rounded-xl bg-purple-500/10 p-3 group-hover:bg-purple-500/20 transition-all">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-purple-300 transition-all">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/20">
                          {task.category}
                        </span>
                        {task.framework && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                            {task.framework}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                    {task.state}
                  </span>
                </div>

                {task.description && (
                  <p className="text-gray-400 text-xs leading-relaxed">{task.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-xl text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <User className="h-4 w-4 text-gray-500" /> 
                    <span>Created by: <strong className="text-gray-300">{task.creator.full_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="h-4 w-4 text-gray-500" /> 
                    <span>Due: <strong className="text-gray-300">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}</strong></span>
                  </div>
                </div>

                <div className="border-t border-gray-800/40 pt-4 mt-1 flex items-center justify-between text-[10px] text-gray-500">
                  <span className="flex items-center gap-1.5">Assigned: <strong className="text-gray-300">{task.assignee?.full_name || 'Unassigned'}</strong></span>
                  {isReviewer && (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDecision('APPROVE');
                        setTaskComment('');
                      }}
                      className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md shadow-purple-500/10 transition-all hover:scale-105 active:scale-95"
                    >
                      Resolve Approval <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Agent Override Resolution Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Manual Override Decision</span>
                <h3 className="font-bold text-white text-base mt-0.5">{selectedAgent.metadata?.agent} Action Audit</h3>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveAgent} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-gray-400 font-semibold">Governance Resolution *</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAgentDecision('APPROVED')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      agentDecision === 'APPROVED' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    APPROVE / OVERRIDE
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentDecision('REJECTED')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      agentDecision === 'REJECTED' ? 'bg-red-950/20 border-red-500 text-red-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    REJECT / BLOCK
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <ChangeHistoryTimeline entityType="workflow" entityId={selectedAgent.id} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="agent-comment" className="text-gray-400 font-semibold">
                  Resolution Comment {agentDecision === 'REJECTED' ? '*' : '(Optional)'}
                </label>
                <textarea
                  id="agent-comment"
                  required={agentDecision === 'REJECTED'}
                  placeholder={
                    agentDecision === 'REJECTED' 
                      ? 'Describe why this action has been rejected and should remain blocked...' 
                      : 'Provide a reason/evidence supporting the approval override decision...'
                  }
                  value={agentComment}
                  onChange={(e) => setAgentComment(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="rounded-xl border border-gray-800 px-5 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                    agentDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Approval Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Compliance Review Decision</span>
                <h3 className="font-bold text-white text-base mt-0.5">Approve/Reject compliance task</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTask} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-gray-400 font-semibold">Review Decision *</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTaskDecision('APPROVE')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      taskDecision === 'APPROVE' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    APPROVE TASK
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskDecision('REJECT')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      taskDecision === 'REJECT' ? 'bg-red-950/20 border-red-500 text-red-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    REJECT TASK
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-comment" className="text-gray-400 font-semibold">
                  Reviewer Comment {taskDecision === 'REJECT' ? '*' : '(Optional)'}
                </label>
                <textarea
                  id="task-comment"
                  required={taskDecision === 'REJECT'}
                  placeholder={
                    taskDecision === 'REJECT' 
                      ? 'Explain why this task review fails compliance standards...' 
                      : 'Provide a reason/evidence supporting the task approval...'
                  }
                  value={taskComment}
                  onChange={(e) => setTaskComment(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl border border-gray-800 px-5 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                    taskDecision === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Task for Review Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Submit Task for Review</span>
                <h3 className="font-bold text-white text-base mt-0.5">Request GRC Verification</h3>
              </div>
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTaskForReview} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="submit-task-select" className="text-gray-400 font-semibold">Select Draft Task *</label>
                <select
                  id="submit-task-select"
                  required
                  value={taskToSubmit}
                  onChange={(e) => setTaskToSubmit(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose a draft task...</option>
                  {draftTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="submit-comment" className="text-gray-400 font-semibold">Submission Notes</label>
                <textarea
                  id="submit-comment"
                  placeholder="Provide details about evidence or validation materials attached to this task..."
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="rounded-xl border border-gray-800 px-5 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !taskToSubmit}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
