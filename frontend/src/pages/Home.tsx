import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Activity,
  ShieldAlert,
  Search,
  FileText,
  Menu,
  X,
  Globe,
  Database,
  Eye,
  Target,
  Workflow,
  Server,
  AlertTriangle,
  Fingerprint,
  BarChart3,
  Scale,
  LayoutDashboard,
  Cpu,
  Sun,
  Moon,
  Ban,
  Terminal,
  Code2,
  Check,
  XCircle,
  PlayCircle,
  UserPlus,
  Loader2,
  BoxSelect,
  Key,
  Mail,
  Phone,
  Linkedin,
  Instagram
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/useTheme';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/layout/Logo';
import { AtmosphericBackground } from '../components/ui/AtmosphericBackground';

// --- Shared Premium Components ---

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const variants: any = {
    primary: "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5",
    secondary: "bg-[var(--card)] text-[var(--foreground)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)]",
    outline: "border border-[var(--glass-border)] text-[var(--foreground)] hover:border-blue-500/50 hover:bg-blue-500/5",
    ghost: "text-slate-400 hover:text-[var(--foreground)]"
  };

  return (
    <button 
      className={`inline-flex items-center justify-center rounded-xl px-8 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest ${className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
    {children}
  </div>
);

const SectionHeading = ({ badge, title, subtitle, centered = true }: any) => (
  <div className={`mb-20 ${centered ? 'text-center' : ''}`}>
    {badge && <Badge className="mb-6">{badge}</Badge>}
    <motion.h2 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-4xl md:text-6xl font-black text-[var(--foreground)] mb-8 tracking-tighter leading-[1.1] uppercase"
    >
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-[var(--muted)] text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium"
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);

// --- Sections ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => navigate('/login');

  const handleRequestDemo = () => {
    demoLogin();
    navigate('/app', { replace: true });
  };

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-7xl premium-glass !rounded-[1.5rem] bg-[var(--glass-bg)] backdrop-blur-3xl shadow-2xl border border-[var(--glass-border)]">
      <div className="noise-overlay" />
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-4 group">
          <Logo size="md" />
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {['Platform', 'Solutions', 'Compliance', 'Security'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors relative group">
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-[var(--card)] border border-[var(--glass-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={handleLogin}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-500 backdrop-blur-sm transition-all duration-300 hover:bg-blue-500/20 hover:border-blue-500/30 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(59,130,246,0.1)] active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            Login
          </button>

          <button
            onClick={handleRequestDemo}
            className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4f46e5 100%)',
              boxShadow: '0 0 20px rgba(14,165,233,0.4), 0 4px 15px rgba(37,99,235,0.3)',
            }}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Request Demo
          </button>

          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-[var(--foreground)] p-2">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
  <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Badge className="mb-10">AI Runtime Governance Infrastructure</Badge>
        <h1 className="text-6xl md:text-9xl font-black text-[var(--foreground)] tracking-tighter leading-[0.9] mb-10 uppercase">
          Control What Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            AI Can Do — In Real Time
          </span>
        </h1>
        <p className="text-[var(--muted)] text-xl md:text-2xl max-w-3xl mx-auto mb-16 font-medium leading-relaxed">
          The universal control layer for AI systems. We sit between your models and execution to enforce policies, block unauthorized actions, and ensure total governance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
          <Link to="/demo" className="w-full sm:w-auto">
            <Button className="h-16 px-12 w-full shadow-[0_0_40px_rgba(59,130,246,0.4)]">Book Enterprise Demo</Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="secondary" className="h-16 px-12 w-full sm:w-auto">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-blue-500 text-lg">3,000+</span>
            <span>AI Startups in India</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-indigo-500 text-lg">50,000+</span>
            <span>Companies using AI</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-purple-500 text-lg">80%</span>
            <span>Enterprise Adoption</span>
          </div>
        </div>

        {/* Hero Visual Flow */}
        <div className="mt-20 max-w-4xl mx-auto relative">
           <div className="absolute inset-0 bg-blue-500/10 blur-[100px] -z-10" />
           <div className="flex flex-col md:flex-row items-center justify-between gap-12 p-12 premium-glass !rounded-[3rem]">
              <div className="flex flex-col items-center gap-4 grow">
                 <div className="h-16 w-16 rounded-2xl bg-[var(--card)] border border-[var(--glass-border)] flex items-center justify-center shadow-lg">
                    <UserPlus className="h-8 w-8 text-blue-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">User / Agent</span>
              </div>
              <ArrowRight className="h-8 w-8 text-slate-700 hidden md:block" />
              <div className="flex flex-col items-center gap-4 grow">
                 <div className="h-24 w-24 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)] animate-pulse">
                    <Logo size="sm" iconOnly />
                 </div>
                 <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] font-black">Sentra AI Layer</span>
              </div>
              <ArrowRight className="h-8 w-8 text-slate-700 hidden md:block" />
              <div className="flex flex-col items-center gap-4 grow">
                 <div className="h-16 w-16 rounded-2xl bg-emerald-600/10 border border-emerald-500/50 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Safe Execution</span>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const SocialProof = () => (
  <section className="py-24 border-y border-[var(--glass-border)]">
    <div className="max-w-7xl mx-auto px-6">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--muted)] mb-12">
        Trusted by industries where AI failure is not an option
      </p>
      <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
        {['TATA CONSULTANCY SERVICES', 'INFOSYS', 'HDFC BANK', 'FLIPKART', 'ZOMATO'].map(brand => (
          <span key={brand} className="text-xl md:text-2xl font-black tracking-tighter text-[var(--foreground)]">{brand}</span>
        ))}
      </div>
    </div>
  </section>
);

const ProblemSection = () => (
  <section className="py-40 bg-[var(--background)]/50">
    <div className="max-w-7xl mx-auto px-6">
      <SectionHeading 
        badge="Strategic Risk"
        title="Companies don’t control AI — they trust it blindly."
        subtitle="Current enterprise AI deployments operate without a perimeter. One prompt injection or unauthorized model decision can lead to irreversible data exposure or system failure."
      />
      <div className="grid md:grid-cols-4 gap-8">
        {[
          { icon: Lock, title: "Data Exposure", desc: "AI accessing sensitive proprietary data without proper filtering or permission layers.", color: "text-blue-400" },
          { icon: ShieldAlert, title: "Prompt Injection", desc: "Malicious actors manipulating model outputs to bypass built-in safety constraints.", color: "text-red-400" },
          { icon: Target, title: "Unpredictability", desc: "No oversight on AI decisions before they are executed in the real-world environment.", color: "text-purple-400" },
          { icon: Scale, title: "Compliance Risk", desc: "Direct violation of global data mandates like GDPR and HIPAA through autonomous actions.", color: "text-emerald-400" }
        ].map((p, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 premium-glass group hover:bg-[var(--glass-bg)] border-white/5"
          >
            <div className="noise-overlay" />
            <div className={`h-12 w-12 rounded-xl bg-[var(--card)] border border-[var(--glass-border)] flex items-center justify-center mb-6 ${p.color}`}>
              <p.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-[var(--foreground)] mb-3 uppercase tracking-tighter">{p.title}</h3>
            <p className="text-[var(--muted)] text-sm leading-relaxed font-medium">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const MetricsSection = () => (
  <section className="py-32 bg-[var(--card)]/30 border-y border-[var(--glass-border)] relative">
    <div className="max-w-7xl mx-auto px-6">
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { v: "99.9%", l: "AI Visibility", d: "Zero blind spots across models" },
            { v: "<50ms", l: "Latency", d: "Real-time enforcement speed" },
            { v: "85%", l: "Risk Reduction", d: "In unauthorized AI actions" },
            { v: "100%", l: "Audit Ready", d: "Cryptographically signed logs" }
          ].map((m, i) => (
             <div key={i} className="text-center group">
                <div className="text-5xl md:text-6xl font-black text-blue-600 dark:text-blue-500 mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                  {m.v}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--foreground)] mb-4">
                  {m.l}
                </div>
                <p className="text-[var(--muted)] text-xs font-medium uppercase tracking-widest">{m.d}</p>
             </div>
          ))}
       </div>
    </div>
  </section>
);

const MarketOpportunity = () => (
  <section className="py-40 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
       <div className="premium-glass !rounded-[4rem] p-16 md:p-24 bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
             <div>
                <Badge className="mb-8">Emerging Category</Badge>
                <h2 className="text-5xl md:text-7xl font-black text-[var(--foreground)] mb-10 leading-[1.05] uppercase tracking-tighter">
                   The Future of <br /> <span className="text-blue-500">AI Trust.</span>
                </h2>
                <p className="text-[var(--muted)] text-xl font-medium leading-relaxed mb-10">
                   As the $1T AI market converges with the $200B cybersecurity sector, Runtime Governance has emerged as the most critical pillar of the modern AI stack. 
                </p>
                <div className="flex gap-4">
                   <Button>Read Category Report</Button>
                </div>
             </div>
             <div className="grid gap-6">
                {[
                  { t: "$1.2T", l: "AI Opportunity by 2030" },
                  { t: "92%", l: "Enterprise Security Gap" },
                  { t: "$15M", l: "Avg. cost of AI Data Breach" }
                ].map((stat, i) => (
                  <div key={i} className="p-8 premium-glass flex items-center justify-between border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{stat.l}</span>
                     <span className="text-3xl font-black text-white">{stat.t}</span>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  </section>
);

const ComparisonTable = () => (
  <section className="py-40 border-t border-[var(--glass-border)]">
    <div className="max-w-7xl mx-auto px-6">
      <SectionHeading 
        badge="Vs. Traditional"
        title="Monitoring is not enough."
        subtitle="Legacy security tools look at what happened. Sentra AI controls what happens."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left premium-glass !rounded-[2rem] border-separate border-spacing-0">
          <thead>
            <tr className="text-[var(--muted)] text-[10px] font-black uppercase tracking-widest">
              <th className="px-12 py-10 border-b border-[var(--glass-border)]">Feature</th>
              <th className="px-12 py-10 border-b border-[var(--glass-border)]">Legacy Tools</th>
              <th className="px-12 py-10 border-b border-[var(--glass-border)] bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">Sentra AI Infrastructure</th>
            </tr>
          </thead>
          <tbody className="text-[var(--foreground)] font-bold">
            {[
              { f: "Control Mode", l: "Static / Passive", s: "Real-time Runtime Control" },
              { f: "Awareness", l: "Networking Only", s: "Semantic AI-Native" },
              { f: "Latency", l: "Measured in Minutes", s: "Sub-50ms (Deterministic)" },
              { f: "Enforcement", l: "Manual Alerts", s: "Automated Policy Layer" },
              { f: "Auditability", l: "Surface Level", s: "Full Token-Level Observability" }
            ].map((row, i) => (
              <tr key={i} className="group hover:bg-[var(--glass-bg)]">
                <td className="px-12 py-8 border-b border-[var(--glass-border)] opacity-60 uppercase text-[10px] tracking-widest">{row.f}</td>
                <td className="px-12 py-8 border-b border-[var(--glass-border)]">{row.l}</td>
                <td className="px-12 py-8 border-b border-[var(--glass-border)] bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black">{row.s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const SimplifiedGuide = () => (
  <section className="py-40 relative">
    <div className="max-w-7xl mx-auto px-6">
      <div className="premium-glass !rounded-[4rem] p-12 md:p-24 border-blue-500/10">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <Badge className="mb-10">Human-Centric AI</Badge>
            <h2 className="text-5xl md:text-7xl font-black text-[var(--foreground)] mb-10 leading-[1.05] uppercase tracking-tighter">
              Think of us as <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                Your Smart Filter.
              </span>
            </h2>
            <p className="text-[var(--muted)] text-xl mb-16 font-medium leading-relaxed max-w-xl">
              Sentra AI acts as an intelligent layer between your team and the AI. It listens to every request, cross-references your safety rules, and ensures every action is secure.
            </p>
            <div className="space-y-10">
              {[
                { t: "Set Your Rules", d: "Easily tell Sentra which data is off-limits (like client secrets or passwords)." },
                { t: "Constant Oversight", d: "Our engine performs deep semantic analysis on every token, 24/7." },
                { t: "Instant Protection", d: "Unauthorized or risky actions are blocked in milliseconds before any damage occurs." }
              ].map((item, i) => (
                <div key={i} className="flex gap-8 items-start group">
                  <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 font-black text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-500/5">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-tighter mb-2 leading-none">{item.t}</h4>
                    <p className="text-[var(--muted)] font-medium text-lg leading-relaxed">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative lg:pl-10">
            {/* Background Glows */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse-slow" />
            
            <div className="relative p-12 premium-glass !rounded-[3.5rem] bg-slate-900/40 dark:bg-black/40 border-white/5 flex flex-col gap-12 shadow-2xl">
               <div className="noise-overlay" />
               
               {/* Example 1: Allowed */}
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 className="flex items-center gap-6 p-8 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] rounded-[2rem] border border-blue-500/20 relative z-10"
               >
                  <div className="h-14 w-14 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <Check className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1">SAFE INPUT</p>
                    <p className="text-[var(--foreground)] font-bold text-lg leading-tight">"Draft a welcome email template"</p>
                  </div>
               </motion.div>

               {/* Divider Line */}
               <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-30" />

               {/* Example 2: Blocked */}
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.2 }}
                 className="flex items-center gap-6 p-8 bg-red-500/[0.03] dark:bg-red-500/[0.05] rounded-[2rem] border border-red-500/30 relative z-10"
               >
                  <div className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                    <Ban className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-1">DANGER BLOCKED</p>
                    <p className="text-[var(--foreground)] font-bold text-lg leading-tight">"Export all customer credit cards"</p>
                  </div>
               </motion.div>

               <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                    <Activity className="h-3 w-3 text-blue-400 animate-pulse" />
                    <p className="text-[9px] font-black uppercase text-[var(--muted)] tracking-widest">Sentra Engine: ACTIVE-RESPONSE MODE</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SolutionSection = () => (
  <section id="platform" className="py-24 relative scroll-mt-32">
    <div className="max-w-7xl mx-auto px-6">
       <SectionHeading 
         badge="How it Works"
         title="Total Governance for every bit."
         subtitle="Sentra AI sits between your models and the execution layer, intercepting every high-risk token stream."
       />
       <div className="grid lg:grid-cols-2 gap-24 items-center">
         <div className="space-y-12">
            {[
              { t: "AI Action Request", d: "The agent attempts to execute a task (e.g., 'send email' or 'delete user')." },
              { t: "Policy & Risk Check", d: "Sentra instantly evaluates the action against your specific safety rules." },
              { t: "Decision Logic", d: "Action is Allowed if safe, or Blocked if it violates internal security policies." },
              { t: "Real-time Visibility", d: "Every outcome is instantly logged in the Sentra control dashboard." }
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                 <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1 font-black text-blue-500">
                    {i + 1}
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter mb-2">{step.t}</h4>
                    <p className="text-[var(--muted)] font-medium text-lg leading-relaxed">{step.d}</p>
                 </div>
              </div>
            ))}
         </div>

         <div className="relative p-12 premium-glass !rounded-[3.5rem] bg-[var(--card)]">
            <div className="noise-overlay" />
            <div className="relative z-10 flex flex-col items-center gap-10">
                <div className="w-full h-24 premium-glass flex flex-col items-center justify-center gap-2 bg-[var(--background)] border-[var(--glass-border)]">
                   <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400 z-10" />
                   <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest z-10">AI Action Request</span>
                </div>
               <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <ChevronRight className="rotate-90 text-slate-700" />
               </motion.div>
               <div className="w-full p-8 premium-glass border-[var(--glass-border)] flex flex-col items-center justify-center gap-4 bg-[var(--background)]">
                  <Logo size="sm" iconOnly />
                  <div className="px-4 py-1.5 bg-blue-600 text-[10px] font-black text-white rounded-full uppercase tracking-widest">AI Permission Layer</div>
               </div>
               <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <ChevronRight className="rotate-90 text-slate-700" />
               </motion.div>
               <div className="w-full h-24 premium-glass flex flex-col items-center justify-center gap-2 bg-emerald-500/5 border-emerald-500/20">
                  <ShieldCheck className="h-6 w-6 text-emerald-500 z-10" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest z-10">Safe Execution</span>
               </div>
            </div>
         </div>
       </div>
    </div>
  </section>
);

const FeaturesSection = () => {
  const features = [
    { t: "Real-time AI Control", d: "Enforce deterministic control over every autonomous action in <50ms.", i: Zap },
    { t: "AI Permission Management", d: "Granular permission layer for models, agents, and decentralized AI stacks.", i: ShieldCheck },
    { t: "Audit & Observability", d: "Full-spectrum visibility and immutable logs for every AI decision point.", i: LayoutDashboard },
    { t: "Security Enforcement", d: "Enterprise-grade protection against prompt injections and data poisoning.", i: Lock }
  ];

  return (
    <section id="solutions" className="py-40">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading 
          badge="Core Capabilities"
          title="Engineered for Governance."
        />
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((f, i) => (
            <div key={i} className={`p-10 premium-glass group ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}>
               <div className="noise-overlay" />
               <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all">
                     <f.i className="h-7 w-7 text-blue-500 group-hover:text-white" />
                  </div>
                  <h3 className="text-xl font-black text-[var(--foreground)] mb-4 uppercase tracking-tighter leading-tight">{f.t}</h3>
                  <p className="text-[var(--muted)] text-sm font-medium leading-relaxed">{f.d}</p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SecuritySection = () => (
  <section id="security" className="py-24 relative scroll-mt-32 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      <SectionHeading 
        badge="Enterprise Security"
        title="Uncompromising Protection."
        subtitle="Moving beyond simple firewalls to deep semantic protection for every AI interaction."
      />
      
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="p-12 premium-glass !rounded-[3rem] border-blue-500/20 bg-blue-500/[0.02]">
          <div className="noise-overlay" />
          <div className="relative z-10">
            <ShieldAlert className="h-12 w-12 text-blue-500 mb-8" />
            <h3 className="text-3xl font-black text-[var(--foreground)] mb-6 uppercase tracking-tighter">Threat Neutralization</h3>
            <p className="text-[var(--muted)] text-lg font-medium leading-relaxed mb-8">
              Sentra AI's engine analyzes token streams in real-time, detecting and blocking malicious sequences before they reach your infrastructure.
            </p>
            <ul className="space-y-4">
              {[
                "Prompt Injection Prevention",
                "Malicious Intent Identification",
                "API Secret Leakage Protection",
                "DDoS Defense for AI Endpoints"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-400 uppercase tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            { 
              title: "Agent Sandbox", 
              desc: "Isolate autonomous agents in secure containers to prevent lateral movement.",
              icon: BoxSelect
            },
            { 
              title: "Behavioral Guard", 
              desc: "Monitor AI behavior for deviations from established security baselines.",
              icon: Activity
            },
            { 
              title: "Access Control", 
              desc: "Granular RBAC for model usage, ensuring only authorized agents call specific APIs.",
              icon: Key
            },
            { 
              title: "Encrypted Streams", 
              desc: "End-to-end encryption for all LLM communications and stored context data.",
              icon: Lock
            }
          ].map((item, i) => (
            <div key={i} className="p-8 premium-glass rounded-[2rem] group hover:border-blue-500/30 transition-all">
              <div className="h-10 w-10 rounded-xl bg-[var(--card)] border border-[var(--glass-border)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="text-lg font-black text-[var(--foreground)] mb-3 uppercase tracking-tighter">{item.title}</h4>
              <p className="text-xs font-medium text-[var(--muted)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const ComplianceSection = () => (
  <section id="compliance" className="py-24 bg-[var(--background)]/20 scroll-mt-32">
    <div className="max-w-7xl mx-auto px-6">
      <SectionHeading 
        badge="Regulatory Compliance"
        title="Trust, Built In."
        subtitle="Automatically stay compliant with global data regulations without slowing down innovation."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            title: "GDPR & HIPAA",
            desc: "Native support for European and Healthcare privacy standards with pre-built policy templates.",
            icon: ShieldCheck,
            color: "text-emerald-400"
          },
          {
            title: "Automated Audits",
            desc: "Every interaction is logged with immutable cryptographic signatures for total accountability.",
            icon: FileText,
            color: "text-blue-400"
          },
          {
            title: "PII Redaction",
            desc: "Instantly identify and mask personally identifiable information before it hits public LLMs.",
            icon: Eye,
            color: "text-purple-400"
          },
          {
            title: "DPDP Ready",
            desc: "Stay ahead of Asian data protection laws with specialized governance modules.",
            icon: Globe,
            color: "text-orange-400"
          }
        ].map((item, i) => (
          <div key={i} className="p-10 premium-glass flex flex-col items-center text-center group cursor-default">
            <div className={`h-16 w-16 rounded-[2rem] bg-[var(--card)] border border-[var(--glass-border)] flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform ${item.color}`}>
              <item.icon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-[var(--foreground)] mb-4 uppercase tracking-tighter">{item.title}</h3>
            <p className="text-sm font-medium text-[var(--muted)] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 p-12 premium-glass !rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <h3 className="text-3xl font-black text-[var(--foreground)] mb-6 uppercase tracking-tighter">Certifiable Governance</h3>
          <p className="text-[var(--muted)] text-lg font-medium leading-relaxed mb-8">
            Generate auditor-ready reports in seconds. Our platform maps your AI activities directly to compliance frameworks, reducing audit cycles from months to days.
          </p>
          <div className="flex flex-wrap gap-4">
            {['SOC2 Type II', 'ISO 27001', 'HIPAA', 'GDPR'].map(tag => (
              <span key={tag} className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1 w-full max-w-md p-8 bg-[var(--card)] rounded-2xl border border-[var(--glass-border)] font-mono text-[10px] shadow-2xl">
          <div className="flex justify-between mb-4 pb-2 border-b border-white/5">
            <span className="text-emerald-400">Compliance_Report_2026.pdf</span>
            <span className="text-slate-500 italic">Processing...</span>
          </div>
          <div className="space-y-3 opacity-60">
             <div className="flex justify-between"><span>[OK] PII Redaction Active</span><span className="text-emerald-500">99.9%</span></div>
             <div className="flex justify-between"><span>[OK] Data Sovereignty Logs</span><span className="text-emerald-500">SECURE</span></div>
             <div className="flex justify-between"><span>[OK] Policy Enforcement</span><span className="text-emerald-500">STRICT</span></div>
             <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-4">
                <motion.div 
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-full bg-emerald-500" 
                />
             </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const UseCases = () => (
  <section id="solutions" className="py-40 bg-[var(--background)]/40">
    <div className="max-w-7xl mx-auto px-6 text-center">
       <SectionHeading 
         badge="Use Cases"
         title="Proven Security Scenarios."
       />
       <div className="grid md:grid-cols-3 gap-10">
          {[
            { title: "Finance", desc: "Prevents AI from leaking sensitive customer financial data or private transaction history.", icon: Database },
            { title: "Healthcare", desc: "Blocks AI from accidentally sharing protected patient information (PHI) with external models.", icon: ShieldCheck },
            { title: "SaaS", desc: "Stops unauthorized or harmful API calls by autonomous AI agents in production environments.", icon: Globe }
          ].map((u, i) => (
            <div key={i} className="p-12 premium-glass text-left flex flex-col gap-6">
               <div className="noise-overlay" />
               <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center">
                  <u.icon className="h-7 w-7 text-indigo-400" />
               </div>
               <h3 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-tighter leading-none">{u.title}</h3>
               <p className="text-[var(--muted)] text-lg font-medium leading-relaxed">{u.desc}</p>
            </div>
          ))}
       </div>
    </div>
  </section>
);

const BeforeAfter = () => (
  <section id="solutions" className="pt-12 pb-24 relative scroll-mt-32">
    <div className="max-w-7xl mx-auto px-6">
       <SectionHeading 
         badge="Comparison"
         title="The Sentra Advantage."
       />
       <div className="grid md:grid-cols-2 gap-10">
          {/* Before */}
          <div className="premium-glass !rounded-[3rem] p-12 border-red-500/30 bg-red-500/[0.03] dark:bg-red-500/[0.05] flex flex-col gap-8">
             <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                   <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <h4 className="text-2xl font-black text-red-600 dark:text-red-500 uppercase tracking-tighter">Before Sentra</h4>
             </div>
             <div className="flex flex-col gap-6 p-8 rounded-3xl bg-white/5 dark:bg-black/20 border border-[var(--glass-border)] font-mono text-sm leading-relaxed shadow-xl">
                <p className="text-slate-500">// AI Agent executing task...</p>
                <p className="text-red-400 underline decoration-red-500/50">"Sending credit_card_digits: 4242-4242..."</p>
                <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-3">
                   <AlertTriangle className="h-4 w-4 text-red-500" />
                   <span className="text-[10px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest decoration-none">CRITICAL DATA LEAK</span>
                </div>
             </div>
          </div>
          {/* After */}
          <div className="premium-glass !rounded-[3rem] p-12 border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] flex flex-col gap-8">
             <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                   <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">After Sentra</h4>
             </div>
             <div className="flex flex-col gap-6 p-8 rounded-3xl bg-white/5 dark:bg-black/20 border border-[var(--glass-border)] font-mono text-sm leading-relaxed shadow-xl">
                <p className="text-slate-500">// Intercepted by Sentra...</p>
                <p className="text-emerald-400">"Policy Violation Found: Action Blocked"</p>
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-3">
                   <Lock className="h-4 w-4 text-emerald-400 dark:text-emerald-500" />
                   <span className="text-[10px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest">THREAT NEUTRALIZED</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  </section>
);

const Integration = () => (
  <section id="documentation" className="py-40 bg-[var(--background)]/60">
    <div className="max-w-7xl mx-auto px-6">
       <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
             <Badge className="mb-8">Connectivity</Badge>
             <h2 className="text-4xl md:text-5xl font-black text-[var(--foreground)] mb-10 leading-[1.1] uppercase">
                Works with your <br /> <span className="text-blue-500">existing AI stack.</span>
             </h2>
             <p className="text-[var(--muted)] text-xl mb-12 font-medium">
                Sentra AI integrates flawlessly with OpenAI, custom APIs, and decentralized AI agents with a single line of code.
             </p>
             <div className="flex flex-wrap gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
                <span className="text-xl font-black tracking-widest italic">OPENAI</span>
                <span className="text-xl font-black tracking-widest italic">ANTHROPIC</span>
                <span className="text-xl font-black tracking-widest italic">LLAMA</span>
                <span className="text-xl font-black tracking-widest italic">VIRTUALS</span>
             </div>
          </div>
          <div className="p-10 premium-glass bg-slate-950 shadow-2xl overflow-hidden font-mono text-sm border-white/5">
             <div className="flex gap-2 mb-6">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
             </div>
             <div className="space-y-2">
                <p><span className="text-purple-400">await</span> <span className="text-blue-400">sentra</span>.<span className="text-yellow-400">safeAction</span>(</p>
                <p className="pl-6">"<span className="text-emerald-400">send_email</span>",</p>
                <p className="pl-6"><span className="text-blue-400">()</span> <span className="text-purple-400">=&gt;</span> <span className="text-yellow-400">sendEmail</span>()</p>
                <p>);</p>
             </div>
          </div>
       </div>
    </div>
  </section>
);

const TrustSection = () => (
  <section className="py-40 border-y border-[var(--glass-border)]">
    <div className="max-w-7xl mx-auto px-6">
       <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {[
            { t: "Prevent Data Leaks", d: "Zero exposure of proprietary assets." },
            { t: "Reduce Risk", d: "Scale AI without legal liabilities." },
            { t: "Control Behavior", d: "Define the bounds of your agents." },
            { t: "Protect Reputation", d: "Build trust through safe innovation." }
          ].map(b => (
             <div key={b.t}>
                <h4 className="text-lg font-black text-[var(--foreground)] uppercase tracking-tighter mb-2">{b.t}</h4>
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest leading-relaxed">{b.d}</p>
             </div>
          ))}
       </div>
    </div>
  </section>
);

const CTA = () => {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleRequestDemo = async () => {
    setDemoLoading(true);
    await new Promise(res => setTimeout(res, 600));
    demoLogin();
    navigate('/app', { replace: true });
  };

  const handleGetStarted = () => {
    navigate('/login?signup=true');
  };

  return (
    <section className="py-40 relative">
       <div className="max-w-5xl mx-auto px-6 text-center bg-blue-600 rounded-[3rem] p-24 shadow-[0_0_100px_rgba(59,130,246,0.3)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <h2 className="text-5xl md:text-7xl font-black text-white mb-10 leading-[1.05] uppercase tracking-tighter">
              Start Securing your <br /> <span className="text-blue-200">AI Stack today.</span>
           </h2>
           <p className="text-blue-100/60 text-xl font-medium mb-12 max-w-2xl mx-auto">
              Deploy the world's most advanced AI Runtime Governance Infrastructure in minutes.
           </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <button
               onClick={handleRequestDemo}
               disabled={demoLoading}
               className="group relative h-16 px-12 w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-white text-blue-700 text-[11px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 hover:bg-blue-50 hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
             >
               {demoLoading ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 <PlayCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
               )}
               {demoLoading ? 'Launching...' : 'Deploy in Minutes'}
             </button>

             <button
               onClick={handleGetStarted}
               className="group h-16 px-12 w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl border-2 border-white/60 text-white text-[11px] font-black uppercase tracking-widest backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95"
             >
               <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
               Get Started
             </button>
          </div>
          <p className="mt-10 text-[9px] font-black uppercase text-blue-200 tracking-[0.2em]">SOC2 Ready • Zero Credit Card • sub-10ms Latency</p>
       </div>
    </section>
  );
};

const ContactSection = () => (
  <section className="py-32 relative overflow-hidden bg-[var(--background)]/30 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-6">
       <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
             <Badge className="mb-8">Get In Touch</Badge>
             <h2 className="text-4xl md:text-6xl font-black text-[var(--foreground)] mb-10 leading-[1.1] uppercase tracking-tighter">
                Let's secure your <br /> <span className="text-blue-500">AI Future.</span>
             </h2>
             <p className="text-[var(--muted)] text-xl mb-12 font-medium">
                Our team of security experts is ready to help you deploy safe, compliant, and powerful AI systems today.
             </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
             {[
               { icon: Mail, title: "Email Us", link: "mailto:hello@sentraai.com", val: "hello@sentraai.com" },
               { icon: Phone, title: "Call Us", link: "tel:+1234567890", val: "+1 (234) 567-890" },
               { icon: Linkedin, title: "LinkedIn", link: "https://linkedin.com/company/sentra-ai", val: "Sentra AI Official" },
               { icon: Instagram, title: "Instagram", link: "https://instagram.com/sentra.ai", val: "@sentra.ai" }
             ].map((contact, i) => (
               <a 
                 key={i} 
                 href={contact.link} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="p-8 premium-glass group hover:border-blue-500/30 transition-all text-center sm:text-left"
               >
                 <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6 mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                   <contact.icon className="h-6 w-6 text-blue-500" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest mb-1">{contact.title}</h4>
                 <p className="text-sm font-bold text-[var(--foreground)] break-all">{contact.val}</p>
               </a>
             ))}
          </div>
       </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-32 border-t border-[var(--glass-border)] bg-[var(--background)]/50 backdrop-blur-xl">
     <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center gap-8 mb-16">
           <Link to="/" className="group">
             <Logo size="lg" />
           </Link>
           <p className="text-[var(--muted)] max-w-sm text-sm font-medium italic">
             "The universal trust layer for the autonomous agent era."
           </p>
        </div>
        <div className="flex justify-center gap-12 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-12">
           {['Platform', 'Security', 'Compliance', 'Solutions', 'Documentation'].map(l => (
             <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-[var(--foreground)] transition-colors">{l}</a>
           ))}
        </div>
        <div className="pt-12 border-t border-[var(--glass-border)] flex flex-col md:flex-row justify-between items-center gap-8 text-[var(--muted)]">
           <p className="text-[9px] font-bold uppercase tracking-widest">© 2026 Sentra AI Technologies · Secure the future</p>
           <div className="flex items-center gap-8">
              <a href="https://linkedin.com/company/sentra-ai" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
                 <Linkedin className="h-6 w-6" />
              </a>
              <a href="https://instagram.com/sentra.ai" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors">
                 <Instagram className="h-6 w-6" />
              </a>
              <a href="mailto:hello@sentraai.com" className="hover:text-[var(--foreground)] transition-colors">
                 <Mail className="h-6 w-6" />
              </a>
           </div>
        </div>
     </div>
  </footer>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)] selection:bg-blue-500/30 font-sans relative">
      <AtmosphericBackground />
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemSection />
      <MetricsSection />
      <SimplifiedGuide />
      <MarketOpportunity />
      <FeaturesSection />
      <SecuritySection />
      <ComplianceSection />
      <ComparisonTable />
      <UseCases />
      <BeforeAfter />
      <Integration />
      <TrustSection />
      <CTA />
      <ContactSection />
      <Footer />
    </div>
  );
}
