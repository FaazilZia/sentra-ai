import React from 'react';
import { Shield, Zap, DollarSign, Lock } from 'lucide-react';

interface GlobalControlPanelProps {
  scanningMode: string;
  budgetStatus: 'within_limits' | 'near_limit' | 'paused';
  systemStatus: 'active' | 'throttled' | 'paused';
  authority: 'full' | 'limited';
}

export const GlobalControlPanel: React.FC<GlobalControlPanelProps> = ({
  scanningMode,
  budgetStatus,
  systemStatus,
  authority
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between px-4 md:px-6 py-2 bg-[#0a0a0b] border-b border-white/5 backdrop-blur-md gap-y-2">
      <div className="flex items-center space-x-4 md:space-x-6">
        {/* Scanning Mode */}
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/50">Scanning:</span>
          <span className="text-[11px] font-medium text-white">{scanningMode === 'auto' ? 'Autonomous Policy' : 'Manual'}</span>
        </div>

        {/* Budget Status */}
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/50">Budget:</span>
          <span className={`text-[11px] font-medium ${
            budgetStatus === 'paused' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {budgetStatus === 'paused' ? 'Paused (Limit Reached)' : 'Within Safety Limits'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* System Control */}
        <div className="flex items-center space-x-2">
          <Shield className={`w-4 h-4 ${systemStatus === 'active' ? 'text-blue-400' : 'text-amber-400'}`} />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/50">System:</span>
          <span className="text-[11px] font-medium text-white">{systemStatus.toUpperCase()}</span>
        </div>

        {/* Override Authority */}
        <div className="flex items-center space-x-2 pl-4 border-l border-white/10">
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] uppercase tracking-wider text-white/50">Authority:</span>
          <span className="text-[11px] font-medium text-amber-500">
            {authority === 'full' ? 'Admin Override Enabled' : 'Limited (Read-Only)'}
          </span>
        </div>
      </div>
    </div>
  );
};
