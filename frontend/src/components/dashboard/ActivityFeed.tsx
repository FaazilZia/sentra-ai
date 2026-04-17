import React, { useState } from 'react';
import { Bot, Search, Activity, CheckCircle2, ShieldAlert, Lock, RefreshCw, Download, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { RiskIndicator } from './RiskIndicator';
import { ActionTimeline, TimelineStep } from './ActionTimeline';

export interface ActivityEvent {
  id: string;
  agent: string;
  action: string;
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  timestamp: string;
  reason?: string;
  impact?: string;
  explanation?: string;
  confidence?: number;
  timeline?: TimelineStep[];
  compliance?: string[];
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  onReplay?: (id: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, onReplay, onExport }) => {
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === 'all' || event.status === filter;
    const matchesSearch = event.agent.toLowerCase().includes(search.toLowerCase()) ||
      event.action.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Bot className="w-4 h-4 text-slate-600" />
            AI Activity Stream
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Live Feed</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 w-40 sm:w-48 transition-all font-bold"
            />
          </div>

          <div className="flex gap-1">
            <button 
              onClick={() => onExport?.('csv')}
              className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
              title="Export as CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-white">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter('allowed')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'allowed' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ALLOWED
              </button>
              <button
                onClick={() => setFilter('blocked')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'blocked' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                BLOCKED
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[700px]">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Activity className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs font-medium">No activity matching your filter.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`group flex flex-col p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-4 duration-500 ${
                expandedId === event.id 
                  ? 'border-indigo-200 bg-indigo-50/10 shadow-lg shadow-indigo-100/20' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${event.status === 'allowed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {event.status === 'allowed' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div className="cursor-pointer" onClick={() => toggleExpand(event.id)}>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      {event.agent}
                      {expandedId === event.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{event.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{event.timestamp}</p>
                    <RiskIndicator level={event.risk} />
                  </div>
                  <button 
                    onClick={() => onReplay?.(event.id)}
                    className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
                    title="Simulation Replay"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === event.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {/* Decision Explanation Card */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Explanation Engine</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Confidence</span>
                        <span className="text-xs font-black text-indigo-600">{(event.confidence || 0.95) * 100}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed relative z-10">
                      {event.explanation || `The governance engine analyzed the agent behavior and determined that the action "${event.action}" aligns with the established security boundaries for ${event.agent}.`}
                    </p>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-60" />
                  </div>

                  {/* Impact & Compliance Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Impact</span>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                          "{event.impact || 'Ensures least privilege execution for automated agent workflows.'}"
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Compliance Mapping</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(event.compliance || ['Internal Policy']).map(tag => (
                          <span key={tag} className="text-[9px] font-bold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                            <Lock className="w-2.5 h-2.5 text-indigo-500" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  {event.timeline && (
                    <ActionTimeline steps={event.timeline} timestamp={event.timestamp} />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
        Sentra AI Control Layer v2.0 • Real-time Decision Monitoring
      </div>
    </div>
  );
};
