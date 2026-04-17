import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { RiskIndicator } from './RiskIndicator';

interface BlockedAction {
  id: string;
  agent: string;
  action: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface BlockedActionsPanelProps {
  actions: BlockedAction[];
}

export const BlockedActionsPanel: React.FC<BlockedActionsPanelProps> = ({ actions }) => {
  return (
    <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-red-600" />
        <h2 className="text-sm font-bold text-red-900 uppercase tracking-tight">Critical Interceptions</h2>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <p className="text-xs text-red-600/70 italic">No critical interceptions in this window.</p>
        ) : (
          actions.map((action) => (
            <div 
              key={action.id} 
              className="bg-white border border-red-100 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-500"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{action.agent}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{action.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Attempted <span className="font-mono font-bold text-red-600">{action.action}</span>
                  </p>
                  <p className="text-[10px] text-red-500 font-medium mt-1">
                    Reason: {action.reason}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <RiskIndicator level={action.risk} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
