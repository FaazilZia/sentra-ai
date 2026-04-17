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
  Check,
  Search,
  ArrowRight,
  ChevronRight,
  Globe,
  Server,
  AlertTriangle,
  Download
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerScan } from '../lib/api';

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

const THREAT_LIST = [
  { id: 1, type: 'Injection', severity: 'Critical', source: 'Node-04', status: 'Blocked', time: '2 mins ago' },
  { id: 2, type: 'PII Leak', severity: 'High', source: 'API-Gateway', status: 'Redacted', time: '14 mins ago' },
  { id: 3, type: 'DDoS', severity: 'Medium', source: 'Edge-Region-1', status: 'Mitigating', time: '1 hour ago' },
  { id: 4, type: 'Credential Stuffing', severity: 'High', source: 'Auth-Service', status: 'Challenged', time: '2 hours ago' },
];

const DATA_INVENTORY = [
  { name: 'SSN', value: 400, color: '#f43f5e' },
  { name: 'Email', value: 300, color: '#3b82f6' },
  { name: 'Credit Cards', value: 300, color: '#a855f7' },
  { name: 'Names', value: 200, color: '#10b981' },
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
    { name: 'Overview', icon: Activity, id: 'overview' },
    { name: 'Threats', icon: ShieldAlert, id: 'threats' },
    { name: 'Observe', icon: Eye, id: 'observe' },
    { name: 'Reports', icon: FileText, id: 'reports' },
    { name: 'Data', icon: Database, id: 'data' },
    { name: 'Network', icon: Network, id: 'network' },
  ];

  // --- Sub-renderers for each tab ---

  const renderOverview = () => (
    <>
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Threats Blocked', value: '1,842', sub: '+12%', color: 'text-[var(--foreground)]' },
          { label: 'Avg Response', value: '38ms', sub: 'Stable', color: 'text-blue-400' },
          { label: 'Risk Score', value: '2.4 / 10', sub: 'Low Risk', color: 'text-[var(--foreground)]' },
        ].map((stat) => (
          <div key={stat.label} className="premium-glass p-6 group">
            <div className="noise-overlay" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] group-hover:text-blue-500 transition-colors">{stat.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</span>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Section: Chart and Right Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <section className="flex flex-col premium-glass p-8 rounded-[2.5rem] relative z-0">
          <div className="noise-overlay" />
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
                
                <Area type="monotone" dataKey="mitigated" stroke="#c084fc" strokeWidth={2} fill="url(#glowPurple)" strokeOpacity={0.3} fillOpacity={0.1} />
                <Area type="monotone" dataKey="threats" stroke="#22d3ee" strokeWidth={2} fill="url(#glowCyan)" strokeOpacity={0.3} fillOpacity={0.1} />

                {selectedModels.includes('gpt4') && (
                  <Area key="gpt4" type="monotone" dataKey="gpt4" stroke="#22d3ee" strokeWidth={3} fill="none" animationDuration={1000} style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }} />
                )}
                {selectedModels.includes('claude') && (
                  <Area key="claude" type="monotone" dataKey="claude" stroke="#818cf8" strokeWidth={3} fill="none" animationDuration={1000} style={{ filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))' }} />
                )}
                {selectedModels.includes('llama') && (
                  <Area key="llama" type="monotone" dataKey="llama" stroke="#c084fc" strokeWidth={3} fill="none" animationDuration={1000} style={{ filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.4))' }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
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
          <div className="glass-card p-6 rounded-3xl">
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

          <div className="glass-card p-6 flex-1 overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Model Selectors</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedModels(MODELS.map(m => m.id))} className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)]">All</button>
                  <button onClick={() => setSelectedModels([])} className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)]">None</button>
                </div>
            </div>
            <div className="relative space-y-3">
              {MODELS.map((model, idx) => {
                const isSelected = selectedModels.includes(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    className={cn(
                      "relative w-full text-left p-4 rounded-2xl border transition-all duration-300",
                      isSelected ? "bg-[var(--card)] border-[var(--card-border)] shadow-lg" : "bg-transparent border-transparent opacity-40 grayscale"
                    )}
                  >
                    <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-[var(--foreground)] flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: model.color }} />
                          {model.name}
                        </span>
                        {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${model.score}%` }} className="h-full" style={{ backgroundColor: model.color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </>
  );

  const renderThreats = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between glass-card p-8 rounded-[2.5rem]">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Threat Center</h2>
          <p className="text-sm text-[var(--muted)]">Monitoring 24/4 active security signals across all endpoints.</p>
        </div>
        <div className="flex gap-4">
           <button className="glass-button text-xs"><Filter className="h-4 w-4 mr-2" /> Filter</button>
           <button className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500/20 transition-all">Clear All</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {THREAT_LIST.map((threat) => (
          <motion.div 
            key={threat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 flex items-center justify-between group"
          >
            <div className="flex items-center gap-6">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center border",
                threat.severity === 'Critical' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                threat.severity === 'High' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                "bg-blue-500/10 border-blue-500/20 text-blue-500"
              )}>
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-black text-[var(--foreground)] uppercase tracking-widest text-xs">{threat.type}</h4>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-[var(--muted)]">
                  <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {threat.source}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--card-border)]" />
                  <span>{threat.time}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-12">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Status</p>
                <span className="px-3 py-1 bg-[var(--foreground)]/5 text-cyan-400 text-[9px] font-black uppercase rounded-full border border-cyan-400/20">
                  {threat.status}
                </span>
              </div>
              <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)] group-hover:border-cyan-400 transition-all group-hover:bg-cyan-400/5">
                <ChevronRight className="h-4 w-4 text-[var(--muted)] group-hover:text-cyan-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderObserve = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-8 rounded-[2.5rem]">
        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--foreground)] mb-6">Real-Time Observation</h3>
        <div className="h-[400px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData.slice(-7)}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
               <XAxis dataKey="day" hide />
               <YAxis hide />
               <Tooltip cursor={{fill: 'var(--foreground)', opacity: 0.05}} contentStyle={{ background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
               <Bar dataKey="threats" fill="var(--primary)" radius={[4, 4, 0, 0]} />
               <Bar dataKey="mitigated" fill="#a855f7" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-col gap-6">
         <div className="glass-card p-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4">Node Health</h4>
            <div className="space-y-4">
               {[
                 { name: 'US-East-1', latency: '12ms', load: 45 },
                 { name: 'EU-West-1', latency: '48ms', load: 82 },
                 { name: 'AP-South-1', latency: '35ms', load: 12 },
               ].map(node => (
                 <div key={node.name} className="flex items-center justify-between p-3 rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)]">
                    <div className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-xs font-bold">{node.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-cyan-400">{node.latency}</span>
                 </div>
               ))}
            </div>
         </div>
         <div className="glass-card p-8 flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full border-4 border-cyan-400/20 flex items-center justify-center mb-4">
               <Eye className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Global Watcher</h3>
            <p className="text-[10px] text-[var(--muted)] mt-2 max-w-xs">Scanning 1.2M events per second across all federated models.</p>
         </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {[
         { title: 'Weekly Compliance Audit', date: 'Oct 24, 2024', type: 'PDF', size: '2.4 MB' },
         { title: 'PII Exposure Assessment', date: 'Oct 22, 2024', type: 'DOCX', size: '1.1 MB' },
         { title: 'Model Safety Benchmarks', date: 'Oct 19, 2024', type: 'PDF', size: '5.8 MB' },
         { title: 'Infrastructure Security Log', date: 'Oct 15, 2024', type: 'CSV', size: '12.4 MB' },
         { title: 'Quarterly Risk Report', date: 'Sep 30, 2024', type: 'PDF', size: '8.2 MB' },
       ].map((report, i) => (
         <motion.div 
           key={i}
           whileHover={{ y: -5 }}
           className="glass-card p-6 flex flex-col justify-between"
         >
           <div>
              <div className="h-10 w-10 rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)] flex items-center justify-center mb-4">
                 <FileText className="h-5 w-5 text-indigo-400" />
              </div>
              <h4 className="font-bold text-sm text-[var(--foreground)] leading-tight">{report.title}</h4>
              <p className="text-[10px] text-[var(--muted)] mt-1 font-medium">{report.date}</p>
           </div>
           <div className="mt-6 flex items-center justify-between border-t border-[var(--card-border)] pt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{report.type} • {report.size}</span>
              <button className="h-8 w-8 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center justify-center">
                 <Download className="h-4 w-4" />
              </button>
           </div>
         </motion.div>
       ))}
    </div>
  );

  const renderData = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem]">
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--foreground)] mb-8">Data Classification Distribution</h3>
          <div className="h-[350px] w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={DATA_INVENTORY}
                   cx="50%"
                   cy="50%"
                   innerRadius={80}
                   outerRadius={120}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {DATA_INVENTORY.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black">1.2k</span>
                <span className="text-[10px] font-black uppercase text-[var(--muted)]">Records</span>
             </div>
          </div>
       </div>
       <div className="flex flex-col gap-6">
          <div className="glass-card p-6">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4">Sensitive Findings</h4>
             <div className="space-y-4">
                {DATA_INVENTORY.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                     <span className="text-xs font-bold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                        {item.name}
                     </span>
                     <span className="text-xs font-black">{item.value}</span>
                  </div>
                ))}
             </div>
          </div>
          <div className="glass-card p-6 flex-1 flex flex-col justify-center bg-gradient-to-br from-blue-500/5 to-purple-500/5">
             <Database className="h-6 w-6 text-indigo-400 mb-4" />
             <h4 className="text-xs font-black uppercase tracking-widest">Auto-Discovery</h4>
             <p className="text-[10px] text-[var(--muted)] mt-2">Sentra AI is currently indexing 14 connected databases for shadow PII leaks.</p>
             <button className="mt-4 text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1 hover:gap-2 transition-all">
                Run Discovery <ArrowRight className="h-3 w-3" />
             </button>
          </div>
       </div>
    </div>
  );

  const renderNetwork = () => (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-8 rounded-[2.5rem] min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
           <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)]" />
        </div>
        <Globe className="h-24 w-24 text-cyan-400 mb-6 animate-[spin_10s_linear_infinite]" />
        <h3 className="text-xl font-black uppercase tracking-[0.2em]">Global Mesh Network</h3>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-md">99.99% Core Uptime. All nodes are reporting healthy status and zero packet loss in transit.</p>
        
        <div className="mt-12 grid grid-cols-3 gap-12 text-center">
           <div>
              <p className="text-2xl font-black text-emerald-400">14</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Active Nodes</p>
           </div>
           <div>
              <p className="text-2xl font-black text-cyan-400">0ms</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Core Jitter</p>
           </div>
           <div>
              <p className="text-2xl font-black text-indigo-400">Tbps</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Throughput</p>
           </div>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-6">Security Perimeter</h4>
        <div className="flex flex-wrap gap-4">
           {['Firewall-V3', 'WAF-Elite', 'Auth-Gateway', 'DDoS-Shield', 'CDN-Edge-Cache'].map(perim => (
             <div key={perim} className="px-4 py-2 rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)] flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{perim}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview': return renderOverview();
      case 'Threats': return renderThreats();
      case 'Observe': return renderObserve();
      case 'Reports': return renderReports();
      case 'Data': return renderData();
      case 'Network': return renderNetwork();
      default: return (
        <div className="flex h-[400px] w-full items-center justify-center glass-card">
           <div className="text-center">
              <AlertTriangle className="h-10 w-10 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-black uppercase">Section Unavailable</h3>
              <p className="text-[10px] text-[var(--muted)] mt-2">This module is not active for the current license tier.</p>
           </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-full gap-6 p-4 text-[var(--foreground)] transition-colors duration-300 relative">
      <div className="liquid-mesh" />
      
      {/* Sidebar Navigation - Fixed click area and enhanced styling */}
      <aside className="flex w-52 flex-col gap-2 p-4 rounded-3xl glass-sidebar relative z-[50] shadow-2xl h-fit sticky top-0">
        <div className="mb-6 px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--muted)] opacity-50">Sentra Core</p>
        </div>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-5 py-3.5 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                isActive 
                  ? "bg-white/10 text-[var(--foreground)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/20 translate-x-1" 
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_12px_#22d3ee]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className={cn(
                "h-4 w-4 transition-colors duration-300", 
                isActive ? "text-cyan-400" : "group-hover:text-[var(--foreground)]"
              )} />
              <span className={cn(
                "text-[10px] font-black leading-none uppercase tracking-widest",
                isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
              )}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar min-h-screen pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
