import { useEffect, useState } from 'react';
import { Bot, ShieldCheck, Zap, Activity, Filter, Plus, Search, MoreHorizontal, Database, Globe, Mail } from 'lucide-react';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { fetchAIAgents, AIAgent } from '../lib/api';
import { useAuth } from '../lib/auth';

const permissionIcons: Record<string, any> = {
  email: Mail,
  api: Zap,
  db: Database,
  web: Globe,
};

export default function Inventory() {
  const {} = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await fetchAIAgents();
        setAgents(data);
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-12 px-6 pt-6">
      {/* Premium Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <span className="opacity-50">Control Layer</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-cyan-400">AI Inventory</span>
          </nav>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Bot className="h-9 w-9 text-cyan-400" />
            AI Agent Registry
          </h1>
          <p className="mt-2 text-slate-400 font-medium max-w-xl">
            Complete inventory of authorized AI systems, their permissions, and operational status within your workspace.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:bg-cyan-400 transition-all">
          <Plus className="h-4 w-4" />
          Register New Agent
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Agents', value: agents.length, icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Active Sessions', value: agents.filter(a => a.status === 'active').length, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Governed Permissions', value: agents.reduce((acc, a) => acc + (a.permissions?.length || 0), 0), icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-[2rem] p-6 flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
              <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <SurfaceCard 
        title="Agent Registry"
        className="border-white/5 bg-slate-900/40 backdrop-blur-md"
        contentClassName="p-0"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search agents, models, or permissions..." 
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <Filter className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-4">Agent Identification</th>
                <th className="px-8 py-4">Model Engine</th>
                <th className="px-8 py-4">Scope & Permissions</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Synchronizing Registry...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <Bot className="h-12 w-12 text-slate-400" />
                      <p className="text-sm font-bold text-slate-400">No agents found</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAgents.map(agent => (
                <tr key={agent.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                        <Bot className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{agent.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase">{agent.id.split('-')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span className="text-xs font-bold text-slate-300 font-mono">{agent.model}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      {agent.permissions?.map((perm: string) => {
                        const Icon = permissionIcons[perm.toLowerCase()] || ShieldCheck;
                        return (
                          <div key={perm} className="flex items-center gap-1.5 rounded-lg bg-slate-950/50 border border-white/5 px-2 py-1">
                            <Icon className="h-3 w-3 text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{perm}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <StatusBadge 
                      label={agent.status.toUpperCase()} 
                      tone={agent.status === 'active' ? 'success' : 'default'} 
                    />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors">
                      Manage Scope
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
