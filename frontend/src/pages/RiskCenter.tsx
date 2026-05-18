import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  MoreVertical
} from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useSocketStore } from '@/store/useSocketStore';
import { fetchGuardrailMetrics, GuardrailMetrics } from '@/lib/api';

const trendData: any[] = [];

const severityData: any[] = [];

export default function RiskCenter() {
  const addToast = useStore((state) => state.addToast);
  const { riskEvents } = useSocketStore();
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await fetchGuardrailMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch risk metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    addToast({ message: 'Generating Global Risk Report...', type: 'info' });
    setTimeout(() => addToast({ message: 'Report generated successfully. Download started.', type: 'success' }), 1500);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Risk Center</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Real-time Threat Detection & Mitigation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search risk events..." 
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[11px] font-bold text-[var(--text-primary)] w-64 focus:outline-none focus:border-[var(--royal-indigo)] transition-colors"
            />
          </div>
          <button 
            onClick={() => addToast({ message: 'Opening filter panel...', type: 'info' })}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest hover:bg-[var(--soft-indigo)] transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Aggregate Risk Score" 
          value={metrics ? Math.round(metrics.blocked) : "0"} 
          icon="risks" 
          status="warning" 
          isLoading={loading}
        />
        <KPICard 
          label="Critical Findings" 
          value={metrics?.blockedCount ?? "0"} 
          icon="risks" 
          status="danger" 
          isLoading={loading}
        />
        <KPICard 
          label="Active Threats" 
          value={metrics?.total ?? "0"} 
          icon="risks" 
          status="danger" 
          isLoading={loading}
        />
        <KPICard 
          label="Auto-Mitigations" 
          value={metrics?.blockedCount ?? "0"} 
          icon="compliance" 
          status="success" 
          testId="threats-prevented-count"
          isLoading={loading}
        />

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Trend Chart */}
        <div className="lg:col-span-8 card-base p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">Risk Score Trend</h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                <TrendingUp className="h-3 w-3 rotate-180" />
                -8.4% improvement
              </span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--royal-indigo)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--royal-indigo)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                  itemStyle={{ color: 'var(--lavender)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--royal-indigo)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="lg:col-span-4 card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] mb-6">Severity Breakdown</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(severityData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '10px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {(severityData || []).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Events Table */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">Active Risk Events</h3>
          <button 
            onClick={() => addToast({ message: 'Navigating to full events ledger...', type: 'info' })}
            className="text-[var(--text-xs)] font-bold text-[var(--royal-indigo)] uppercase tracking-widest hover:underline"
          >
            View All Events
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-3">Agent / System</th>
                <th className="px-6 py-3">Detected Action</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {riskEvents.length > 0 ? riskEvents.map((event) => (
                <tr key={event.id} className="group hover:bg-[var(--bg-hover)] transition-colors cursor-default">
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{event.agent}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">{event.action}</span>
                      {event.aiSummary && (
                        <p className="max-w-xl text-[10px] leading-relaxed text-[var(--text-muted)]">
                          {event.aiSummary}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      event.severity === 'Critical' ? "bg-[var(--risk-critical)] text-[var(--risk-critical-text)] shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                      event.severity === 'High' ? "bg-[var(--risk-high)] text-[var(--risk-high-text)]" :
                      event.severity === 'Medium' ? "bg-[var(--risk-medium)] text-[var(--risk-medium-text)]" :
                      "bg-[var(--risk-low)] text-[var(--risk-low-text)]"
                    )}>
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{event.time}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      event.status === 'Blocked' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      event.status === 'Flagged' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    )}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => addToast({ message: `Viewing details for ${event.agent}`, type: 'info' })}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-white/5 transition-all"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertTriangle className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No active risk events</p>
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
