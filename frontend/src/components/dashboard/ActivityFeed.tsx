import React, { useState } from 'react';
import { Search, Filter, CheckCircle2, XCircle, Clock, Bot } from 'lucide-react';
import { RiskIndicator } from './RiskIndicator';

export interface ActivityEvent {
  id: string;
  agent: string;
  action: string;
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === 'all' || event.status === filter;
    const matchesSearch = event.agent.toLowerCase().includes(search.toLowerCase()) || 
                          event.action.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Bot className="w-4 h-4 text-slate-600" />
            AI Activity Stream
          </h2>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search agent..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-100 w-40 sm:w-60 transition-all"
              />
            </div>
            
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-white">
              <button 
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ALL
              </button>
              <button 
                onClick={() => setFilter('allowed')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'allowed' ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ALLOWED
              </button>
              <button 
                onClick={() => setFilter('blocked')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'blocked' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                BLOCKED
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900">No activity matches</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-500"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${event.status === 'allowed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {event.status === 'allowed' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{event.agent}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{event.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Executed <span className="font-mono font-bold text-slate-800">{event.action}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <RiskIndicator level={event.risk} />
                <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                  event.status === 'allowed' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                }`}>
                  {event.status}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-center text-slate-400 font-medium italic">
        Monitoring AI agent actions in real-time...
      </div>
    </div>
  );
};
