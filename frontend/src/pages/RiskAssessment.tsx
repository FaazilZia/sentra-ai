import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  ClipboardCheck, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertTriangle, Shield, Play, HelpCircle, Bot, AlertCircle
} from 'lucide-react';

interface AISystem {
  id: string;
  name: string;
  use_case: string;
  risk_tier: string;
}

interface RiskAssessmentItem {
  id: string;
  score: number;
  risk_level: string;
  status: string;
  created_at: string;
  ai_system: AISystem;
}

const QUESTIONS = [
  {
    key: 'use_case_cat',
    text: 'What is the category of the AI system\'s usecase?',
    options: [
      { text: 'Low risk / Internal utility (e.g., log search, summarization)', score: 5 },
      { text: 'Standard user interaction (e.g., conversational agent)', score: 12 },
      { text: 'High risk / HR / Evaluation / Access assessment', score: 18 },
      { text: 'Critical infrastructure or medical / biometrics', score: 20 }
    ]
  },
  {
    key: 'sensitive_data',
    text: 'Will the system process personal or highly sensitive data?',
    options: [
      { text: 'No personal data or purely static public data', score: 5 },
      { text: 'Pseudonymized or anonymized internal metadata only', score: 10 },
      { text: 'Direct PII (e.g., names, emails, addresses)', score: 15 },
      { text: 'Highly sensitive or regulated data (e.g., health, financial)', score: 20 }
    ]
  },
  {
    key: 'autonomy',
    text: 'How autonomous are the decisions made by the AI?',
    options: [
      { text: 'Pure recommendation or draft generation (100% human reviewed)', score: 5 },
      { text: 'Human-in-the-loop audit (AI suggests, human approves execution)', score: 10 },
      { text: 'Semi-autonomous with retroactive human oversight audit', score: 15 },
      { text: 'Fully autonomous primary decision execution', score: 20 }
    ]
  },
  {
    key: 'user_base',
    text: 'What is the scale of the target user base?',
    options: [
      { text: 'Under 100 internal / sandbox developers only', score: 5 },
      { text: 'All internal employees across organization', score: 10 },
      { text: 'Under 10,000 customers or external users', score: 15 },
      { text: 'Over 10,000 customers or public / unrestricted access', score: 20 }
    ]
  },
  {
    key: 'guardrails',
    text: 'What guardrails and monitoring are currently active?',
    options: [
      { text: 'Full input filtering, output validation, and continuous drift monitoring', score: 5 },
      { text: 'Standard input / output validation guardrails', score: 10 },
      { text: 'Basic prompt logging only', score: 15 },
      { text: 'None / direct unchecked access', score: 20 }
    ]
  }
];

export default function RiskAssessment() {
  const [assessments, setAssessments] = useState<RiskAssessmentItem[]>([]);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; score: number }>>({});
  
  // Active Assessment State
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  
  // Finished State
  const [finishedResult, setFinishedResult] = useState<{
    score: number;
    risk_level: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assRes, sysRes] = await Promise.all([
        apiRequest<{ items: RiskAssessmentItem[] }>('/governance/risk-assessments'),
        apiRequest<{ items: AISystem[] }>('/ai-systems')
      ]);
      setAssessments(assRes.items || []);
      setSystems(sysRes.items || []);
    } catch (err) {
      console.error('Failed to load risk assessment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!selectedSystemId) return;
    try {
      const res = await apiRequest<RiskAssessmentItem>('/governance/risk-assessments', {
        method: 'POST',
        body: JSON.stringify({ ai_system_id: selectedSystemId })
      });
      setActiveAssessmentId(res.id);
      setCurrentStep(0);
      setAnswers({});
      setFinishedResult(null);
      setIsWizardOpen(true);
    } catch (err) {
      console.error('Failed to start risk assessment:', err);
    }
  };

  const handleSelectOption = (questionKey: string, optionText: string, score: number) => {
    setAnswers({
      ...answers,
      [questionKey]: { answer: optionText, score }
    });
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!activeAssessmentId) return;
    
    // Prepare answers payload
    const payload = QUESTIONS.map((q) => {
      const ans = answers[q.key];
      return {
        question_key: q.key,
        answer: ans?.answer || '',
        score: ans?.score || 0
      };
    });

    try {
      const res = await apiRequest<RiskAssessmentItem>(`/governance/risk-assessments/${activeAssessmentId}/submit`, {
        method: 'PUT',
        body: JSON.stringify({ answers: payload })
      });
      setFinishedResult({
        score: res.score,
        risk_level: res.risk_level
      });
      // Refresh list
      loadData();
    } catch (err) {
      console.error('Failed to submit risk assessment:', err);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-indigo-400" />
          STRUCTURED RISK ASSESSMENTS
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Perform multi-step qualitative risk tier assessments to evaluate vulnerability, classification, and oversight protocols.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Creator and Past Assessments */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* New Assessment Card */}
          <div className="bg-gradient-to-br from-[#1e1b4b]/40 to-[#311042]/20 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                Initiate Risk Tier Assessment
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                Run a dynamic questionnaire audit of a newly registered or updated AI System to recalculate and bind its risk classification tier.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
                <select
                  value={selectedSystemId}
                  onChange={(e) => setSelectedSystemId(e.target.value)}
                  className="bg-black/40 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 flex-1"
                >
                  <option value="">Select AI System to assess...</option>
                  {systems.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.risk_tier} Risk)</option>
                  ))}
                </select>
                <button
                  onClick={handleStartAssessment}
                  disabled={!selectedSystemId}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg disabled:opacity-40 disabled:pointer-events-none hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  <Play className="h-4 w-4" />
                  Begin Audit
                </button>
              </div>
            </div>
            {/* Decorative BG element */}
            <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
          </div>

          {/* Past Assessments List */}
          <div className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-gray-400">
              Assessment Logs & Tiers
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
              </div>
            ) : assessments.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                No risk assessments logged yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {assessments.map((ass) => (
                  <div
                    key={ass.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-800/60 bg-[#0b0f19]/30 hover:border-gray-700 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-gray-800 p-2 text-gray-400">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{ass.ai_system?.name || 'Unknown System'}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Assessed on {new Date(ass.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Audit Score</span>
                        <span className="text-sm font-black text-white">{ass.score} / 100</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-black uppercase ${getRiskLevelColor(ass.risk_level)}`}>
                        {ass.risk_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Framework explanation / Wizard Guide */}
        <div className="lg:col-span-1">
          <div className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-gray-800/80 pb-3">
              <HelpCircle className="h-4 w-4 text-indigo-400" />
              Risk Tier Methodology
            </h3>
            
            <div className="flex flex-col gap-3 text-xs text-gray-400 leading-relaxed">
              <p>
                Sentra AI utilizes a standardized point-based risk scoring framework aligned with standard EU AI Act use case classifications.
              </p>
              
              <div className="flex flex-col gap-2 bg-black/20 p-3.5 rounded-xl border border-gray-800/60 mt-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-400">LOW TIER</span>
                  <span className="text-gray-500 font-mono">0 - 30 pts</span>
                </div>
                <p className="text-[10px] text-gray-500">Internal utility pipelines or heavily audited sandboxes with active masking/filtering.</p>
                
                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-yellow-400">MEDIUM TIER</span>
                  <span className="text-gray-500 font-mono">31 - 60 pts</span>
                </div>
                <p className="text-[10px] text-gray-500">Standard customer interactions with active logging and human-in-the-loop review.</p>

                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-orange-400">HIGH TIER</span>
                  <span className="text-gray-500 font-mono">61 - 80 pts</span>
                </div>
                <p className="text-[10px] text-gray-500">HR, evaluation, access control or financial data pipelines. Requires rigorous auditing.</p>

                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-red-400">CRITICAL TIER</span>
                  <span className="text-gray-500 font-mono">81 - 100 pts</span>
                </div>
                <p className="text-[10px] text-gray-500">Highly autonomous systems processing sensitive health, financial or biometrics pipelines.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-in">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Active Governance Audit</span>
                <h3 className="font-bold text-white text-base mt-0.5">Qualitative Risk Matrix Questionnaire</h3>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Wizard Body */}
            <div className="p-6">
              {!finishedResult ? (
                <div className="flex flex-col gap-6">
                  {/* Step progress indicator */}
                  <div className="flex items-center gap-1.5">
                    {QUESTIONS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full flex-1 transition-all ${
                          i === currentStep 
                            ? 'bg-indigo-500' 
                            : i < currentStep 
                              ? 'bg-indigo-900/60' 
                              : 'bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Question Block */}
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Question {currentStep + 1} of {QUESTIONS.length}</span>
                    <h2 className="text-lg font-bold text-white leading-relaxed">{QUESTIONS[currentStep].text}</h2>
                    
                    <div className="flex flex-col gap-3 mt-2">
                      {QUESTIONS[currentStep].options.map((opt, i) => {
                        const questionKey = QUESTIONS[currentStep].key;
                        const isSelected = answers[questionKey]?.answer === opt.text;
                        return (
                          <div
                            key={i}
                            onClick={() => handleSelectOption(questionKey, opt.text, opt.score)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer text-xs font-semibold leading-relaxed flex items-center justify-between gap-4 ${
                              isSelected 
                                ? 'bg-indigo-950/20 border-indigo-500/60 text-white shadow-md' 
                                : 'bg-[#0f172a]/40 border-gray-800/80 hover:bg-black/30 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <span>{opt.text}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-800 text-gray-500 font-bold">+{opt.score} pts</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between border-t border-gray-800/80 pt-5 mt-4">
                    <button
                      onClick={handlePrev}
                      disabled={currentStep === 0}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none font-semibold"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>

                    {currentStep < QUESTIONS.length - 1 ? (
                      <button
                        onClick={handleNext}
                        disabled={!answers[QUESTIONS[currentStep].key]}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-indigo-500 transition-all"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!answers[QUESTIONS[currentStep].key]}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 text-xs font-semibold text-white disabled:opacity-40 disabled:pointer-events-none hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/10"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Submit Audit
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Success / Summary Screen
                <div className="flex flex-col items-center justify-center py-10 text-center animate-scale-in">
                  <div className="rounded-full bg-emerald-500/10 p-4 border border-emerald-500/20 mb-4 animate-bounce">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white">Risk Tier Audit Completed</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    Structured audit has completed successfully. System risk tier updated in the registry.
                  </p>

                  <div className="flex gap-6 mt-8 p-6 bg-black/20 rounded-2xl border border-gray-800/80 w-full max-w-sm justify-around">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-black block tracking-wider">Final Score</span>
                      <span className="text-2xl font-black text-white">{finishedResult.score} <span className="text-xs text-gray-500 font-normal">/ 100</span></span>
                    </div>
                    <div className="border-r border-gray-800" />
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-black block tracking-wider">Risk Classification</span>
                      <span className={`text-base font-black px-3 py-0.5 rounded-full border block mt-1.5 ${getRiskLevelColor(finishedResult.risk_level)}`}>
                        {finishedResult.risk_level}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsWizardOpen(false)}
                    className="mt-8 rounded-xl bg-gray-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-gray-700 transition-all"
                  >
                    Close Wizard
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
