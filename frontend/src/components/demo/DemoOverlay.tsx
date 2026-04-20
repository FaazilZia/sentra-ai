import { useEffect } from 'react';
import { ChevronRight, ChevronLeft, Play, Pause, X, Zap } from 'lucide-react';

interface DemoStep {
  title: string;
  description: string;
  targetId?: string;
}

const STEPS: DemoStep[] = [
  { title: "Audit & Insights", description: "The system scans your AI features. Here, HIPAA compliance is low (82%) due to missing BAA and encryption." },
  { title: "Runtime Guardrails", description: "Watch what happens when a user asks for sensitive data. The system intercepts and BLOCKS the request in real-time." },
  { title: "Override & Governance", description: "Authorized users can request an override. Here, an admin has reviewed and APPROVED a legitimate access request." },
  { title: "Automated Remediation", description: "Let's fix the underlying compliance gaps. We'll upload the BAA and encryption proof to satisfy the auditors." },
  { title: "AI Re-Evaluation", description: "Triggering a deep re-check. The LLM verifies our new evidence, boosting HIPAA readiness to 96%." },
  { title: "Continuous Control", description: "Our metrics dashboard now shows real-time enforcement stats. Compliance is now an active, automated shield." }
];

interface DemoOverlayProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: (val: boolean) => void;
}

export function DemoOverlay({ step, onNext, onPrev, onClose, isAutoPlaying, onToggleAutoPlay }: DemoOverlayProps) {
  const currentStep = STEPS[step];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlaying && step < STEPS.length - 1) {
      timer = setTimeout(() => {
        onNext();
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [step, isAutoPlaying, onNext]);

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
           <div 
             className="h-full bg-emerald-500 transition-all duration-500" 
             style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} 
           />
        </div>
        
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                 <Zap className="h-3 w-3 text-emerald-400 fill-current" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Demo Sequence</h4>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => onToggleAutoPlay(!isAutoPlaying)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                  isAutoPlaying ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/10 text-slate-400'
                }`}
              >
                {isAutoPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                {isAutoPlaying ? 'Auto-Playing' : 'Paused'}
              </button>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-all">
                 <X className="h-4 w-4" />
              </button>
           </div>
        </div>

        <div className="space-y-2">
           <h3 className="text-xl font-black text-white uppercase tracking-tight">{currentStep.title}</h3>
           <p className="text-sm text-slate-400 leading-relaxed font-medium">{currentStep.description}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
           <button 
             onClick={onPrev}
             disabled={step === 0}
             className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest disabled:opacity-0 transition-all hover:text-white"
           >
              <ChevronLeft className="h-4 w-4" /> Previous
           </button>
           <button 
             onClick={onNext}
             className="px-8 py-3 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
           >
              {step === STEPS.length - 1 ? 'Finish Demo' : 'Next Step'} <ChevronRight className="h-4 w-4" />
           </button>
        </div>
      </div>
    </div>
  );
}
