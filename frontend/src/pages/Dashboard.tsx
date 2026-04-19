import { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Play, StopCircle, Zap } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import {
  AIActivityLog,
  fetchAIActivityLogs,
  apiBaseUrl
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ActivityFeed, ActivityEvent } from '../components/dashboard/ActivityFeed';
import { generateEvent, ScenarioMode, SimulatedEvent } from '../lib/demo/simulation';
import { INITIAL_MOCK_DATA } from '../lib/demo/mockData';

export default function DashboardPage() {
  const { user } = useAuth();
  const [aiLogs, setAiLogs] = useState<AIActivityLog[]>([]);
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'GDPR' | 'HIPAA' | 'DPDP'>('ALL');
  
  // Demo Mode State
  const [demoMode, setDemoMode] = useState(false);
  const [scenario, setScenario] = useState<ScenarioMode>('GENERAL');
  const [simulatedLogs, setSimulatedLogs] = useState<SimulatedEvent[]>(INITIAL_MOCK_DATA);
  const demoInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (demoMode) {
      demoInterval.current = setInterval(() => {
        const newEvent = generateEvent(scenario);
        setSimulatedLogs(prev => [newEvent, ...prev].slice(0, 50));
      }, 4000);
    } else {
      if (demoInterval.current) clearInterval(demoInterval.current);
    }
    return () => { if (demoInterval.current) clearInterval(demoInterval.current); };
  }, [demoMode, scenario]);

  useEffect(() => {
    if (!user?.companyId || demoMode) return;
    const socketUrl = apiBaseUrl.replace('/api/v1', '').replace('/api', '');
    const socket: Socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('join_company', user.companyId);
    });

    socket.on('activity_log', (newLog: AIActivityLog) => {
      setAiLogs(prev => [newLog, ...prev].slice(0, 100));
    });

    return () => { socket.disconnect(); };
  }, [user?.companyId, demoMode]);

  const loadData = async () => {
    try {
      const [aiLogsRes] = await Promise.all([
        fetchAIActivityLogs()
      ]);
      setAiLogs(aiLogsRes || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeLogs = useMemo(() => {
    const rawLogs: (AIActivityLog | SimulatedEvent)[] = demoMode ? simulatedLogs : aiLogs;
    
    // Normalize both types to ActivityEvent for consistent UI handling
    const normalized: ActivityEvent[] = rawLogs.map(log => {
      if ('agent_id' in log) {
        return {
          ...log,
          agent: log.agent_id,
          risk: log.risk_score,
          timestamp: new Date(log.created_at).toLocaleTimeString(),
          isPendingApproval: (log as any).is_pending_approval,
          overriddenBy: (log as any).overriddenBy,
          overrideComment: (log as any).overrideComment
        } as ActivityEvent;
      }
      return log as ActivityEvent;
    });

    if (complianceFilter === 'ALL') return normalized;
    return normalized.filter(log => log.compliance?.includes(complianceFilter));
  }, [aiLogs, simulatedLogs, demoMode, complianceFilter]);

  const stats = useMemo(() => {
    const total = activeLogs.length;
    const blocked = activeLogs.filter(l => l.status === 'blocked').length;
    const violations = activeLogs.filter(l => l.risk === 'high' || l.status === 'blocked').length;
    const calculatedRisk = Math.min(Math.round((violations / (total || 1)) * 100), 100);
    const complianceRate = 100 - calculatedRisk;

    return { total, blocked, violations, complianceRate, riskScore: calculatedRisk };
  }, [activeLogs]);

  const activityEvents = useMemo<ActivityEvent[]>(() => {
    return activeLogs.slice(0, 15);
  }, [activeLogs]);

  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLastUpdated(0);
  }, [activeLogs]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-16 px-6 pt-8">
      {/* Top Bar: Title & Demo Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            Sentra <span className="text-slate-500">Compliance Control</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Minimal AI Governance • Operational Transparency
            </p>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
              Last updated: {lastUpdated}s ago
            </span>
            {demoMode && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase animate-pulse">
                <Zap className="h-2.5 w-2.5" /> Simulation Active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Demo Controls */}
          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-1 rounded-xl">
             <button
               onClick={() => setDemoMode(!demoMode)}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 demoMode ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-800 text-slate-400 hover:text-white'
               }`}
             >
               {demoMode ? <StopCircle className="h-3 w-3" /> : <Play className="h-3 w-3" />}
               Demo Mode: {demoMode ? 'ON' : 'OFF'}
             </button>
             
             {demoMode && (
               <select 
                 value={scenario}
                 onChange={(e) => setScenario(e.target.value as ScenarioMode)}
                 className="bg-transparent text-[10px] font-black text-white uppercase tracking-widest border-none focus:ring-0 cursor-pointer pr-8"
               >
                 <option value="GENERAL">General SaaS</option>
                 <option value="FINANCE">Finance Center</option>
                 <option value="HEALTHCARE">Healthcare Hub</option>
               </select>
             )}
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-1 rounded-xl">
            <div className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Filter className="h-3 w-3" /> Compliance Filter
            </div>
            <div className="flex gap-1">
              {(['ALL', 'GDPR', 'HIPAA', 'DPDP'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setComplianceFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    complianceFilter === f ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Stats Section */}
      <DashboardHeader 
        total={stats.violations} 
        blocked={stats.blocked} 
        complianceScore={stats.complianceRate} 
        riskScore={stats.riskScore} 
      />

      {/* Main Feature: Activity Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h2 className="text-sm font-black text-white uppercase tracking-tight">
             {demoMode ? 'Simulated AI Activity' : 'Real-Time AI Activity'}
           </h2>
           <span className="text-[10px] font-bold text-slate-500 uppercase">
             {demoMode ? 'Live Feed Active' : 'Latest 15 Actions'}
           </span>
        </div>
        <ActivityFeed 
          events={activityEvents} 
          onReplay={() => {}} 
          onExport={() => {}} 
          minimal={true}
        />
      </div>

      {/* Readiness Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'GDPR Readiness', value: demoMode ? '96%' : '94%', trend: '+2%' },
           { label: 'HIPAA Alignment', value: demoMode ? '82%' : '88%', trend: '-5%' },
           { label: 'Audit Integrity', value: '100%', trend: 'Verified' }
         ].map(insight => (
           <div key={insight.label} className="p-6 rounded-[1.5rem] bg-slate-900/40 border border-white/5 flex flex-col justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{insight.label}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-3xl font-black text-white">{insight.value}</p>
                <span className={`text-[10px] font-black uppercase ${insight.trend.startsWith('+') ? 'text-emerald-400' : insight.trend === 'Verified' ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {insight.trend}
                </span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
