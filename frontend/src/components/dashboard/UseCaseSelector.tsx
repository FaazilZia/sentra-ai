import { Briefcase, HeartPulse, Rocket, ChevronDown } from 'lucide-react';

interface UseCaseSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const UseCaseSelector = ({ currentMode, onModeChange }: UseCaseSelectorProps) => {
  const modes = [
    { id: 'finance', label: 'Finance Mode', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'healthcare', label: 'Healthcare Mode', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'startup', label: 'Startup Mode', icon: Rocket, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const activeMode = modes.find(m => m.id === currentMode) || modes[0];

  return (
    <div className="relative group">
      <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentMode === mode.id
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <mode.icon className={`w-3.5 h-3.5 ${currentMode === mode.id ? mode.color : 'text-slate-400'}`} />
            {mode.label}
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 border-dashed">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${activeMode.color.replace('text', 'bg')}`} />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Governance Profile</h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {currentMode === 'finance' && "Enforcing policies for bank secrecy, AML compliance, and SOC2 financial data protection."}
          {currentMode === 'healthcare' && "Enforcing HIPAA Privacy Rule, HITECH Act, and patient data confidentiality protocols."}
          {currentMode === 'startup' && "Enforcing high-velocity growth security: protecting IP, git access, and early-stage scaling risks."}
        </p>
      </div>
    </div>
  );
};
