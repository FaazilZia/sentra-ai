import React from 'react';
import { Bot, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    <div className="glass-card rounded-[2rem] p-6 h-full">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
        <Bot className="w-4 h-4 text-indigo-400" />
        Agent Risk Profiles
      </h3>
      
      <div className="space-y-4">
        {agents.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No agent profiles detected yet.</p>
        ) : (
          agents.map((agent) => (
            <div 
              key={agent.id}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">{agent.name}</span>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                  agent.riskLevel === 'high' ? "bg-rose-500/10 text-rose-500" :
                  agent.riskLevel === 'medium' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {agent.riskLevel} Risk
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Efficiency</p>
                  <p className="text-sm font-black text-white">{Math.round((1 - agent.blockedActions/agent.totalActions) * 100)}%</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Blocks</p>
                  <p className="text-sm font-black text-rose-400">{agent.blockedActions}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
