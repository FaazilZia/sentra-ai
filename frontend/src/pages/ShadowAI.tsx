import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Users, 
  History,
  MoreVertical,
  Ghost
} from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

export default function ShadowAI() {
  const addToast = useStore((state) => state.addToast);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShadowData() {
      try {
        const token = localStorage.getItem('sentra_access_token') || localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const base = import.meta.env.VITE_API_URL || 'https://sentra-backend-node.onrender.com/api/v1';

        // Fetch recent interception logs (last 7 days)
        const logsRes = await fetch(`${base}/audit/logs?limit=100`, { headers });
        const logsJson = await logsRes.json();
        const rawLogs: any[] = logsJson?.data?.logs || logsJson?.logs || [];

        // Build timeline: group blocked actions by day
        const byDay: Record<string, { name: string; date: string; blocked: number; total: number; detections: number }> = {};
        rawLogs.forEach((log: any) => {
          const day = new Date(log.timestamp || log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!byDay[day]) byDay[day] = { name: day, date: day, blocked: 0, total: 0, detections: 0 };
          byDay[day].total++;
          byDay[day].detections++;
          if (log.status === 'blocked' || log.decision === 'BLOCK') byDay[day].blocked++;
        });
        setTimelineData(Object.values(byDay).slice(-7));

        // Build dept data: group by agent name (top 5 agents by action count)
        const byAgent: Record<string, number> = {};
        rawLogs.forEach((log: any) => {
          const agent = log.agent || log.user_id || 'Unknown';
          byAgent[agent] = (byAgent[agent] || 0) + 1;
        });
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#eab308'];
        const sorted = Object.entries(byAgent)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count], index) => ({
            name,
            count,
            value: count,
            color: colors[index % colors.length]
          }));
        setDeptData(sorted);

        // Build incidents: blocked actions as incident list
        const blocked = rawLogs
          .filter((log: any) => log.status === 'blocked' || log.decision === 'BLOCK')
          .slice(0, 10)
          .map((log: any) => ({
            id: log.id || Math.random().toString(),
            user: log.user_id || log.agent || 'Unknown User',
            dept: log.department || 'Engineering',
            tool: log.tool || log.model || log.service || 'Unknown Tool',
            time: new Date(log.timestamp || log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: log.severity || 'High',
            action: log.decision || log.status || 'BLOCK',
            reason: log.reason || 'Policy violation',
          }));
        setIncidents(blocked);
      } catch (err) {
        console.error('[ShadowAI] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadShadowData();
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {loading && (
        <div className="text-center py-12 text-[var(--text-secondary)] text-sm">Loading Shadow AI data...</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Shadow AI Discovery</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Detecting & Managing Unauthorized AI Adoption
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
          <span className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Active Surveillance On</span>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Unauthorized Tools" 
          value="0" 
          icon="shadow" 
          status="danger" 
        />
        <KPICard 
          label="Unique Users" 
          value="0" 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Data Leakage Risk" 
          value="N/A" 
          icon="risks" 
          status="danger" 
        />
        <KPICard 
          label="Security Interceptions" 
          value="0" 
          icon="compliance" 
          status="success" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-8 card-base p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--royal-indigo)]" />
              <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">Detection Timeline</h3>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="detections" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDetections)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="lg:col-span-4 card-base p-6">
          <div className="flex items-center gap-2 mb-8">
            <Users className="h-4 w-4 text-[var(--royal-indigo)]" />
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">By Department</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', fontSize: '10px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {(deptData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(deptData || []).slice(0, 3).map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{d.name}</span>
                <span className="text-[10px] font-black text-[var(--text-primary)]">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ghost className="h-4 w-4 text-rose-500" />
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight">Unauthorized Usage Incidents</h3>
          </div>
          <button 
            onClick={() => addToast({ message: 'Fetching deep surveillance logs...', type: 'info' })}
            className="btn-secondary !text-[10px] !py-1.5 uppercase tracking-widest font-black"
          >
            Full Audit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Tool Detected</th>
                <th className="px-6 py-4">Dectected Time</th>
                <th className="px-6 py-4">Risk Severity</th>
                <th className="px-6 py-4">Enforcement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {incidents.length > 0 ? incidents.map((incident) => (
                <tr key={incident.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black uppercase">
                        {incident.user ? incident.user.split(' ').filter(Boolean).map((n: string) => n[0] || '').join('').slice(0, 2) : 'U'}
                      </div>
                      <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{incident.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{incident.dept}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--lavender)] font-bold">{incident.tool}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{incident.time}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      incident.severity === 'Critical' ? "bg-rose-500 text-white" :
                      incident.severity === 'High' ? "bg-rose-500/10 text-rose-500" :
                      incident.severity === 'Medium' ? "bg-amber-500/10 text-amber-500" :
                      "bg-slate-500/10 text-slate-400"
                    )}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-[var(--text-primary)] bg-black/5 px-2 py-1 rounded uppercase tracking-tighter">
                      {incident.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => addToast({ message: `Actions for incident involving ${incident.user}`, type: 'info' })}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-white/5 transition-all"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Ghost className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No shadow AI incidents detected</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
