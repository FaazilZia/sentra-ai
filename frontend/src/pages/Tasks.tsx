import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  ClipboardList, Plus, Trash2, Calendar, 
  Play, X, Tag
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  state: 'DRAFT' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  category: string;
  framework: string | null;
  created_at: string;
  creator: { full_name: string; email: string };
  assignee?: { full_name: string; email: string } | null;
}

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function Tasks() {
  const addToast = useStore((state) => state.addToast);
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newCategory, setNewCategory] = useState('COMPLIANCE');
  const [newFramework, setNewFramework] = useState('');
  const [creating, setCreating] = useState(false);

  // Transition comment modal
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [transitionAction, setTransitionAction] = useState<'SUBMIT' | 'APPROVE' | 'REJECT' | null>(null);
  const [transitionComment, setTransitionComment] = useState('');

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ tasks: Task[] }>('/workflows');
      setTasks(res?.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      addToast({ message: 'Failed to load tasks', type: 'error' });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiRequest<OrgUser[]>('/user');
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to load organization users:', err);
      setUsers([]);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      await apiRequest('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          priority: newPriority,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
          assignedTo: newAssignedTo || undefined,
          category: newCategory,
          framework: newFramework || undefined,
        }),
      });

      addToast({ message: 'Task created successfully', type: 'success' });
      setIsCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewDueDate('');
      setNewAssignedTo('');
      setNewCategory('COMPLIANCE');
      setNewFramework('');

      loadTasks();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      addToast({ message: err.message || 'Failed to create task', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiRequest(`/workflows/${taskId}`, { method: 'DELETE' });
      addToast({ message: 'Task deleted successfully', type: 'success' });
      loadTasks();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      addToast({ message: err.message || 'Failed to delete task', type: 'error' });
    }
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      await apiRequest(`/workflows/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: userId || null }),
      });
      addToast({ message: 'Task assignment updated', type: 'success' });
      loadTasks();
    } catch (err: any) {
      console.error('Failed to assign task:', err);
      addToast({ message: err.message || 'Failed to assign task', type: 'error' });
    }
  };

  const handleOpenTransitionModal = (task: Task, action: 'SUBMIT' | 'APPROVE' | 'REJECT') => {
    setSelectedTask(task);
    setTransitionAction(action);
    setTransitionComment('');
    setCommentModalOpen(true);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !transitionAction) return;

    if (transitionAction === 'REJECT' && !transitionComment.trim()) {
      alert('A comment is required to reject a task.');
      return;
    }

    try {
      let endpoint = '';
      if (transitionAction === 'SUBMIT') endpoint = `/workflows/${selectedTask.id}/submit`;
      else if (transitionAction === 'APPROVE') endpoint = `/workflows/${selectedTask.id}/approve`;
      else if (transitionAction === 'REJECT') endpoint = `/workflows/${selectedTask.id}/reject`;

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ comment: transitionComment.trim() || undefined }),
      });

      addToast({ message: `Task status updated successfully`, type: 'success' });
      setCommentModalOpen(false);
      setSelectedTask(null);
      setTransitionAction(null);
      loadTasks();
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      addToast({ message: err.message || 'Failed to update task status', type: 'error' });
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'PENDING_REVIEW': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'CLOSED': return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesState = filterState === 'ALL' || task.state === filterState;
    const matchesPriority = filterPriority === 'ALL' || task.priority === filterPriority;
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesState && matchesPriority && matchesSearch;
  });

  const isReviewer = user?.role === 'ADMIN' || user?.role === 'COMPLIANCE_MANAGER';

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Compliance & Governance Tasks"
          description="Manage compliance action plans, track evidence verification, and submit policies for review."
        />
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95 w-fit"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[var(--bg-page)] border border-[var(--border-default)]/80 p-4 rounded-2xl">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-[var(--border-default)] rounded-xl px-4 py-2 text-xs font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-black/30 border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All States</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-black/30 border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <NodePulseLoader label="Syncing team task list..." />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title="No Tasks Found"
          description="Create a task or change filters to get started."
        />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)]/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] bg-black/10">
                  <th className="p-4 font-bold">Task Details</th>
                  <th className="p-4 font-bold">Priority</th>
                  <th className="p-4 font-bold">Assignee</th>
                  <th className="p-4 font-bold">State</th>
                  <th className="p-4 font-bold">Due Date</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white text-sm">{task.title}</span>
                        {task.description && (
                          <span className="text-[var(--text-secondary)] text-xs line-clamp-1">{task.description}</span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/20">
                            {task.category}
                          </span>
                          {task.framework && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {task.framework}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${getPriorityBadgeColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={task.assigned_to || ''}
                        onChange={(e) => handleAssignTask(task.id, e.target.value)}
                        className="bg-black/20 border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 max-w-[150px]"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${getStateBadgeColor(task.state)}`}>
                        {task.state.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)]">
                      {task.due_date ? (
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {new Date(task.due_date).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Transitions */}
                        {task.state === 'DRAFT' && (
                          <button
                            onClick={() => handleOpenTransitionModal(task, 'SUBMIT')}
                            className="bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1"
                            title="Submit for Review"
                          >
                            <Play className="h-3 w-3" /> Submit
                          </button>
                        )}
                        {task.state === 'PENDING_REVIEW' && isReviewer && (
                          <>
                            <button
                              onClick={() => handleOpenTransitionModal(task, 'APPROVE')}
                              className="bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1"
                              title="Approve Task"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenTransitionModal(task, 'REJECT')}
                              className="bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1"
                              title="Reject Task"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 hover:text-red-500 text-[var(--text-muted)] transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest">Compliance Management</span>
                <h3 className="font-bold text-white text-base mt-0.5">Create Action Task</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-title" className="text-[var(--text-secondary)] font-semibold">Title *</label>
                <input
                  id="task-title"
                  type="text"
                  required
                  placeholder="e.g. Implement TOTP Authenticator flow"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-desc" className="text-[var(--text-secondary)] font-semibold">Description</label>
                <textarea
                  id="task-desc"
                  placeholder="Describe the task and any evidence requirements..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-priority" className="text-[var(--text-secondary)] font-semibold">Priority</label>
                  <select
                    id="task-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-due" className="text-[var(--text-secondary)] font-semibold">Due Date</label>
                  <input
                    id="task-due"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-category" className="text-[var(--text-secondary)] font-semibold">Category</label>
                  <select
                    id="task-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="GOVERNANCE">Governance</option>
                    <option value="AUDIT">Audit</option>
                    <option value="SECURITY">Security</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-framework" className="text-[var(--text-secondary)] font-semibold">Framework (Optional)</label>
                  <input
                    id="task-framework"
                    type="text"
                    placeholder="e.g. GDPR, HIPAA"
                    value={newFramework}
                    onChange={(e) => setNewFramework(e.target.value)}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-assignee" className="text-[var(--text-secondary)] font-semibold">Assignee</label>
                <select
                  id="task-assignee"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition Comments Modal */}
      {commentModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest">Workflow State Transition</span>
                <h3 className="font-bold text-white text-base mt-0.5">
                  {transitionAction === 'SUBMIT' ? 'Submit for Review' : transitionAction === 'APPROVE' ? 'Approve Task' : 'Reject Task'}
                </h3>
              </div>
              <button
                onClick={() => setCommentModalOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransition} className="p-6 flex flex-col gap-4">
              <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed">
                Task: <span className="text-white font-bold">{selectedTask.title}</span>
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="transition-comment" className="text-[var(--text-secondary)] font-semibold">
                  Transition Comment {transitionAction === 'REJECT' ? '*' : '(Optional)'}
                </label>
                <textarea
                  id="transition-comment"
                  required={transitionAction === 'REJECT'}
                  placeholder={
                    transitionAction === 'REJECT'
                      ? 'Describe why this task has been rejected/blocked...'
                      : 'Provide any optional notes about this state change...'
                  }
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setCommentModalOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                    transitionAction === 'REJECT' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
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
