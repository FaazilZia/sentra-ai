import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  CheckCircle2, XCircle, Clock, 
  Cpu, AlertTriangle, ShieldCheck, 
  Terminal, ArrowRight, X
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

export default function Workflows() {
  const [tasks, setTasks] = useState<PendingWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resolution Dialog State
  const [selectedTask, setSelectedTask] = useState<PendingWorkflow | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: PendingWorkflow[] }>('/workflows/pending');
      setTasks(res.items || []);
    } catch (err) {
      console.error('Failed to load pending human oversight tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (decision === 'REJECTED' && !comment.trim()) {
      alert('A comment is required when rejecting/blocking an action.');
      return;
    }

    try {
      await apiRequest(`/workflows/${selectedTask.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          comment: comment.trim()
        })
      });
      setSelectedTask(null);
      setComment('');
      loadTasks();
    } catch (err) {
      console.error('Failed to resolve workflow task:', err);
    }
  };

  const getRiskColor = (tier?: string) => {
    switch (tier) {
      case 'high': return 'text-red-400 bg-red-500/10 border border-red-500/20';
      case 'medium': return 'text-orange-400 bg-orange-500/10 border border-orange-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <PageHeader 
        title="Human Oversight Approvals"
        description="Review blocked high-risk AI actions, inspect their context, and grant manual operational overrides."
      />

      {/* Task Queue Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState 
          icon={ShieldCheck}
          title="Approval Queue Empty"
          description="All intercepted AI actions are successfully resolved. No pending manual overrides are currently outstanding."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-all relative overflow-hidden group"
            >
              {/* Header */}
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

              {/* Reason Box */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400/80 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Intercept Block Reason
                </span>
                <p className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl text-xs text-red-300/90 leading-relaxed font-semibold">
                  {task.metadata?.decision?.reason}
                </p>
              </div>

              {/* Context Payload */}
              {task.metadata?.metadata?.prompt && (
                <div className="flex flex-col gap-1.5 bg-[#0b0f19]/30 border border-gray-800/60 p-4 rounded-xl">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">User Input / Prompt context</span>
                  <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap mt-1 leading-relaxed max-h-[100px] overflow-y-auto">
                    {task.metadata.metadata.prompt}
                  </pre>
                </div>
              )}

              {/* Actions Footer */}
              <div className="border-t border-gray-800/40 pt-4 mt-1 flex items-center justify-between text-[10px] text-gray-500">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Intercepted {new Date(task.created_at).toLocaleTimeString()}</span>
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setDecision('APPROVED');
                    setComment('');
                  }}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95"
                >
                  Resolve Override <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Dialog Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Manual Override Decision</span>
                <h3 className="font-bold text-white text-base mt-0.5">{selectedTask.metadata?.agent} Action Audit</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolve} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <span className="text-gray-400 font-semibold">Governance Resolution *</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      decision === 'APPROVED' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    APPROVE / OVERRIDE
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold tracking-tight text-xs transition-all flex items-center justify-center gap-2 ${
                      decision === 'REJECTED' ? 'bg-red-950/20 border-red-500 text-red-300' : 'bg-black/30 border-gray-800 text-gray-500'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    REJECT / BLOCK
                  </button>
                </div>
              </div>

              {/* Change History Sub-section */}
              <div className="border-t border-gray-800 pt-4">
                <ChangeHistoryTimeline entityType="workflow" entityId={selectedTask.id} />
              </div>
 
              {/* Comment */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="resolution-comment" className="text-gray-400 font-semibold">
                  Resolution Comment {decision === 'REJECTED' ? '*' : '(Optional)'}
                </label>
                <textarea
                  id="resolution-comment"
                  required={decision === 'REJECTED'}
                  placeholder={
                    decision === 'REJECTED' 
                      ? 'Describe why this action has been rejected and should remain blocked...' 
                      : 'Provide a reason/evidence supporting the approval override decision...'
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-black/30 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[90px] leading-relaxed"
                />
              </div>

              {/* Footer */}
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
                    decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  Submit Decision
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
