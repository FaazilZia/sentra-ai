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
  const [unauthorizedToolsCount, setUnauthorizedToolsCount] = useState(0);
  const [uniqueUsersCount, setUniqueUsersCount] = useState(0);
  const [securityInterceptionsCount, setSecurityInterceptionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShadowData() {
      try {
        const token = localStorage.getItem('sentra_access_token') || localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1';

        const res = await fetch(`${base}/shadow-ai/detections`, { headers });
        const json = await res.json();
        
        if (json.success) {
          setTimelineData(json.timelineData || []);
          setDeptData(json.deptData || []);
          setIncidents(json.incidents || []);
          setUnauthorizedToolsCount(json.unauthorizedToolsCount || 0);
          setUniqueUsersCount(json.uniqueUsersCount || 0);
          setSecurityInterceptionsCount(json.securityInterceptionsCount || 0);
        } else {
          console.error('[ShadowAI] API responded with failure:', json.error);
          setTimelineData([]);
          setDeptData([]);
          setIncidents([]);
          setUnauthorizedToolsCount(0);
          setUniqueUsersCount(0);
          setSecurityInterceptionsCount(0);
        }
      } catch (err) {
        console.error('[ShadowAI] Failed to load data:', err);
        setTimelineData([]);
        setDeptData([]);
        setIncidents([]);
        setUnauthorizedToolsCount(0);
        setUniqueUsersCount(0);
        setSecurityInterceptionsCount(0);
      } finally {
        setLoading(false);
      }
    }
    loadShadowData();
  }, []);

  const getDataLeakageRisk = () => {
    const count = unauthorizedToolsCount || 0;
    if (count === 0) return 'NONE';
    if (count > 5) return 'CRITICAL';
    if (count > 2) return 'HIGH';
    return 'MEDIUM';
  };

  const getRiskStatus = () => {
    const risk = getDataLeakageRisk();
    if (risk === 'NONE') return 'success';
    if (risk === 'CRITICAL' || risk === 'HIGH') return 'danger';
    return 'warning';
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      {loading && (
        <div className="text-center py-12 text-[var(--text-secondary)] text-sm">Loading Shadow AI data...</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Shadow AI Discovery</h1>
          <p className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mt-1">
            Detecting & Managing Unauthorized AI Adoption
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
          <span className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-semibold text-rose-500 tracking-wider">Active surveillance on</span>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Unauthorized Tools" 
          value={String(unauthorizedToolsCount)} 
          icon="shadow" 
          status={unauthorizedToolsCount > 0 ? "danger" : "success"} 
        />
        <KPICard 
          label="Unique Users" 
          value={String(uniqueUsersCount)} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Data Leakage Risk" 
          value={getDataLeakageRisk()} 
          icon="risks" 
          status={getRiskStatus()} 
        />
        <KPICard 
          label="Security Interceptions" 
          value={String(securityInterceptionsCount)} 
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
              <h3 className="text-[var(--text-md)] font-semibold text-[var(--text-primary)] tracking-tight">Detection timeline</h3>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />

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
              <h3 className="text-[var(--text-md)] font-semibold text-[var(--text-primary)] tracking-tight">By department</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={80} tickLine={false} axisLine={false} />
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
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{d.name}</span>
                <span className="text-[10px] font-semibold text-[var(--text-primary)]">{d.value}%</span>
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
              <h3 className="text-[var(--text-md)] font-semibold text-[var(--text-primary)] tracking-tight">Unauthorized usage incidents</h3>
          </div>
          <button 
            onClick={() => addToast({ message: 'Fetching deep surveillance logs...', type: 'info' })}
            className="btn-secondary !text-[10px] !py-1.5 uppercase tracking-widest font-semibold"
          >
            Full Audit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-semibold text-[var(--text-secondary)] tracking-[0.1em]">
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
                      <div className="h-7 w-7 rounded-full bg-[var(--bg-page)] border border-[var(--border-default)] flex items-center justify-center text-[9px] font-semibold uppercase">
                        {incident.user ? incident.user.split(' ').filter(Boolean).map((n: string) => n[0] || '').join('').slice(0, 2) : 'U'}
                      </div>
                      <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{incident.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">{incident.dept}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--royal-indigo)] font-semibold">{incident.tool}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">{incident.time}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-tight",
                      incident.severity === 'Critical' ? "bg-rose-500 text-white" :
                      incident.severity === 'High' ? "bg-rose-500/10 text-rose-500" :
                      incident.severity === 'Medium' ? "bg-amber-500/10 text-amber-500" :
                      "bg-slate-500/10 text-slate-400"
                    )}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-semibold text-[var(--text-primary)] bg-[var(--bg-page)] px-2 py-1 rounded tracking-tight">
                      {incident.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => addToast({ message: `Actions for incident involving ${incident.user}`, type: 'info' })}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">None detected</p>
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
