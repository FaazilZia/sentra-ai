import { Shield, Activity, Lock, AlertTriangle } from 'lucide-react';
import { GuardrailMonitor } from '../components/guardrails/GuardrailMonitor';
import { Reveal } from '../components/ui/Reveal';

export default function GuardrailsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-12 space-y-12">
      <Reveal>
        <div className="space-y-2">
           <nav className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
             Security Enforcement <span className="mx-2 text-slate-700">/</span> Real-time Guardrails
           </nav>
           <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
             <Lock className="h-10 w-10 text-white" />
             AI Guardrails & Enforcement
           </h1>
           <p className="text-slate-400 font-medium max-w-2xl text-lg">
             Runtime protection layer for AI interactions. Automatically detect and block PII, PHI, and prompt injections before they reach the user or model.
           </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs font-black text-white uppercase">Pre-AI Filter</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Scans user prompts for sensitive intent and malicious injections before model execution.</p>
         </div>
         <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
               <Activity className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-xs font-black text-white uppercase">Post-AI Redaction</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Masks PII/PHI in model outputs using real-time regex and pattern matching engines.</p>
         </div>
         <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
               <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-xs font-black text-white uppercase">Policy Enforcement</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Automatically blocks requests that violate corporate data protection and privacy policies.</p>
         </div>
      </div>

      <GuardrailMonitor />
    </div>
  );
}
