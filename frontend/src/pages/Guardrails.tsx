import { GuardrailMonitor } from '../components/guardrails/GuardrailMonitor';

export default function GuardrailsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-24 pb-32 px-8 pt-16">
      {/* Focused Header */}
      <div className="space-y-4">
        <h1 className="text-sm font-black tracking-widest text-slate-400 uppercase">Enforcement Layer</h1>
        <p className="text-5xl font-black text-white tracking-tighter max-w-2xl leading-tight">
          Real-time AI Guardrails.
        </p>
        <p className="text-slate-400 font-medium max-w-xl text-lg">
          Intercept and neutralize unsafe AI actions before they execute.
        </p>
      </div>

      <div className="pt-12 border-t border-white/5">
        <GuardrailMonitor />
      </div>
    </div>
  );
}
