import { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, Trash2, Cpu, Zap, Mail, MessageSquare, AlertOctagon, FileText, CheckCircle, XCircle, ChevronRight, ChevronLeft, Plus, X, RefreshCw } from 'lucide-react';
import { fetchAutomations, createAutomation, toggleAutomation, deleteAutomation, Automation, AutomationExecutionLog } from '@/lib/api';

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<AutomationExecutionLog[]>([]);
  const [selectedAutoName, setSelectedAutoName] = useState<string>('');

  // Wizard Step states
  const [wizardStep, setWizardStep] = useState(1);
  const [newAutoName, setNewAutoName] = useState('');
  const [newAutoDesc, setNewAutoDesc] = useState('');
  const [newTriggerType, setNewTriggerType] = useState('DRIFT_ALERT_CREATED');
  const [newTriggerConfig, setNewTriggerConfig] = useState<any>({});
  const [newActionType, setNewActionType] = useState('SEND_SLACK_NOTIFICATION');
  const [newActionConfig, setNewActionConfig] = useState<any>({ channel: '#compliance-alerts' });

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAutomations();
      setAutomations(data);
      // Auto select the first automation's logs if present
      if (data.length > 0) {
        setSelectedLogs(data[0].execution_logs || []);
        setSelectedAutoName(data[0].name);
      }
    } catch (err) {
      console.error('Failed to load automations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAutomation(id, !currentStatus);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automated rule?')) return;
    try {
      await deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
      if (selectedAutoName && !automations.find(a => a.id === id)?.name) {
        setSelectedLogs([]);
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutoName.trim()) return;

    try {
      const payload = {
        name: newAutoName,
        description: newAutoDesc,
        trigger_type: newTriggerType,
        trigger_config: newTriggerConfig,
        action_type: newActionType,
        action_config: newActionConfig,
        is_active: true
      };

      const created = await createAutomation(payload);
      setAutomations(prev => [created, ...prev]);
      setIsWizardOpen(false);
      
      // Reset states
      setNewAutoName('');
      setNewAutoDesc('');
      setWizardStep(1);
      setNewTriggerType('DRIFT_ALERT_CREATED');
      setNewActionType('SEND_SLACK_NOTIFICATION');
      setNewActionConfig({ channel: '#compliance-alerts' });
      
      loadAutomations();
    } catch (err) {
      console.error('Failed to create automation rule', err);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'DRIFT_ALERT_CREATED': return <Zap className="h-4 w-4 text-amber-500 animate-pulse" />;
      case 'INCIDENT_CREATED': return <AlertOctagon className="h-4 w-4 text-rose-500" />;
      case 'COMPLIANCE_SCORE_BELOW_THRESHOLD': return <FileText className="h-4 w-4 text-indigo-500" />;
      default: return <Cpu className="h-4 w-4 text-slate-500" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'SEND_EMAIL': return <Mail className="h-4 w-4 text-teal-500" />;
      case 'SEND_SLACK_NOTIFICATION': return <MessageSquare className="h-4 w-4 text-pink-500" />;
      case 'CREATE_INCIDENT': return <AlertOctagon className="h-4 w-4 text-rose-500" />;
      case 'GENERATE_REPORT': return <FileText className="h-4 w-4 text-indigo-500" />;
      default: return <Cpu className="h-4 w-4 text-slate-500" />;
    }
  };

  // Compute metrics
  const totalAutomations = automations.length;
  const activeCount = automations.filter(a => a.is_active).length;
  const totalLogsCount = automations.reduce((sum, a) => sum + (a.execution_logs?.length || 0), 0);
  const successCount = automations.reduce((sum, a) => sum + (a.execution_logs?.filter(l => l.status === 'SUCCESS').length || 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      
      {/* 3-Step Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-base max-w-lg w-full bg-white relative overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-[var(--royal-indigo)] p-1.5 rounded-lg">
                  <Zap className="h-4 w-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Rule Builder Wizard</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Step {wizardStep} of 3</span>
                </div>
              </div>
              <button 
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Progress Tracker Bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`flex-1 h-1.5 rounded-full ${wizardStep >= 1 ? 'bg-[var(--royal-indigo)]' : 'bg-slate-100'}`} />
                <div className={`flex-1 h-1.5 rounded-full ${wizardStep >= 2 ? 'bg-[var(--royal-indigo)]' : 'bg-slate-100'}`} />
                <div className={`flex-1 h-1.5 rounded-full ${wizardStep >= 3 ? 'bg-[var(--royal-indigo)]' : 'bg-slate-100'}`} />
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Rule Name</label>
                    <input 
                      type="text" 
                      value={newAutoName}
                      onChange={(e) => setNewAutoName(e.target.value)}
                      placeholder="e.g. Notify Slack on Drift Alert"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Description (Optional)</label>
                    <textarea 
                      value={newAutoDesc}
                      onChange={(e) => setNewAutoDesc(e.target.value)}
                      placeholder="Explain what events this rule triggers and manages."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 h-20 focus:border-[var(--royal-indigo)]"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Select System Trigger Type</label>
                    <select
                      value={newTriggerType}
                      onChange={(e) => {
                        setNewTriggerType(e.target.value);
                        if (e.target.value === 'COMPLIANCE_SCORE_BELOW_THRESHOLD') {
                          setNewTriggerConfig({ threshold: 80 });
                        } else {
                          setNewTriggerConfig({});
                        }
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-bold text-slate-800"
                    >
                      <option value="DRIFT_ALERT_CREATED">🚨 MODEL DRIFT DETECTED</option>
                      <option value="INCIDENT_CREATED">🔥 NEW GOVERNANCE INCIDENT CREATED</option>
                      <option value="COMPLIANCE_SCORE_BELOW_THRESHOLD">📉 FRAMEWORK COMPLIANCE DEGRADATION</option>
                      <option value="FRIA_COMPLETED">📋 FRIA ASSESSMENT APPROVED</option>
                    </select>
                  </div>
                  
                  {newTriggerType === 'COMPLIANCE_SCORE_BELOW_THRESHOLD' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Maturity Score Threshold (%)</label>
                      <input 
                        type="number" 
                        value={newTriggerConfig.threshold || 80}
                        onChange={(e) => setNewTriggerConfig({ threshold: parseInt(e.target.value) })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                      />
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Select Governance Action</label>
                    <select
                      value={newActionType}
                      onChange={(e) => {
                        setNewActionType(e.target.value);
                        if (e.target.value === 'SEND_SLACK_NOTIFICATION') {
                          setNewActionConfig({ channel: '#compliance-alerts' });
                        } else if (e.target.value === 'SEND_EMAIL') {
                          setNewActionConfig({ recipient: 'security@organization.com' });
                        } else if (e.target.value === 'CREATE_INCIDENT') {
                          setNewActionConfig({ severity: 'HIGH' });
                        } else {
                          setNewActionConfig({});
                        }
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-bold text-slate-800"
                    >
                      <option value="SEND_SLACK_NOTIFICATION">💬 SEND INSTANT SLACK ALERT</option>
                      <option value="SEND_EMAIL">📧 DISPATCH EMAIL DIGEST</option>
                      <option value="CREATE_INCIDENT">🔥 CREATE INVESTIGATION INCIDENT</option>
                      <option value="GENERATE_REPORT">📊 AUTO-COMPILE COMPLIANCE AUDIT</option>
                    </select>
                  </div>

                  {newActionType === 'SEND_SLACK_NOTIFICATION' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Slack Channel Target</label>
                      <input 
                        type="text" 
                        value={newActionConfig.channel || ''}
                        onChange={(e) => setNewActionConfig({ channel: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-mono"
                      />
                    </div>
                  )}

                  {newActionType === 'SEND_EMAIL' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Recipient Email Address</label>
                      <input 
                        type="email" 
                        value={newActionConfig.recipient || ''}
                        onChange={(e) => setNewActionConfig({ recipient: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                      />
                    </div>
                  )}

                  {newActionType === 'CREATE_INCIDENT' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Escalated Severity Tier</label>
                      <select 
                        value={newActionConfig.severity || 'HIGH'}
                        onChange={(e) => setNewActionConfig({ severity: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-bold"
                      >
                        <option value="LOW">LOW SEVERITY</option>
                        <option value="MEDIUM">MEDIUM SEVERITY</option>
                        <option value="HIGH">HIGH SEVERITY</option>
                        <option value="CRITICAL">CRITICAL BREACH</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => prev - 1)}
                className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-white active:bg-slate-100 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => prev + 1)}
                  className="flex items-center gap-1 px-4 py-2 bg-[var(--royal-indigo)] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!newAutoName.trim()}
                  onClick={handleCreateAutomation}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                >
                  Deploy Rule
                  <Zap className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Banner Dashboard Actions */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 bg-white px-4 py-3 rounded-[var(--radius)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Automations Control Center</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Coordinate system events to trigger compliance, notifications, and alert actions</p>
          </div>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--royal-indigo)] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-500/10"
        >
          <Plus className="h-4 w-4" />
          Create Rule
        </button>
      </div>

      {/* Operational Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Rules</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{totalAutomations}</div>
          </div>
          <div className="bg-slate-50 text-slate-500 p-2.5 rounded-xl border border-slate-100">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Active Pipelines</div>
            <div className="text-xl font-bold mt-1 text-indigo-600">{activeCount}</div>
          </div>
          <div className="bg-indigo-50 text-[var(--royal-indigo)] p-2.5 rounded-xl border border-indigo-100">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Executions</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{totalLogsCount}</div>
          </div>
          <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl border border-teal-100">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Success Rate</div>
            <div className="text-xl font-bold mt-1 text-teal-600">
              {totalLogsCount > 0 ? `${Math.round((successCount / totalLogsCount) * 100)}%` : '100%'}
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Automation Rules List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card-base bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Configured Rule Pipelines</h3>
              <span className="badge-pill bg-slate-200 text-slate-600 font-bold">{automations.length} Active</span>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2 font-mono">
                <RefreshCw className="h-5 w-5 animate-spin text-[var(--royal-indigo)]" />
                LOADING AUTOMATIONS PIPELINE...
              </div>
            ) : automations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                No automated rules found. Use the "Create Rule" builder to coordinate system events!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {automations.map((auto) => (
                  <div 
                    key={auto.id}
                    onClick={() => {
                      setSelectedLogs(auto.execution_logs || []);
                      setSelectedAutoName(auto.name);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLogs(auto.execution_logs || []); setSelectedAutoName(auto.name); } }}
                    role="button"
                    tabIndex={0}
                    className={`p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors cursor-pointer ${
                      selectedAutoName === auto.name ? 'bg-indigo-50/30 border-l-2 border-[var(--royal-indigo)]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[12px] text-slate-800">{auto.name}</span>
                        {!auto.is_active && (
                          <span className="badge-pill bg-slate-100 text-slate-500 text-[8px] uppercase tracking-tighter">INACTIVE</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{auto.description || 'No description provided.'}</p>
                      
                      {/* Triggers and actions detail tags */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                          {getTriggerIcon(auto.trigger_type)}
                          Trigger: {auto.trigger_type.split('_').slice(0, 2).join(' ')}
                        </div>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                          {getActionIcon(auto.action_type)}
                          Action: {auto.action_type.split('_').slice(1).join(' ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(auto.id, auto.is_active);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {auto.is_active ? (
                          <ToggleRight className="h-7 w-7 text-indigo-600" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-slate-300" />
                        )}
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(auto.id);
                        }}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Execution Logs Panel */}
        <div className="lg:col-span-1">
          <div className="card-base bg-white overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Execution Run logs</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider truncate max-w-[150px]">{selectedAutoName || 'System Logs'}</p>
              </div>
              <span className="badge-pill bg-teal-50 text-teal-600 font-bold border-teal-100">{selectedLogs.length} Runs</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center font-medium p-6">
                  No execution outcomes recorded for this rule yet.
                </div>
              ) : (
                selectedLogs.map((log) => (
                  <div key={log.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        ) : log.status === 'FAILURE' ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <Cpu className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                          log.status === 'SUCCESS' ? 'text-teal-600' : log.status === 'FAILURE' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold">{new Date(log.ran_at).toLocaleTimeString()}</span>
                    </div>

                    <p className="text-[10px] text-slate-600 leading-normal font-mono select-all bg-white border border-slate-200/40 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {log.output || 'No execution output returned.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
