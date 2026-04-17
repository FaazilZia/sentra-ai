import React from 'react';
import { Bot, ShieldAlert, BarChart3, MoreVertical } from 'lucide-react';

interface AgentStats {
  id: string;
  name: string;
  totalActions: number;
  blockedActions: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AgentProfileListProps {
  agents: AgentStats[];
}

export const AgentProfileList: React.FC<AgentProfileListProps> = ({ agents }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-indigo-600" />
          AI Agent Risk Profiles
        </h3>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <BarChart3 className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {agents.map((agent) => (
          <div key={agent.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {agent.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                    {agent.totalActions} total actions tracked
                  </p>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                agent.riskLevel === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                agent.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {agent.riskLevel} Risk
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Interceptions</span>
                </div>
                <p className="text-lg font-black text-slate-900 leading-none">{agent.blockedActions}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Success Rate</span>
                </div>
                <p className="text-lg font-black text-slate-900 leading-none">
                  {Math.round(((agent.totalActions - agent.blockedActions) / agent.totalActions) * 100)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
          View All Active Agents
        </button>
      </div>
    </div>
  );
};
