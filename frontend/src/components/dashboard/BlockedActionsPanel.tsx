import { ShieldAlert, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { RiskIndicator } from './RiskIndicator';

interface BlockedAction {
  id: string;
  agent: string;
  action: string;
  reason?: string;
  impact?: string;
  compliance?: string[];
  timestamp: string;
  risk: 'low' | 'medium' | 'high';
}

interface BlockedActionsPanelProps {
  actions: BlockedAction[];
}

export const BlockedActionsPanel = ({ actions }: BlockedActionsPanelProps) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-red-900 uppercase tracking-tight">Critical Interceptions</h3>
        </div>
        <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-tighter">Real-time</span>
      </div>

      <div className="divide-y divide-slate-100">
        {actions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-medium text-slate-500">No critical interceptions in this session.</p>
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">
                    {action.agent.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{action.agent}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{action.action}</p>
                  </div>
                </div>
                <RiskIndicator level={action.risk} />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-xl border border-red-100/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-red-900 leading-snug">{action.reason}</p>
                      {action.impact && (
                        <p className="text-[10px] text-red-700/70 mt-1 italic leading-relaxed">
                          ⚖️ {action.impact}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {action.compliance && action.compliance.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {action.compliance.map(tag => (
                      <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 rounded text-[9px] font-bold text-white uppercase tracking-widest">
                        <Lock className="w-2.5 h-2.5 text-indigo-400" />
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {actions.length > 0 && (
        <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
          <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">
            Generate Compliance Report →
          </button>
        </div>
      )}
    </div>
  );
};
