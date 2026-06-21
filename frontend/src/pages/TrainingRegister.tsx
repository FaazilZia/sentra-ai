import { useEffect, useState } from 'react';
import { Award, BookOpen, UserCheck, ShieldAlert, CheckCircle, XCircle, Clock, Plus, RefreshCw, X, Tag } from 'lucide-react';
import { fetchTrainingCourses, fetchTrainingStatus, recordTrainingCompletion, createTrainingCourse, TrainingCourse, TrainingStatus } from '@/lib/api';

export default function TrainingRegister() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'courses' | 'gaps' | 'matrix'>('courses');
  
  // Log Completion modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [logUserId, setLogUserId] = useState('');
  const [logScore, setLogScore] = useState<number>(90);
  const [logPassed, setLogPassed] = useState(true);
  const [logNotes, setLogNotes] = useState('');

  // Create Course state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newMandatory, setNewMandatory] = useState(true);
  const [newTagsString, setNewTagsString] = useState('ISO-42001');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [courseList, statusData] = await Promise.all([
        fetchTrainingCourses(),
        fetchTrainingStatus()
      ]);
      setCourses(courseList);
      setStatus(statusData);
      if (courseList.length > 0) {
        setSelectedCourseId(courseList[0].id);
      }
    } catch (err) {
      console.error('Failed to load training register data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !logUserId) return;

    try {
      await recordTrainingCompletion(selectedCourseId, {
        userId: logUserId,
        score: logScore,
        passed: logPassed,
        notes: logNotes
      });

      setIsLogModalOpen(false);
      // Reset
      setLogUserId('');
      setLogScore(90);
      setLogPassed(true);
      setLogNotes('');

      loadData();
    } catch (err) {
      console.error('Failed to record completion', err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const payload = {
        title: newTitle,
        description: newDesc,
        duration_minutes: newDuration,
        is_mandatory: newMandatory,
        framework_tags: newTagsString ? newTagsString.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      await createTrainingCourse(payload);
      setIsCreateModalOpen(false);
      
      // Reset
      setNewTitle('');
      setNewDesc('');
      setNewDuration(60);
      setNewMandatory(true);
      setNewTagsString('ISO-42001');

      loadData();
    } catch (err) {
      console.error('Failed to create course', err);
    }
  };

  // Compile users list from gaps and completions
  const getUniqueUsers = () => {
    if (!status) return [];
    
    const usersMap = new Map<string, { id: string; name: string; email: string }>();
    
    // Add users from gaps
    status.gaps.forEach(g => {
      usersMap.set(g.userId, { id: g.userId, name: g.userName, email: g.userEmail });
    });

    // Add users from loaded course completions
    courses.forEach(c => {
      c.completions?.forEach(comp => {
        if (comp.user) {
          usersMap.set(comp.user.id, { 
            id: comp.user.id, 
            name: comp.user.full_name, 
            email: comp.user.email 
          });
        }
      });
    });

    // Fallback default admin if list is empty
    if (usersMap.size === 0) {
      usersMap.set('default-admin-id', { id: 'default-admin-id', name: 'Chief Auditor', email: 'auditor@sentra.ai' });
    }

    return Array.from(usersMap.values());
  };

  const uniqueUsers = getUniqueUsers();

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in relative min-h-full">
      
      {/* Modal: Log Training Completion */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-base max-w-md w-full bg-white shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-[var(--royal-indigo)]">
                <UserCheck className="h-5 w-5" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-800">Record Course Completion</h3>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordCompletion} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Select Training Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] text-slate-700 font-bold"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 font-bold">Log for User</label>
                <select
                  value={logUserId}
                  onChange={(e) => setLogUserId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] text-slate-700 font-bold"
                >
                  <option value="">-- Choose User --</option>
                  {uniqueUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 font-bold">Exam Score (%)</label>
                  <input 
                    type="number" 
                    value={logScore}
                    onChange={(e) => setLogScore(parseInt(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 font-bold">Status outcome</label>
                  <select
                    value={logPassed ? 'true' : 'false'}
                    onChange={(e) => setLogPassed(e.target.value === 'true')}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] text-slate-700 font-bold"
                  >
                    <option value="true">PASSED COMPETENT</option>
                    <option value="false">FAILED GAP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Auditor Notes</label>
                <textarea 
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Scored 90% on certification exam. Valid for 12 months."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 h-16 focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--royal-indigo)] text-white hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                >
                  Log Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Course */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-base max-w-md w-full bg-white shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-indigo-600">
                <BookOpen className="h-5 w-5" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-800">Add Training Course</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Course Title</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Advanced Threat Modeling for LLMs"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Briefly state course materials and framework alignment."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 h-16 focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 font-bold">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value) || 60)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 font-bold">Requirement Tier</label>
                  <select
                    value={newMandatory ? 'true' : 'false'}
                    onChange={(e) => setNewMandatory(e.target.value === 'true')}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] text-slate-700 font-bold"
                  >
                    <option value="true">MANDATORY COMPLIANCE</option>
                    <option value="false">ELECTIVE / OPTIONAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Framework Alignment (Comma Separated)</label>
                <input 
                  type="text" 
                  value={newTagsString}
                  onChange={(e) => setNewTagsString(e.target.value)}
                  placeholder="e.g. ISO-42001, EU-AI-ACT, NIST"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--royal-indigo)] text-white hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 bg-white px-4 py-3 rounded-[var(--radius)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl text-[var(--royal-indigo)]">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)]">Mandatory Training Register</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Verify employee competence checklists to automatically fulfill ISO 42001 competence controls</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
          >
            Add Course
          </button>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--royal-indigo)] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-500/10"
          >
            <Plus className="h-4 w-4" />
            Log Completion
          </button>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Courses</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{status?.totalCourses || courses.length}</div>
          </div>
          <div className="bg-slate-50 text-slate-500 p-2.5 rounded-xl border border-slate-100">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Mandatory Core</div>
            <div className="text-xl font-bold mt-1 text-indigo-600">{status?.mandatoryCourses || 0}</div>
          </div>
          <div className="bg-indigo-50 text-[var(--royal-indigo)] p-2.5 rounded-xl border border-indigo-100">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Outstanding Gaps</div>
            <div className="text-xl font-bold mt-1 text-rose-600">{status?.pendingGaps ?? 0}</div>
          </div>
          <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl border border-rose-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Global Completion Rate</div>
            <div className="text-xl font-bold mt-1 text-teal-600">
              {status ? `${status.completionRate}%` : '0%'}
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Tabbed Grid */}
      <div className="card-base bg-white overflow-hidden shadow-sm flex-1">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-100 bg-slate-50 flex items-center px-4 py-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all rounded ${
                activeTab === 'courses' ? 'bg-white text-[var(--royal-indigo)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Courses Catalog
            </button>
            <button
              onClick={() => setActiveTab('gaps')}
              className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all rounded flex items-center gap-1.5 ${
                activeTab === 'gaps' ? 'bg-white text-[var(--royal-indigo)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Completion Gaps
              {status && status.pendingGaps > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all rounded ${
                activeTab === 'matrix' ? 'bg-white text-[var(--royal-indigo)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Competence Matrix
            </button>
          </div>
          {status && status.pendingGaps === 0 && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded">
              <CheckCircle className="h-3.5 w-3.5" />
              ISO 42001 Clause 7.2 Compliant
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2 font-mono">
            <RefreshCw className="h-5 w-5 animate-spin text-[var(--royal-indigo)]" />
            SYNCHRONIZING TRAINING LEDGER...
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            {activeTab === 'courses' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Course Syllabus</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Framework Alignment</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Duration</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Requirement Tier</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Log completions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[12px] text-slate-800">{c.title}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{c.description || 'No description provided.'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.framework_tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-bold uppercase font-mono border border-slate-200">
                              <Tag className="h-2 w-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-600 font-mono flex items-center gap-1.5 mt-1.5 border-none">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {c.duration_minutes} Mins
                      </td>
                      <td className="px-6 py-4">
                        {c.is_mandatory ? (
                          <span className="badge-pill bg-indigo-50 text-[var(--royal-indigo)] font-bold text-[8px] uppercase tracking-wide">MANDATORY</span>
                        ) : (
                          <span className="badge-pill bg-slate-50 text-slate-400 font-bold text-[8px] uppercase tracking-wide">ELECTIVE</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedCourseId(c.id);
                            setIsLogModalOpen(true);
                          }}
                          className="px-2.5 py-1 border border-[var(--royal-indigo)] rounded text-[9px] font-semibold uppercase tracking-widest text-[var(--royal-indigo)] hover:bg-[var(--ghost-violet)]/20 active:scale-95 transition-all"
                        >
                          Record Signoff
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'gaps' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Employee Details</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Outstanding Syllabus Gap</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Compliance Deficit</th>
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Action Signoff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {status && status.gaps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400 text-xs font-medium">
                        No outstanding compliance training gaps detected. ISO 42001 competence check fully satisfied!
                      </td>
                    </tr>
                  ) : (
                    status?.gaps.map((gap, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[12px] text-slate-800">{gap.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{gap.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-[11px] text-slate-700">
                          {gap.courseTitle}
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge-pill bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-bold uppercase tracking-wider">
                            PRACTICAL DEFICIT
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedCourseId(gap.courseId);
                              setLogUserId(gap.userId);
                              setIsLogModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded text-[9px] font-semibold uppercase tracking-widest text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                          >
                            Signoff Course
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'matrix' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Employee List</th>
                    {courses.map(c => (
                      <th key={c.id} className="px-6 py-3.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 text-center truncate max-w-[120px]">
                        {c.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uniqueUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[12px] text-slate-800">{user.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                      </td>
                      
                      {courses.map(c => {
                        // Check if this user completed this course
                        const completion = c.completions?.find(comp => comp.user_id === user.id);
                        
                        return (
                          <td key={c.id} className="px-6 py-4 text-center">
                            {completion ? (
                              completion.passed ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  <span className="text-[8px] font-bold text-emerald-600 font-mono">{completion.score}% Passed</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <XCircle className="h-4 w-4 text-rose-500" />
                                  <span className="text-[8px] font-bold text-rose-600 font-mono">{completion.score}% Failed</span>
                                </div>
                              )
                            ) : c.is_mandatory ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <XCircle className="h-4 w-4 text-slate-300" />
                                <span className="text-[8px] font-bold text-rose-600 uppercase tracking-tighter">REQUIRED GAP</span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ELECTIVE</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
