import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Activity,
  LayoutDashboard,
  ShieldAlert,
  Search,
  FileText,
  Menu,
  X,
  Globe,
  Database,
  Eye,
  BarChart,
  Target,
  Workflow,
  Moon,
  Sun,
  Home as HomeIcon
} from 'lucide-react';
import { useTheme } from '../lib/useTheme';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { siteContent } from '../lib/content';
import { Link } from 'react-router-dom';

// --- Polished Components ---

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseStyles = "inline-flex items-center justify-center rounded-[1.25rem] px-8 py-4 text-sm font-black transition-all duration-300 disabled:opacity-50 active:scale-95 glass-button";
  const variants: any = {
    primary: "bg-blue-600/80 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 border-transparent",
    secondary: "text-[var(--foreground)]",
    outline: "border-2 border-[var(--glass-border)] text-[var(--foreground)] hover:border-[var(--primary)]",
    ghost: "text-[var(--muted)] hover:text-[var(--foreground)]"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const SectionHeading = ({ badge, title, subtitle, centered = true }: any) => (
  <div className={`mb-20 ${centered ? 'text-center' : ''}`}>
    {badge && (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-black uppercase tracking-widest mb-6"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
        {badge}
      </motion.div>
    )}
    <motion.h2 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-4xl md:text-6xl font-black text-[var(--foreground)] mb-8 leading-[1.1]"
    >
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-[var(--muted)] text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);

const Glow = ({ color = 'blue', className = '' }: { color?: 'blue' | 'purple' | 'cyan', className?: string }) => {
  const colors = {
    blue: 'bg-blue-600',
    purple: 'bg-indigo-600',
    cyan: 'bg-cyan-500'
  };
  return (
    <div className={`absolute -z-10 blur-[120px] opacity-20 rounded-full animate-pulse-slow ${colors[color]} ${className}`} />
  );
};

// --- Main Layout Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 50], [0.4, 0.8]);
  const scale = useTransform(scrollY, [0, 50], [1, 0.98]);

  return (
    <motion.nav 
      style={{ scale }}
      className="glass-navbar"
    >
      <div className="flex w-full items-center justify-between px-6 md:px-10">
        {/* Logo Section */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <Lock className="text-white h-5 w-5" />
            </div>
            <span className="hidden sm:inline-block text-2xl font-black tracking-tighter text-[var(--foreground)] lowercase">sentra <span className="text-blue-500">ai</span></span>
          </Link>
        </div>
        
        {/* Centered Navigation (Desktop) / Toggle (Mobile) */}
        <div className="flex-none items-center justify-center">
          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-10">
            {[
              { name: 'Product', icon: Cpu },
              { name: 'Showcase', icon: Eye },
              { name: 'How it Works', icon: Workflow }
            ].map((item) => (
              <a key={item.name} href={`#${item.name.toLowerCase().replace(/ /g, '-')}`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)] transition-all relative group">
                <item.icon className="h-3.5 w-3.5" />
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
              </a>
            ))}
            
            <div className="h-4 w-px bg-[var(--glass-border)] mx-1" />

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-[var(--foreground)]/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-all glass-button"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile Toggle - Centered for better access */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--foreground)]/5 border border-[var(--card-border)] text-[var(--foreground)]"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
          </button>
        </div>

        {/* Right Section Buttons */}
        <div className="flex-1 flex items-center justify-end gap-6">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hidden sm:flex p-2.5 rounded-full hover:bg-[var(--foreground)]/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
            aria-label="Home"
          >
            <HomeIcon className="h-5 w-5" />
          </button>
          
          <Link to="/login" className="hidden sm:inline-flex text-xs font-black uppercase tracking-widest text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">Login</Link>
          <Button className="h-10 px-6 text-[10px] uppercase tracking-widest rounded-full">Free Trial</Button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 right-0 bg-[var(--background)] border-b border-[var(--card-border)] px-6 py-10 lg:hidden"
          >
            <div className="flex flex-col gap-8">
              {['Product', 'Showcase', 'How it Works'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-xl font-black text-[var(--foreground)]" onClick={() => setIsOpen(false)}>{item}</a>
              ))}
              <hr className="border-[var(--card-border)]" />
              <Button className="w-full">Get Started</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-40 pb-20 lg:pt-60 lg:pb-40 overflow-hidden bg-[var(--background)] transition-colors duration-300">
      <div className="varonis-bg opacity-40" />
      <div className="varonis-mesh opacity-10" />
      <Glow color="blue" className="top-1/4 left-1/4 h-[600px] w-[600px]" />
      <Glow color="purple" className="bottom-1/4 right-1/4 h-[500px] w-[500px]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs font-black uppercase tracking-widest text-[var(--primary)] mb-10 shadow-inner"
        >
          <Zap className="h-4 w-4" />
          <span>V2.0 has arrived with 50+ new integrations</span>
          <ChevronRight className="h-4 w-4 opacity-50" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-9xl font-black tracking-tighter text-[var(--foreground)] mb-10 leading-[0.9] uppercase"
        >
          AI Governance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            Redefined.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl text-[var(--muted)] max-w-3xl mx-auto mb-16 font-medium leading-relaxed"
        >
          Sentra AI provides the trust layer for your autonomous future. Secure models, automate compliance, and monitor risk in real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-32"
        >
          <Button className="h-16 px-12 text-lg">Start Free Trial</Button>
          <Button variant="secondary" className="h-16 px-12 text-lg">Book a Demo</Button>
        </motion.div>

        {/* Live Dashboard Mockup - matches reference image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          className="relative max-w-7xl mx-auto"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur-2xl opacity-50 animate-pulse-slow" />
          
          {/* Dashboard Shell */}
          <div className="relative bg-[var(--background)] border border-[var(--card-border)] rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors duration-300">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--sidebar)]/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-black text-[var(--muted)] tracking-widest uppercase">sentra.live / dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-[var(--card-border)] flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--muted)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-1 w-12 bg-[var(--card-border)] rounded" />
                  <div className="h-1 w-8 bg-[var(--card-border)] rounded" />
                </div>
              </div>
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col gap-6 py-8 px-4 border-r border-[var(--card-border)] bg-[var(--sidebar)]/30 min-w-[100px] items-center">
                {[
                  { icon: LayoutDashboard, label: 'Overview', active: true },
                  { icon: ShieldAlert, label: 'Threats', active: false },
                  { icon: Eye, label: 'Observe', active: false },
                  { icon: FileText, label: 'Reports', active: false },
                  { icon: Database, label: 'Data', active: false },
                  { icon: Globe, label: 'Network', active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div key={label} className={`flex flex-col items-center gap-1.5 cursor-pointer group ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                    <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${active ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--muted)]'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-cyan-400' : 'text-[var(--muted)]'}`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6 min-w-0 flex flex-col gap-6">
                {/* Search / Data Input Bar */}
                <div className="flex items-center gap-4 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-3 px-5 backdrop-blur-md shadow-inner group transition-all hover:border-[var(--primary)]/50">
                   <Search className="h-4 w-4 text-[var(--muted)] group-hover:text-cyan-400 transition-colors" />
                   <div className="text-xs text-[var(--muted)] font-bold uppercase tracking-widest flex-1">Ask Sentra AI or scan a new model endpoint...</div>
                   <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded-md bg-[var(--foreground)]/5 text-[8px] font-black text-[var(--muted)] border border-[var(--card-border)]">⌘ K</div>
                      <Button className="h-8 px-4 text-[9px] rounded-lg">Run Analysis</Button>
                   </div>
                </div>

                {/* Top Stats Row */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Threats Blocked', val: '1,842', color: 'text-[var(--foreground)]' },
                    { label: 'Avg Response', val: '38ms', color: 'text-blue-400' },
                    { label: 'Risk Score', val: '2.4 / 10', color: 'text-[var(--foreground)]' }
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5 backdrop-blur-md">
                      <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-6">
                  {/* Left Column: Chart + Events */}
                  <div className="flex-[2] min-w-0 flex flex-col gap-6">
                    {/* Main Area Chart */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-6 backdrop-blur-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest mb-1">Threat activity - last 30 days</p>
                        </div>
                        <div className="flex gap-3">
                           <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                        </div>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { day: 'D1',  threats: 18 },
                              { day: 'D4',  threats: 55 },
                              { day: 'D7',  threats: 38 },
                              { day: 'D10', threats: 95 },
                              { day: 'D13', threats: 72 },
                              { day: 'D16', threats: 148 },
                              { day: 'D19', threats: 195 },
                              { day: 'D22', threats: 162 },
                              { day: 'D25', threats: 210 },
                              { day: 'D28', threats: 188 },
                              { day: 'D30', threats: 240 },
                            ]}
                            margin={{ top: 8, right: 5, left: -25, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="heroCyan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 8" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 8, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--muted)', fontSize: 8 }} axisLine={false} tickLine={false} />
                            <Area type="monotone" dataKey="threats" stroke="#22d3ee" strokeWidth={2} fill="url(#heroCyan)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Security Events List */}
                    <div className="space-y-3">
                       {[
                         { text: 'Prompt injection attempt blocked', time: '2s ago', icon: ShieldAlert, color: 'text-amber-500' },
                         { text: 'PII automatically redacted', time: '18s ago', icon: Lock, color: 'text-blue-400' },
                         { text: 'Policy gate enforced on output', time: '1m ago', icon: ShieldCheck, color: 'text-emerald-400' }
                       ].map((event, i) => (
                         <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)] backdrop-blur-md">
                           <div className="flex items-center gap-4">
                             <event.icon className={`h-4 w-4 ${event.color}`} />
                             <span className="text-xs font-bold text-[var(--foreground)]">{event.text}</span>
                           </div>
                           <span className="text-[10px] font-black text-[var(--muted)] uppercase">{event.time}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Right Column: Other Info */}
                  <div className="flex-1 flex flex-col gap-6">
                    {/* Compliance */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-6 backdrop-blur-md">
                      <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-6">Compliance status</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-black">
                           <span className="text-[var(--foreground)] lowercase">DPDP</span>
                           <span className="text-cyan-400">100%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--card-border)] rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-400 w-full shadow-[0_0_10px_#22d3ee]" />
                        </div>
                      </div>
                    </div>

                    {/* Active Models */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-6 backdrop-blur-md flex-1">
                      <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-6">Active models</p>
                      <div className="space-y-4">
                        {[
                          { name: 'GPT-4o', active: true },
                          { name: 'Claude 3.5', active: true },
                          { name: 'Llama 3.1', active: true },
                        ].map(model => (
                          <div key={model.name} className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                            <span className="text-xs font-bold text-[var(--foreground)]">{model.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Badges */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-6 top-1/3 glass rounded-2xl px-5 py-3 shadow-2xl hidden xl:flex items-center gap-3 border-[var(--primary)]/20"
          >
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)] shadow-lg shadow-[var(--primary-glow)] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-[var(--foreground)] uppercase leading-none mb-1">System Secure</p>
              <p className="text-[10px] text-[var(--muted)] uppercase font-black tracking-widest">Compliance: 100%</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -left-8 bottom-1/4 glass rounded-2xl px-5 py-3 shadow-2xl hidden xl:flex items-center gap-3 border-purple-500/20"
          >
            <div className="h-9 w-9 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-[var(--foreground)] uppercase leading-none mb-1">Active Policy</p>
              <p className="text-[10px] text-[var(--muted)] uppercase font-black tracking-widest">Auto-mitigating...</p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      title: "AI Monitoring",
      desc: "Comprehensive visibility into every agent interaction and token flow.",
      icon: Eye,
      color: "blue"
    },
    {
      title: "Risk Automation",
      desc: "Auto-detect and mitigate data leaks and prompt injections instantly.",
      icon: ShieldAlert,
      color: "indigo"
    },
    {
      title: "Policy Engine",
      desc: "Define granular governance policies for models, teams, and regions.",
      icon: Workflow,
      color: "purple"
    },
    {
      title: "Compliant Logs",
      desc: "Immutable, tamper-proof logs for SOC2, GDPR, and DPDP auditing.",
      icon: FileText,
      color: "cyan"
    }
  ];

  return (
    <section id="product" className="py-32 lg:py-60 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          badge="Core Capabilities"
          title="Everything you need to scale safely."
          subtitle="Sentra AI provides the tools required to govern, secure, and monitor your AI ecosystem from a single pane."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="glass-card group p-10 rounded-[2.5rem]"
            >
              <div className={`h-16 w-16 rounded-[1.25rem] bg-[var(--muted-background)] border border-[var(--card-border)] flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_var(--primary-glow)]`}>
                <f.icon className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <h3 className="text-2xl font-black text-[var(--foreground)] mb-4 tracking-tight">{f.title}</h3>
              <p className="text-[var(--muted)] font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Showcase = () => {
  return (
    <section id="showcase" className="py-32 lg:py-60 bg-[var(--background)]/40 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
         <div className="grid lg:grid-cols-2 gap-24 items-center">
            <motion.div
               initial={{ opacity: 0, x: -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
            >
               <SectionHeading 
                 centered={false}
                 badge="Showcase"
                 title="Total visibility. Complete control."
                 subtitle="Stop guessing how your AI is performing. Sentra gives you the data you need to make informed governance decisions."
               />
               <ul className="space-y-8">
                  {[
                    { t: "Live Threat Matrix", d: "Visualize and block attacks as they happen." },
                    { t: "Cross-Model Analytics", d: "Performance metrics across all your LLMs." },
                    { t: "Policy Enforcement", d: "Set it once, enforce it everywhere automatically." }
                  ].map((item, i) => (
                    <motion.li 
                      key={item.t} 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2 }}
                      className="flex gap-6"
                    >
                       <div className="h-12 w-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="text-[var(--primary)] h-6 w-6" />
                       </div>
                       <div>
                          <p className="text-xl font-bold text-[var(--foreground)] mb-2 leading-none">{item.t}</p>
                          <p className="text-[var(--muted)] font-medium">{item.d}</p>
                       </div>
                    </motion.li>
                  ))}
               </ul>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, scale: 0.9, x: 50 }}
               whileInView={{ opacity: 1, scale: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
               className="relative lg:col-span-1"
            >
               <div className="glass-card p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                  {/* Dashboard Header */}
                  <div className="flex justify-between items-center mb-10">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-lg shadow-[var(--primary-glow)]">
                           <Activity className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-[var(--foreground)] text-sm font-black uppercase tracking-widest">Sentra Intelligence</span>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-500 font-black uppercase tracking-tighter">Live Monitor</span>
                     </div>
                  </div>
                  
                  {/* Top Stats - Screenshot 1 */}
                  <div className="grid grid-cols-3 gap-6 mb-10">
                     {[
                        { label: 'Threats Blocked', val: '1,842', sub: '+12%', color: 'text-[var(--foreground)]' },
                        { label: 'Avg Response', val: '38ms', sub: 'Stable', color: 'text-[var(--primary)]' },
                        { label: 'Risk Score', val: '2.4/10', sub: 'Low', color: 'text-[var(--foreground)]' }
                     ].map((stat) => (
                        <div key={stat.label} className="bg-[var(--foreground)]/5 p-5 rounded-3xl border border-[var(--card-border)]">
                           <p className="text-[10px] font-black text-[var(--muted)] uppercase mb-2 leading-none">{stat.label}</p>
                           <p className={`text-2xl font-black ${stat.color} mb-1 tracking-tight`}>{stat.val}</p>
                           <p className="text-[8px] font-bold text-[var(--muted)] uppercase tracking-widest">{stat.sub}</p>
                        </div>
                     ))}
                  </div>

                  {/* Main Area Chart - Neon Glow Style matching Reference Image */}
                  <div className="mb-10 bg-[var(--background)]/60 p-6 rounded-[2rem] border border-[var(--card-border)] overflow-hidden">
                     <div className="flex justify-between items-center mb-6">
                        <div>
                           <p className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest mb-1">Threat Activity</p>
                           <p className="text-[10px] text-[var(--muted)] font-medium">Last 30 days · 1,842 total blocked</p>
                        </div>
                        <div className="flex gap-5">
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                              <span className="text-[10px] text-[var(--muted)] font-bold">Threats</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                              <span className="text-[10px] text-[var(--muted)] font-bold">Mitigated</span>
                           </div>
                        </div>
                     </div>
                     <div className="w-full h-56">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart
                              data={[
                                 { day: 'D1',  threats: 18,  mitigated: 10 },
                                 { day: 'D4',  threats: 55,  mitigated: 28 },
                                 { day: 'D7',  threats: 38,  mitigated: 22 },
                                 { day: 'D10', threats: 95,  mitigated: 60 },
                                 { day: 'D13', threats: 72,  mitigated: 55 },
                                 { day: 'D16', threats: 148, mitigated: 110 },
                                 { day: 'D19', threats: 195, mitigated: 160 },
                                 { day: 'D22', threats: 162, mitigated: 132 },
                                 { day: 'D25', threats: 210, mitigated: 178 },
                                 { day: 'D28', threats: 188, mitigated: 155 },
                                 { day: 'D30', threats: 240, mitigated: 210 },
                              ]}
                              margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                           >
                              <defs>
                                 {/* Cyan gradient fill */}
                                 <linearGradient id="glowCyan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"  stopColor="#22d3ee" stopOpacity={0.55} />
                                    <stop offset="60%" stopColor="#0ea5e9" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#0c4a6e" stopOpacity={0} />
                                 </linearGradient>
                                 {/* Purple gradient fill */}
                                 <linearGradient id="glowPurple" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"  stopColor="#a855f7" stopOpacity={0.55} />
                                    <stop offset="60%" stopColor="#7c3aed" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#3b0764" stopOpacity={0} />
                                 </linearGradient>
                                 {/* Cyan line glow filter */}
                                 <filter id="cyanGlow">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                 </filter>
                                 {/* Purple line glow filter */}
                                 <filter id="purpleGlow">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                 </filter>
                              </defs>
                              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                              <XAxis dataKey="day" tick={{ fill: '#334155', fontSize: 9, fontWeight: 800, letterSpacing: 1 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#334155', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                              <Tooltip
                                 contentStyle={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '14px', color: 'white', fontSize: '11px', fontWeight: 700, padding: '10px 14px' }}
                                 itemStyle={{ color: '#94a3b8' }}
                                 cursor={{ stroke: 'rgba(34,211,238,0.15)', strokeWidth: 40 }}
                              />
                              {/* Purple (mitigated) drawn first so cyan sits on top */}
                              <Area
                                 type="monotoneX"
                                 dataKey="mitigated"
                                 stroke="#c084fc"
                                 strokeWidth={2.5}
                                 fill="url(#glowPurple)"
                                 dot={false}
                                 activeDot={{ r: 6, fill: '#c084fc', stroke: '#1e1b4b', strokeWidth: 2, filter: 'url(#purpleGlow)' }}
                                 style={{ filter: 'url(#purpleGlow)' }}
                              />
                              <Area
                                 type="monotoneX"
                                 dataKey="threats"
                                 stroke="#22d3ee"
                                 strokeWidth={2.5}
                                 fill="url(#glowCyan)"
                                 dot={false}
                                 activeDot={{ r: 6, fill: '#22d3ee', stroke: '#083344', strokeWidth: 2, filter: 'url(#cyanGlow)' }}
                                 style={{ filter: 'url(#cyanGlow)' }}
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  
                  {/* Bottom Layout from Screenshot 2 (Donut + Bars + Compliance) */}
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-[var(--card-border)]">
                     <div>
                        <div className="flex justify-between items-center mb-6">
                           <p className="text-[10px] font-black text-[var(--muted)] uppercase">Risk Distribution</p>
                           <span className="text-[10px] text-[var(--primary)] font-bold">Low Risk</span>
                        </div>
                        <div className="relative h-28 w-28 mx-auto">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-[var(--foreground)]/5" />
                              <motion.circle 
                                 cx="56" cy="56" r="45" stroke="var(--primary)" strokeWidth="10" fill="transparent" 
                                 strokeDasharray="282.7" 
                                 initial={{ strokeDashoffset: 282.7 }}
                                 whileInView={{ strokeDashoffset: 282.7 * 0.25 }}
                                 transition={{ duration: 1.5 }}
                                 className="drop-shadow-[0_0_8px_var(--primary-glow)]"
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <p className="text-xl font-black text-[var(--foreground)] leading-none">2.4</p>
                              <p className="text-[8px] text-[var(--muted)] uppercase font-black">Score</p>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col justify-center">
                        <div className="space-y-4">
                           <div>
                              <div className="flex justify-between text-[10px] font-black text-[var(--muted)] uppercase mb-2">
                                 <span>Compliance (DPDP)</span>
                                 <span>100%</span>
                              </div>
                              <div className="h-1.5 w-full bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    whileInView={{ width: '100%' }}
                                    transition={{ duration: 1.2 }}
                                    className="h-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]" 
                                 />
                              </div>
                           </div>
                           <div className="p-4 rounded-2xl bg-[var(--foreground)]/5 border border-[var(--card-border)]">
                              <div className="flex items-center gap-3">
                                 <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
                                 <div>
                                    <p className="text-[10px] text-[var(--foreground)] font-black uppercase leading-none mb-1">System Secure</p>
                                    <p className="text-[8px] text-[var(--muted)] font-medium">All guardrails active</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Activity Log Overlay Inspired by Screenshot 1 */}
                  <div className="mt-8 space-y-3">
                     {[
                       { text: 'Prompt injection blocked', time: '2s ago', icon: ShieldAlert, color: 'text-amber-500' },
                       { text: 'PII redacted', time: '18s ago', icon: Lock, color: 'text-[var(--primary)]' }
                     ].map((log, i) => (
                       <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)]">
                          <div className="flex items-center gap-3">
                             <log.icon className={`h-3 w-3 ${log.color}`} />
                             <span className="text-[11px] font-medium text-[var(--muted)]">{log.text}</span>
                          </div>
                          <span className="text-[9px] font-black text-[var(--muted)]/50 uppercase">{log.time}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </motion.div>
         </div>
      </div>
    </section>
  );
};

const Steps = () => {
  const steps = [
    { title: "Connect systems", icon: Globe, desc: "Plug into any LLM or model endpoint instantly." },
    { title: "Configure policies", icon: LayoutDashboard, desc: "Set your risk thresholds and compliance rules." },
    { title: "Scale safely", icon: Zap, desc: "Monitor everything from a secure, unified dashboard." }
  ];

  return (
    <section id="how-it-works" className="py-32 lg:py-60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          badge="Deployment"
          title="Getting started is easy."
          subtitle="Three steps to total governance. No complex infrastructure required."
        />
         <div className="grid lg:grid-cols-3 gap-16 relative">
          <div className="absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--card-border)] to-transparent hidden lg:block" />
          
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative text-center group"
            >
              <div className="glass-card inline-flex h-24 w-24 items-center justify-center rounded-[2rem] text-[var(--foreground)] mb-10 relative z-10">
                <s.icon className="h-10 w-10 text-[var(--primary)]" />
              </div>
              <h4 className="text-3xl font-black text-[var(--foreground)] mb-4 tracking-tighter uppercase">{s.title}</h4>
              <p className="text-[var(--muted)] font-medium max-w-xs mx-auto leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

const Pricing = () => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="py-32 lg:py-60 bg-[var(--muted-background)]/50 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24">
           <SectionHeading 
             badge="Pricing"
             title="Scalable plans for scale-up teams."
           />
           <div className="flex items-center justify-center gap-6 p-1.5 bg-[var(--card)] rounded-2xl w-fit mx-auto border border-[var(--card-border)]">
              <button 
                onClick={() => setBilling('monthly')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-[var(--primary)] text-white shadow-xl' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBilling('yearly')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${billing === 'yearly' ? 'bg-[var(--primary)] text-white shadow-xl' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
              >
                Yearly <span className="text-xs ml-1 opacity-70">(-25%)</span>
              </button>
           </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {siteContent.pricing.tiers.map((tier) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className={`relative flex flex-col p-12 rounded-[3.5rem] border transition-all duration-500 ${tier.highlighted ? 'bg-[var(--card)] border-[var(--primary)]/50 shadow-2xl' : 'bg-[var(--card)] border-[var(--card-border)]'}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--primary)] to-indigo-600 px-6 py-1.5 rounded-full text-xs font-black uppercase text-white shadow-lg">
                  Most Popular
                </div>
              )}
              <h4 className="text-3xl font-black text-[var(--foreground)] mb-4 tracking-tighter uppercase">{tier.name}</h4>
              <p className="text-[var(--muted)] font-medium mb-10 pb-10 border-b border-[var(--card-border)]">{tier.desc}</p>
              
              <div className="mb-12">
                 <span className="text-6xl font-black text-[var(--foreground)] tracking-tighter">
                   ${billing === 'monthly' ? tier.price.monthly : tier.price.yearly}
                 </span>
                 <span className="text-[var(--muted)] text-lg font-bold ml-1">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
              </div>

              <div className="space-y-5 mb-16 flex-1 text-[var(--foreground)] font-medium">
                 {tier.features.map(f => (
                   <div key={f} className="flex gap-4">
                      <CheckCircle2 className="h-5 w-5 text-[var(--primary)] shrink-0" />
                      <span className="text-sm">{f}</span>
                   </div>
                  ))}
              </div>

              <Button variant={tier.highlighted ? 'primary' : 'secondary'} className="w-full h-16 text-lg">
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
    return (
        <section className="py-32 lg:py-60 relative overflow-hidden">
            <Glow color="blue" className="top-1/2 left-0 h-[400px] w-[400px]" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading badge="Success Stories" title="Trusted by the best." />
                <div className="grid md:grid-cols-3 gap-8">
                    {siteContent.testimonials.map((t, i) => (                         <motion.div
                            key={t.author}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="p-10 rounded-[3rem] bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--foreground)]/5 transition-all duration-500 group"
                        >
                            <p className="text-xl text-[var(--foreground)] font-medium italic mb-10 leading-relaxed group-hover:text-[var(--primary)] transition-colors">"{t.quote}"</p>
                            <div className="flex items-center gap-5">
                                <img src={t.avatar} alt={t.author} className="h-14 w-14 rounded-2xl border border-[var(--card-border)]" />
                                <div>
                                    <p className="font-black text-[var(--foreground)] leading-none mb-1">{t.author}</p>
                                    <p className="text-sm text-[var(--muted)] font-bold uppercase tracking-widest">{t.role}</p>
                                </div>
                            </div>
                        </motion.div>

                    ))}
                </div>
            </div>
        </section>
    );
};

const CTA = () => {
  return (
    <section className="py-32 lg:py-60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[5rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 p-16 lg:p-32 text-center"
        >
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-8xl font-black text-white mb-10 leading-[0.9] tracking-tighter">
              Build your AI future <br /> with total confidence.
            </h2>
            <p className="text-xl md:text-2xl text-blue-100/70 mb-16 max-w-3xl mx-auto font-medium">
              Join 1,000+ companies securing and automating their AI ecosystems with Sentra AI. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button className="h-20 px-16 text-xl bg-white text-blue-900 border-none hover:bg-white/90">Get Started Free</Button>
              <Button variant="outline" className="h-20 px-16 text-xl border-white/20 hover:border-white/50">Book a Demo</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (     <footer className="py-24 border-t border-[var(--card-border)] bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-16 mb-24">
          <div className="lg:col-span-5">
             <div className="flex items-center gap-3 mb-10 group">
              <div className="h-12 w-12 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-white">
                <Lock className="h-6 w-6" />
              </div>
              <span className="text-3xl font-black text-[var(--foreground)] tracking-tighter uppercase font-mono">SENTRA <span className="text-[var(--primary)]">AI</span></span>
            </div>
            <p className="text-[var(--muted)] text-lg leading-relaxed mb-10 max-w-md">
              The leading enterprise trust layer for autonomous models. We ensure every token is safe, every agent is governed, and every team is protected.
            </p>
            <div className="flex gap-8">
              {['Twitter', 'LinkedIn', 'YouTube'].map(s => (
                <a key={s} href="#" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-all text-sm font-black uppercase tracking-widest">{s}</a>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-12">
            {[
              { t: 'Product', l: ['Features', 'Showcase', 'Security', 'Compliance'] },
              { t: 'Company', l: ['About', 'Careers', 'Blog', 'Contact'] },
              { t: 'Legal', l: ['Privacy', 'Terms', 'Cookie Policy', 'DPDP'] },
              { t: 'Support', l: ['Docs', 'Status', 'API', 'Help'] }
            ].map(col => (
              <div key={col.t}>
                 <h4 className="text-[var(--foreground)] text-sm font-black uppercase tracking-widest mb-8">{col.t}</h4>
                 <ul className="space-y-5">
                    {col.l.map(link => (
                      <li key={link}><a href="#" className="text-sm text-[var(--muted)] font-bold hover:text-[var(--primary)] transition-colors">{link}</a></li>
                    ))}
                 </ul>
              </div>
            ))}
          </div>
        </div>
        
        <div className="pt-12 border-t border-[var(--card-border)] flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-xs text-[var(--muted)] font-bold tracking-widest uppercase">© 2025 Sentra AI Inc. Crafted with precision.</p>
           <div className="flex gap-10 text-xs text-[var(--muted)] font-black uppercase tracking-widest">
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">SLA</a>
           </div>
        </div>
      </div>
    </footer>
  );
};

const Home = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen text-[var(--foreground)] selection:bg-blue-500/30 selection:text-white antialiased">
            <div className="liquid-mesh" />
            <Navbar />
            <main>
                <Hero />
                <Features />
                <Showcase />
                <Steps />
                <Testimonials />
                <CTA />
            </main>
            <Footer />
        </div>
    );
};

export default Home;
