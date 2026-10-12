import { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, ChevronRight, ChevronLeft, 
  Terminal, ShieldCheck, Settings, Play, Copy
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';

export default function OnboardingWizard() {
  const addToast = useStore((state) => state.addToast);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  const { user } = useAuth();

  useEffect(() => {
    const onboarded = localStorage.getItem('sentra_onboarded');
    if (!onboarded) {
      const userCreated = user?.createdAt || user?.created_at;
      if (userCreated) {
        const createdDate = new Date(userCreated);
        const diffMs = Date.now() - createdDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < 24) {
          setIsOpen(true);
        }
      } else {
        setIsOpen(true);
      }
    }
  }, [user]);

  const handleClose = () => {
    localStorage.setItem('sentra_onboarded', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCopyCode = () => {
    const code = `import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({
  apiKey: process.env.SENTRA_API_KEY || 'sk-sentra-...'
});

// Intercept action before execution
const decision = await sentra.checkAction({
  agentId: 'billing-assistant',
  action: 'database.write',
  metadata: {
    prompt: 'Delete user account user_94819'
  }
});

if (decision.status === 'BLOCK') {
  console.log('Action blocked by governance:', decision.reason);
} else {
  // Execute action safely
}`;
    void navigator.clipboard.writeText(code);
    addToast({ message: 'SDK Integration code copied!', type: 'success' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-[#111827] border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden text-xs text-gray-300 relative flex flex-col min-h-[460px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/60 p-5 bg-[#0f172a]/60">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-1.5 border border-indigo-500/20">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Platform Onboarding</span>
              <h3 className="font-bold text-white text-sm mt-0.5">Quick Setup Guide</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 animate-slide-in">
              <h4 className="text-base font-black text-white uppercase tracking-tight">Welcome to Sentraa AI GRC</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Sentraa AI is a pre-execution governance platform designed to monitor, intercept, and govern high-risk operations initiated by autonomous AI agents in real-time.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="bg-black/20 border border-gray-800 rounded-xl p-4 flex gap-3">
                  <Settings className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white mb-1">Policy Controls</h5>
                    <p className="text-gray-400 text-[10px] leading-normal">
                      Configure guardrails to detect prompt injections, semantic drift, and enforce compliance guidelines.
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 border border-gray-800 rounded-xl p-4 flex gap-3">
                  <Play className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white mb-1">Human Oversight</h5>
                    <p className="text-gray-400 text-[10px] leading-normal">
                      Automatically route blocked transactions to compliance managers for operational manual overrides.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-slide-in">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                  Step 2: Connect Sentraa SDK
                </h4>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 bg-black/40 hover:bg-black/60 border border-gray-800 rounded-lg text-[10px] font-bold text-gray-300 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Snippet
                </button>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Integrate our lightweight SDK to verify AI assistant prompts and action scopes before they hit your execution endpoints.
              </p>
              
              <div className="bg-[#0b0f19] border border-gray-800/80 rounded-xl p-4 font-mono text-[10px] text-gray-400 overflow-x-auto max-h-[180px] scrollbar-thin">
                <pre>{`import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({
  apiKey: process.env.SENTRA_API_KEY || 'sk-sentra-...'
});

// Intercept action before execution
const decision = await sentra.checkAction({
  agentId: 'billing-assistant',
  action: 'database.write',
  metadata: {
    prompt: 'Delete user account user_94819'
  }
});

if (decision.status === 'BLOCK') {
  console.log('Action blocked by governance:', decision.reason);
} else {
  // Execute action safely
}`}</pre>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-slide-in">
              <h4 className="text-base font-black text-white uppercase tracking-tight">Step 3: Define Policies & Guardrails</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Rules govern what autonomous actions require verification. When a policy triggers a violation, Sentraa intercepts the token stream or function calls automatically.
              </p>
              
              <div className="bg-black/20 border border-gray-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Create a Policy</h5>
                    <p className="text-gray-400 text-[10px]">Navigate to the Policies tab and select a baseline (GDPR, HIPAA, or Custom).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Select Violations Severity</h5>
                    <p className="text-gray-400 text-[10px]">Define if violations should generate warning events or hard-block the agent.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Assign Reviewers</h5>
                    <p className="text-gray-400 text-[10px]">Choose administrators who receive Slack alerts when manual overrides are requested.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center py-6 animate-slide-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CheckCircle2 className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">Organization Onboarded!</h4>
                <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto">
                  Your workspace is ready. You can find your API key under Settings {"->"} General to begin securing your AI pipelines.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-800 p-5 bg-[#0f172a]/30 flex items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                onClick={() => setStep(s)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setStep(s))}
                role="button"
                tabIndex={0}
                aria-label={`Go to step ${s}`}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  s === step ? 'w-6 bg-indigo-500' : 'w-2 bg-gray-800 hover:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 hover:scale-105"
            >
              {step === 4 ? 'Get Started' : 'Continue'} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
