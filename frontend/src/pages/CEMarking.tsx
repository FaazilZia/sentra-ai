import { useState, useEffect } from 'react';
import { 
  Award, FileText, CheckCircle2, Shield, Activity, 
  Database, BookOpen, ChevronRight, X, Sparkles, 
  AlertTriangle, HelpCircle, Save 
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';

interface CeMarkingRecord {
  id: string;
  classification: 'UNACCEPTABLE' | 'HIGH_RISK' | 'LIMITED_RISK' | 'MINIMAL_RISK';
  scope_notes: string | null;
  step1_conformity_assessment: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step2_technical_documentation: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step3_quality_management: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step4_declaration_of_conformity: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step5_eu_database_registration: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step6_ce_mark_affixing: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step7_post_market_monitoring: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  step1_notes: string | null;
  step2_notes: string | null;
  step3_notes: string | null;
  step4_notes: string | null;
  step5_notes: string | null;
  step6_notes: string | null;
  step7_notes: string | null;
  overall_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'CERTIFIED';
  certified_at: string | null;
  ai_system: { id: string; name: string; model_name: string };
}

interface AiSystem {
  id: string;
  name: string;
  model_name: string;
  risk_tier: string;
}

const STEPS_CONFIG = [
  { key: 'step1_conformity_assessment', label: '1. Conformity Assessment', icon: Shield, desc: 'Assess and verify compliance with mandatory EU safety/rights requirements.' },
  { key: 'step2_technical_documentation', label: '2. Technical Documentation', icon: FileText, desc: 'Compile technical details, architecture charts, and risk management parameters.' },
  { key: 'step3_quality_management', label: '3. Quality Management System', icon: Activity, desc: 'Establish continuous monitoring of accuracy, robustness, and dataset quality.' },
  { key: 'step4_declaration_of_conformity', label: '4. Declaration of Conformity', icon: Award, desc: 'Sign and publish the official EU declaration of conformity.' },
  { key: 'step5_eu_database_registration', label: '5. EU Database Registration', icon: Database, desc: 'Register the high-risk AI system in the centralized EU compliance database.' },
  { key: 'step6_ce_mark_affixing', label: '6. CE Mark Affixing', icon: Sparkles, desc: 'Affix the physical or digital CE marking to system access interfaces.' },
  { key: 'step7_post_market_monitoring', label: '7. Post-Market Monitoring Plan', icon: BookOpen, desc: 'Implement automated telemetry logging for continuous post-deployment auditing.' },
];

export default function CEMarking() {
  const addToast = useStore((s) => s.addToast);
  const [aiSystems, setAiSystems] = useState<AiSystem[]>([]);
  const [records, setRecords] = useState<CeMarkingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecord, setActiveRecord] = useState<CeMarkingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Edit States for active record
  const [classification, setClassification] = useState<string>('LIMITED_RISK');
  const [scopeNotes, setScopeNotes] = useState<string>('');
  const [steps, setSteps] = useState<Record<string, { status: string; notes: string }>>({});

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sysRes, recRes] = await Promise.all([
        apiRequest<{ items: AiSystem[] }>('/ai-systems'),
        apiRequest<{ data: CeMarkingRecord[] }>('/ce-marking'),
      ]);
      setAiSystems(sysRes?.items || []);
      setRecords(recRes?.data || []);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load CE Marking data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRecord = async (aiSystemId: string) => {
    try {
      const res = await apiRequest<{ data: CeMarkingRecord }>(`/ce-marking/${aiSystemId}`);
      const rec = res?.data;
      if (rec) {
        setActiveRecord(rec);
        setClassification(rec.classification);
        setScopeNotes(rec.scope_notes || '');
        
        const initSteps: Record<string, { status: string; notes: string }> = {};
        STEPS_CONFIG.forEach(s => {
          const indexNum = s.key.match(/\d+/)?.[0];
          initSteps[s.key] = {
            status: (rec as any)[s.key] || 'NOT_STARTED',
            notes: (rec as any)[`step${indexNum}_notes`] || '',
          };
        });
        setSteps(initSteps);
      }
    } catch (err: any) {
      addToast({ message: 'Failed to open CE Marking record', type: 'error' });
    }
  };

  const handleSaveClassification = async () => {
    if (!activeRecord) return;
    setSaving(true);
    try {
      const updated = await apiRequest<{ data: CeMarkingRecord }>(`/ce-marking/${activeRecord.ai_system_id}/classification`, {
        method: 'PATCH',
        body: JSON.stringify({ classification, scopeNotes }),
      });
      addToast({ message: 'Conformity classification saved successfully', type: 'success' });
      setActiveRecord(updated.data);
      await loadData(true);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save classification', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStep = async (stepKey: string) => {
    if (!activeRecord) return;
    const stepData = steps[stepKey];
    if (!stepData) return;
    
    setSaving(true);
    try {
      const updated = await apiRequest<{ data: CeMarkingRecord }>(`/ce-marking/${activeRecord.ai_system_id}/step`, {
        method: 'PATCH',
        body: JSON.stringify({
          step: stepKey,
          status: stepData.status,
          notes: stepData.notes,
        }),
      });
      addToast({ message: `Saved conformity step successfully`, type: 'success' });
      
      // Update local state
      setActiveRecord(updated.data);
      const indexNum = stepKey.match(/\d+/)?.[0];
      setSteps(prev => ({
        ...prev,
        [stepKey]: {
          status: (updated.data as any)[stepKey],
          notes: (updated.data as any)[`step${indexNum}_notes`] || '',
        }
      }));
      await loadData(true);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update conformity step', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const completedStepsCount = Object.values(steps).filter(s => s.status === 'COMPLETED').length;
  const progressPct = Math.round((completedStepsCount / STEPS_CONFIG.length) * 100);

  const statusColor = (s: string) => s === 'CERTIFIED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-950/20'
    : s === 'IN_PROGRESS' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-950/20'
    : 'text-gray-400 bg-gray-500/10 border-gray-500/20';

  if (activeRecord) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
        <div>
          <button onClick={() => setActiveRecord(null)} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest mb-2 flex items-center gap-1">
            ← Back to systems list
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" />
                CE Marking Conformity Checklist — {activeRecord.ai_system?.name}
              </h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                EU AI Act CE Conformity assessment route tracking & certification
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Conformity Progress</p>
                <p className="text-sm font-black text-white">{completedStepsCount}/{STEPS_CONFIG.length} <span className="text-gray-500 font-normal">steps completed</span></p>
                <div className="w-32 h-1 bg-gray-800 rounded-full mt-1">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <span className={cn('text-[9px] font-black uppercase px-2.5 py-1.5 rounded border shadow-lg', statusColor(activeRecord.overall_status))}>
                {activeRecord.overall_status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classification & Notes Card */}
          <div className="lg:col-span-1">
            <div className="bg-[#111827]/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5 sticky top-6">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Risk Classification</h3>
                
                <div className="flex flex-col gap-1.5 mb-4">
                  <label htmlFor="classification-select" className="text-[10px] font-bold text-gray-500 uppercase">Conformity Class</label>
                  <select
                    id="classification-select"
                    value={classification}
                    onChange={e => setClassification(e.target.value)}
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MINIMAL_RISK">MINIMAL RISK (Class A)</option>
                    <option value="LIMITED_RISK">LIMITED RISK (Class B)</option>
                    <option value="HIGH_RISK">HIGH RISK (Class C)</option>
                    <option value="UNACCEPTABLE">UNACCEPTABLE RISK (Banned)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 mb-4">
                  <label htmlFor="scope-notes-textarea" className="text-[10px] font-bold text-gray-500 uppercase">Scope & Compliance Notes</label>
                  <textarea
                    id="scope-notes-textarea"
                    value={scopeNotes}
                    onChange={e => setScopeNotes(e.target.value)}
                    placeholder="Enter compliance justification notes, applicability criteria..."
                    rows={4}
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button onClick={handleSaveClassification} disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Save className="h-3.5 w-3.5" />
                  Save Classification
                </button>
              </div>

              <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-4 text-[10px] text-indigo-300 leading-relaxed">
                <HelpCircle className="h-4 w-4 mb-1 text-indigo-400 block" />
                CE Conformity assessment records must be kept by deployers for at least 10 years following launch in the EU market under Chapter V of the EU AI Act.
              </div>
            </div>
          </div>

          {/* 7 Steps checklist */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {STEPS_CONFIG.map((s, idx) => {
              const val = steps[s.key] || { status: 'NOT_STARTED', notes: '' };
              const isDone = val.status === 'COMPLETED';
              const isInProgress = val.status === 'IN_PROGRESS';
              return (
                <div key={s.key} className={cn(
                  "bg-[#111827]/40 border rounded-2xl p-5 backdrop-blur-md transition-all",
                  isDone ? "border-emerald-500/20 shadow-lg shadow-emerald-950/5" : (isInProgress ? "border-amber-500/20 shadow-lg shadow-amber-950/5" : "border-gray-800")
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-xl border flex items-center justify-center shrink-0",
                        isDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : (isInProgress ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-gray-900/60 border-gray-800 text-gray-500")
                      )}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-tight">{s.label}</h4>
                        <p className="text-[10.5px] text-gray-400 leading-normal mt-0.5">{s.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                      <select
                        value={val.status}
                        onChange={e => setSteps(prev => ({ ...prev, [s.key]: { ...val, status: e.target.value as any } }))}
                        className={cn(
                          "bg-gray-900 border text-[10px] font-black uppercase tracking-wider rounded-xl px-3 py-1.5 outline-none transition-colors cursor-pointer",
                          val.status === 'COMPLETED' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : (val.status === 'IN_PROGRESS' ? "border-amber-500/30 text-amber-400 bg-amber-500/5" : "border-gray-800 text-gray-500")
                        )}
                      >
                        <option value="NOT_STARTED">NOT STARTED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center mt-3">
                    <input
                      value={val.notes}
                      onChange={e => setSteps(prev => ({ ...prev, [s.key]: { ...val, notes: e.target.value } }))}
                      placeholder="Conformity evidence URL, implementation details, or notes..."
                      className="flex-1 bg-gray-900/40 border border-gray-850 rounded-xl px-3 py-2 text-[10.5px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-indigo-500"
                    />
                    <button onClick={() => handleSaveStep(s.key)} disabled={saving}
                      className="px-3.5 py-2 rounded-xl border border-gray-800 hover:border-indigo-500/30 bg-gray-900/60 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest active:scale-95 transition-all">
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-indigo-400" />
          CE Marking conformity OS
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
          EU AI Act Chapter II CE Certification Checklist
        </p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading CE marking records...</div>
        ) : aiSystems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-[11px] font-black uppercase tracking-widest">No systems registered</p>
            <p className="text-[10px] mt-1">Add AI systems to the registry first to begin tracking CE conformity certification.</p>
          </div>
        ) : aiSystems.map(sys => {
          const record = records.find(r => r.ai_system_id === sys.id);
          const completedCount = record ? [
            record.step1_conformity_assessment,
            record.step2_technical_documentation,
            record.step3_quality_management,
            record.step4_declaration_of_conformity,
            record.step5_eu_database_registration,
            record.step6_ce_mark_affixing,
            record.step7_post_market_monitoring,
          ].filter(s => s === 'COMPLETED').length : 0;
          
          const overallStatus = record?.overall_status || 'NOT_STARTED';

          return (
            <button key={sys.id} onClick={() => openRecord(sys.id)}
              className="w-full text-left bg-[#111827]/40 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Award className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {sys.name}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">{sys.model_name} — {sys.risk_tier} Risk</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Progress</p>
                    <p className="text-[11px] font-bold text-white">{completedCount}/7 completed</p>
                  </div>
                  <span className={cn('text-[9px] font-black uppercase px-2.5 py-1 rounded border', statusColor(overallStatus))}>
                    {overallStatus}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
