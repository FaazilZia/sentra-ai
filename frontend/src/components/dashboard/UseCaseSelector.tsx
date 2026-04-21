import React from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, HeartPulse, Rocket } from 'lucide-react';

interface UseCaseSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const UseCaseSelector: React.FC<UseCaseSelectorProps> = ({ currentMode, onModeChange }) => {
  const options = [
    { id: 'finance', label: 'Fintech', icon: Briefcase },
    { id: 'healthcare', label: 'Health', icon: HeartPulse },
    { id: 'startup', label: 'SaaS AI', icon: Rocket },
  ];

  return (
    <div className="flex p-1 bg-slate-900/60 rounded-xl border border-white/5 backdrop-blur-md">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onModeChange(opt.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
            currentMode === opt.id 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <opt.icon className="w-3.5 h-3.5" />
          {opt.label}
        </button>
      ))}
    </div>
  );
};
