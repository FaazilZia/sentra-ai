import React from 'react';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SystemModeIndicatorProps {
  mode: 'autonomous' | 'restricted' | 'high_alert';
}

export const SystemModeIndicator: React.FC<SystemModeIndicatorProps> = ({ mode }) => {
  const configs = {
    autonomous: {
      label: 'Autonomous',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      desc: 'Normal operation under active policy'
    },
    restricted: {
      label: 'Restricted',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      desc: 'Budget or policy limits active'
    },
    high_alert: {
      label: 'High Alert',
      icon: Activity,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
      border: 'border-rose-400/20',
      desc: 'Active anomaly or risk spike detected'
    }
  };

  const current = configs[mode];
  const Icon = current.icon;

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg border ${current.bg} ${current.border}`}>
      <div className={`p-1.5 rounded-full bg-black/40`}>
        <Icon className={`w-4 h-4 ${current.color}`} />
      </div>
      <div>
        <div className={`text-xs font-bold uppercase tracking-tighter ${current.color}`}>
          {current.label} Mode
        </div>
        <div className="text-[10px] text-white/50 font-medium leading-none mt-0.5">
          {current.desc}
        </div>
      </div>
    </div>
  );
};
