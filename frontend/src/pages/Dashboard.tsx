import { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  ShieldAlert, 
  FileText, 
  Database, 
  Network,
  Lock,
  Eye,
  CheckCircle2,
  Zap,
  Filter,
  Check
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Expanded dataset to support model-specific analysis
const chartData = [
  { day: 'D1',  threats: 18,  mitigated: 10, gpt4: 12, claude: 4, llama: 2 },
  { day: 'D4',  threats: 55,  mitigated: 28, gpt4: 30, claude: 15, llama: 10 },
  { day: 'D7',  threats: 38,  mitigated: 22, gpt4: 20, claude: 10, llama: 8 },
  { day: 'D10', threats: 95,  mitigated: 60, gpt4: 50, claude: 25, llama: 20 },
  { day: 'D13', threats: 72,  mitigated: 55, gpt4: 40, claude: 20, llama: 12 },
  { day: 'D16', threats: 148, mitigated: 110, gpt4: 80, claude: 40, llama: 28 },
  { day: 'D19', threats: 195, mitigated: 160, gpt4: 110, claude: 55, llama: 30 },
  { day: 'D22', threats: 162, mitigated: 132, gpt4: 90, claude: 45, llama: 27 },
  { day: 'D25', threats: 210, mitigated: 178, gpt4: 120, claude: 60, llama: 30 },
  { day: 'D28', threats: 188, mitigated: 155, gpt4: 100, claude: 50, llama: 38 },
  { day: 'D30', threats: 240, mitigated: 210, gpt4: 140, claude: 65, llama: 35 },
];

const MODELS = [
  { id: 'gpt4', name: 'GPT-4o', score: 97, color: '#22d3ee' },
  { id: 'claude', name: 'Claude 3.5', score: 94, color: '#818cf8' },
  { id: 'llama', name: 'Llama 3.1', score: 88, color: '#c084fc' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt4', 'claude', 'llama']);

  const toggleModel = (id: string) => {
    setSelectedModels(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const tabs = [
    { name: 'Overview', icon: Activity },
    { name: 'Threats', icon: ShieldAlert },
    { name: 'Observe', icon: Eye },
    { name: 'Reports', icon: FileText },
    { name: 'Data', icon: Database },
    { name: 'Network', icon: Network },
  ];

  return (
    <div className="flex h-full gap-6 p-2 text-[var(--foreground)] transition-colors duration-300">
      {/* Internal Sidebar Tabs */}
      <aside className="flex w-48 flex-col gap-2 py-4 relative z-10">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            aria-label={`Switch to ${tab.name} view`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 backdrop-blur-md",
              activeTab === tab.name 
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-lg border border-[var(--card-border)]" 
                : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
            )}
          >
            <tab.icon className={cn("h-4 w-4", activeTab === tab.name ? "text-cyan-400" : "")} />
            <span className="text-xs font-bold leading-none">{tab.name}</span>
          </button>
        ))}
      </aside>

      {/* Main Dashboard Content */}
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {activeTab === 'Overview' ? (
              <>
                {/* Top Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Threats Blocked', value: '1,842', sub: '+12%', color: 'text-[var(--foreground)]' },
                    { label: 'Avg Response', value: '38ms', sub: 'Stable', color: 'text-blue-400' },
                    { label: 'Risk Score', value: '2.4 / 10', sub: 'Low Risk', color: 'text-[var(--foreground)]' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{stat.label}</p>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</span>
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{stat.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Middle Section: Chart and Right Panels */}
                <div className="grid grid-cols-[1fr_300px] gap-6">
                  <section className="flex flex-col rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card)] p-8 backdrop-blur-xl relative z-0">
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--foreground)]">Threat activity - last 30 days</h3>
                        <p className="mt-1 text-[10px] font-medium text-[var(--muted)] italic">Global monitoring active across all nodes.</p>
                      </div>
                      <div className="flex gap-6">
                         <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-tighter">Threats</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-tighter">Mitigated</span>
                         </div>
                      </div>
                    </div>

                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="glowCyan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"  stopColor="#22d3ee" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="glowPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"  stopColor="#a855f7" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="glowIndigo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"  stopColor="#818cf8" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 6" stroke="var(--card-border)" vertical={false} />
                          <XAxis dataKey="day" hide />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'var(--background)', 
                              border: '1px solid var(--card-border)',
                              borderRadius: '16px',
                              fontSize: '11px',
                              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)'
                            }}
                            itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold', padding: '2px 0' }}
                          />
                          
                          {/* Main Threat Lines */}
                          <Area
                            type="monotone"
                            dataKey="mitigated"
                            stroke="#c084fc"
                            strokeWidth={2}
                            fill="url(#glowPurple)"
                            strokeOpacity={0.3}
                            fillOpacity={0.1}
                          />
                          <Area
                            type="monotone"
                            dataKey="threats"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            fill="url(#glowCyan)"
                            strokeOpacity={0.3}
                            fillOpacity={0.1}
                          />

                          {/* Dynamic Model Lines */}
                          <AnimatePresence>
                            {selectedModels.includes('gpt4') && (
                              <Area
                                key="gpt4"
                                type="monotone"
                                dataKey="gpt4"
                                stroke="#22d3ee"
                                strokeWidth={3}
                                fill="url(#glowCyan)"
                                animationDuration={1000}
                                style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }}
                              />
                            )}
                            {selectedModels.includes('claude') && (
                              <Area
                                key="claude"
                                type="monotone"
                                dataKey="claude"
                                stroke="#818cf8"
                                strokeWidth={3}
                                fill="url(#glowIndigo)"
                                animationDuration={1000}
                                style={{ filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))' }}
                              />
                            )}
                            {selectedModels.includes('llama') && (
                              <Area
                                key="llama"
                                type="monotone"
                                dataKey="llama"
                                stroke="#c084fc"
                                strokeWidth={3}
                                fill="url(#glowPurple)"
                                animationDuration={1000}
                                style={{ filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.4))' }}
                              />
                            )}
                          </AnimatePresence>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Activity Logs */}
                    <div className="mt-8 space-y-3 border-t border-[var(--card-border)] pt-6">
                       {[
                         { icon: ShieldAlert, text: 'Prompt injection attempt blocked', time: '2s ago', color: 'text-rose-500' },
                         { icon: Lock, text: 'PII automatically redacted', time: '18s ago', color: 'text-cyan-400' },
                         { icon: CheckCircle2, text: 'Policy gate enforced on output', time: '1m ago', color: 'text-indigo-400' },
                       ].map((log, i) => (
                         <div key={i} className="flex items-center justify-between rounded-2xl bg-[var(--card)] p-3 px-4 transition-colors hover:bg-[var(--foreground)]/5 border border-[var(--card-border)]">
                            <div className="flex items-center gap-4">
                               <log.icon className={cn("h-3 w-3", log.color)} />
                               <span className="text-xs font-bold text-[var(--foreground)]">{log.text}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-[0.2em]">{log.time}</span>
                         </div>
                       ))}
                    </div>
                  </section>

                  <aside className="flex flex-col gap-6">
                    {/* Compliance Status */}
                    <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
                      <div className="mb-6 flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Compliance status</p>
                         <div className="h-6 w-6 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <ShieldCheck className="h-3 w-3 text-blue-400" />
                         </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-[var(--foreground)]">DPDP</span>
                            <span className="text-cyan-400">100%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
                            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_10px_#22d3ee55]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Models - Integrated Interaction */}
                    <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md flex-1 overflow-hidden">
                      <div className="mb-6 flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Model Selectors</p>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setIsSyncing(true);
                                setSelectedModels(MODELS.map(m => m.id));
                                setTimeout(() => setIsSyncing(false), 800);
                              }}
                              className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                              All
                            </button>
                            <button 
                              onClick={() => {
                                setIsSyncing(true);
                                setSelectedModels([]);
                                setTimeout(() => setIsSyncing(false), 500);
                              }}
                              className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                              None
                            </button>
                         </div>
                      </div>
                      <div className="relative space-y-3">
                        {isSyncing && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/40 backdrop-blur-[2px] rounded-2xl">
                             <div className="h-4 w-4 border-2 border-cyan-400 border-t-transparent animate-spin rounded-full" />
                          </div>
                        )}
                        {MODELS.map((model, idx) => {
                          const isSelected = selectedModels.includes(model.id);
                          return (
                            <button
                              key={model.id}
                              onClick={() => toggleModel(model.id)}
                              aria-pressed={isSelected}
                              aria-label={`Toggle ${model.name} telemetry in chart`}
                              className={cn(
                                "relative w-full text-left p-4 rounded-2xl border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                                isSelected 
                                  ? "bg-[var(--card)] border-[var(--card-border)] shadow-lg translate-x-1" 
                                  : "bg-transparent border-transparent opacity-40 hover:opacity-60 grayscale"
                              )}
                            >
                              <div className="mb-2.5 flex justify-between text-[10px] font-black uppercase tracking-widest">
                                 <span className="text-[var(--foreground)] flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: model.color }} />
                                    {model.name}
                                 </span>
                                 <div className={cn(
                                   "h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-300",
                                   isSelected ? "bg-cyan-500 border-cyan-400 scale-110 shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "border-[var(--card-border)]"
                                 )}>
                                   {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[4]" />}
                                 </div>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${model.score}%` }}
                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                    className="h-full" 
                                    style={{ backgroundColor: model.color }} 
                                 />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
                <div className="flex h-[600px] w-full items-center justify-center rounded-[3rem] border border-[var(--card-border)] bg-[var(--card)] backdrop-blur-md">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--card)] border border-[var(--card-border)]">
                            <Activity className="h-8 w-8 text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-[var(--foreground)]">{activeTab} Interface</h3>
                        <p className="mt-2 text-xs text-[var(--muted)] font-medium max-w-xs mx-auto">This section is currently monitoring live traffic from established agents. Full analytics for {activeTab} will synchronize shortly.</p>
                        <div className="mt-8 flex justify-center gap-3">
                            <div className="h-1 w-12 rounded-full bg-cyan-400 animate-pulse" />
                            <div className="h-1 w-8 rounded-full bg-[var(--card-border)]" />
                            <div className="h-1 w-8 rounded-full bg-[var(--card-border)]" />
                        </div>
                    </div>
                </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
