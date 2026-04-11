import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Reveal } from '../ui/Reveal';
import { siteContent } from '../../lib/content';
import { ArrowRight, Play, Menu, X, Lock, Sun, Moon } from 'lucide-react';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <nav className={`fixed top-0 w-full transition-all duration-500 ease-premium ${isScrolled ? 'bg-white/40 backdrop-blur-2xl border-b border-blue-500/5 shadow-sm' : 'bg-transparent pt-6'}`} style={{ zIndex: 1000 }}>
      <div className={`container-wide flex items-center justify-between transition-all duration-500 ${isScrolled ? 'h-16' : 'h-20'}`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)]"
          >
            S
          </motion.div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{siteContent.nav.logo}</span>
        </div>
        
        <div className="hidden md:flex items-center gap-1 px-1.5 py-1.5 rounded-full bg-white/40 border border-white/60 backdrop-blur-xl shadow-sm">
          {siteContent.nav.links.map(link => (
            <motion.a 
              key={link.label} 
              href={link.href} 
              whileHover={{ backgroundColor: 'rgba(37, 99, 235, 0.05)', color: '#2563eb' }}
              className="px-6 py-2 rounded-full text-[13px] font-bold text-slate-600 transition-all duration-300"
            >
              {link.label}
            </motion.a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm text-slate-600 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
          <a href="/app" className="text-[13px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors px-4 uppercase tracking-widest">Sign In</a>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-blue-600 text-white font-black text-[13px] px-8 py-3 rounded-full transition-all shadow-[0_10px_25px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_35px_rgba(37,99,235,0.3)] uppercase tracking-widest"
          >
            {siteContent.hero.ctas.primary}
          </motion.button>
        </div>

        <button className="md:hidden text-slate-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <motion.div 
        initial={false}
        animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden bg-white/95 backdrop-blur-xl border-b border-blue-50/50 overflow-hidden px-6"
      >
        <div className="py-8 flex flex-col gap-4">
          {siteContent.nav.links.map(link => (
            <a key={link.label} href={link.href} className="text-lg font-bold text-slate-900 py-2">{link.label}</a>
          ))}
          <div className="h-px bg-blue-50 my-4" />
          <button className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest">{siteContent.hero.ctas.primary}</button>
        </div>
      </motion.div>
    </nav>
  );
};

const LiveLogStream = () => {
  const [logs, setLogs] = useState([
    { id: 1, t: "10:42:01", msg: "Prompt Refused (PII)", status: "text-red-400" },
    { id: 2, t: "10:41:59", msg: "Trace Complete", status: "text-cyan-400" },
    { id: 3, t: "10:41:55", msg: "Token Limit Warning", status: "text-orange-400" },
    { id: 4, t: "10:41:40", msg: "Trace Complete", status: "text-cyan-400" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = {
          id: Date.now(),
          t: new Date().toLocaleTimeString([], { hour12: false }),
          msg: Math.random() > 0.7 ? "Security Violation Blocked" : "Trace Indexed Successfully",
          status: Math.random() > 0.7 ? "text-red-400" : "text-cyan-400"
        };
        return [newLog, ...prev.slice(0, 3)];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 font-mono text-[10px] md:text-sm">
      {logs.map(log => (
        <motion.div 
          key={log.id} 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 bg-slate-100 p-2 rounded border border-slate-200"
        >
          <span className="text-slate-400">{log.t}</span>
          <span className={`${log.status.replace('cyan', 'blue')} font-medium`}>{log.msg}</span>
        </motion.div>
      ))}
    </div>
  );
};

export const Hero = () => {
  return (
    <section className="relative pt-48 pb-20 md:pt-64 md:pb-32 overflow-visible flex flex-col items-center min-h-screen" style={{ isolation: 'isolate' }}>
      {/* Immersive Mesh Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-screen opacity-40 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
      
      <div className="container-wide text-center relative z-10 w-full mb-24 px-4">
        <Reveal delay={0.1}>
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-card border-blue-100 bg-blue-50/30 text-blue-600 text-[11px] font-black mb-10 tracking-[0.2em] uppercase shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
            {siteContent.hero.badgeText}
          </div>
        </Reveal>
        
        <Reveal delay={0.2} yOffset={60}>
          <h1 className="text-6xl md:text-[7rem] font-black text-slate-900 tracking-tighter leading-[0.95] mb-10 max-w-6xl mx-auto">
            Control. <span className="opacity-20">Secure.</span><br/>
            <span className="text-gradient-blue italic font-black">
              Observe Your AI.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.3}>
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            The intelligent safety layer for production LLMs. Unified observability, real-time risk detection, and automated guardrails.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto bg-blue-600 text-white font-black px-12 py-6 rounded-2xl transition-all shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:shadow-[0_25px_70px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
            >
              {siteContent.cta.primary} <ArrowRight size={20} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              className="w-full sm:w-auto glass-card flex items-center justify-center gap-3 px-12 py-6 text-slate-900 font-bold hover:bg-white transition-all text-lg border-blue-100 uppercase tracking-widest"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white"><Play size={16} fill="currentColor" /></div> {siteContent.cta.secondary}
            </motion.button>
          </div>
        </Reveal>
      </div>

      {/* Hero High-Fidelity UI Mockup with Live Simulations */}
      <Reveal delay={0.6} width="100%" yOffset={80}>
        <div className="container-wide relative mt-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl blur-2xl opacity-20 pointer-events-none"></div>
          <div className="relative glass-card p-1 shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] border-white/20">
            {/* Fake UI ToolBar */}
            <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-4 bg-slate-50">
              <div className="flex gap-1.5 border-r border-slate-200 pr-4">
                <div className="w-3 h-3 rounded-full bg-red-400/40"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400/40"></div>
                <div className="w-3 h-3 rounded-full bg-green-400/40"></div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white border border-slate-200 rounded px-4 py-1 flex items-center gap-2 text-[10px] text-slate-500 font-mono shadow-sm">
                  <Lock size={10} className="text-blue-600" />
                  sentra-observability-cluster-01.io
                </div>
              </div>
            </div>

            {/* Fake Dashboard Body with Pulsing Charts */}
            <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 h-full bg-white">
              <div className="md:col-span-3 space-y-6">
                <div className="h-full max-h-[180px] md:max-h-[280px] w-full rounded-2xl bg-slate-50 border border-slate-100 flex items-end px-6 py-4 gap-2 relative overflow-hidden group">
                  <div className="absolute top-4 left-6 flex items-center gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Inference Latency</div>
                      <div className="text-xl font-black text-slate-900 flex items-baseline gap-1">24.2<span className="text-xs text-blue-600">ms</span></div>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Safety Index</div>
                      <div className="text-xl font-black text-blue-700">99.8%</div>
                    </div>
                  </div>
                  {[40, 70, 45, 90, 65, 80, 50, 100, 75, 60, 85, 55, 95, 70, 40, 100, 80, 60, 40, 90].map((height, i) => (
                    <motion.div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-blue-400/20 to-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.15)] rounded-t-[2px]"
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="glass-card p-5 space-y-4 bg-white border-slate-200 flex flex-col shadow-inner">
                  <h4 className="text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div> Guardian Feed
                    </span>
                    <span className="opacity-50 font-mono">LIVE</span>
                  </h4>
                  <div className="flex-1 overflow-hidden">
                    <LiveLogStream />
                  </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

const FeatureCard = ({ feature, index }: { feature: any, index: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Reveal delay={0.1 * index} yOffset={50}>
      <motion.div
        className="relative group h-full"
        style={{ perspective: 1000, rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative h-full glass-card bg-white p-10 flex flex-col group-hover:border-blue-400 group-hover:shadow-[0_40px_80px_-15px_rgba(37,99,235,0.15)] transition-all duration-700">
           {/* Moving Aura Glow */}
           <motion.div 
             className="absolute -inset-20 opacity-0 group-hover:opacity-40 transition-opacity bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)] -z-10" 
             style={{
               left: useTransform(mouseXSpring, [-0.5, 0.5], ["-30%", "10%"]),
               top: useTransform(mouseYSpring, [-0.5, 0.5], ["-30%", "10%"]),
             }}
           />
           
           <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm">
             <feature.icon size={32} />
           </div>
           
           <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tighter uppercase">{feature.title}</h3>
           <p className="text-slate-500 leading-relaxed text-base flex-grow font-medium">{feature.description}</p>
           
           <div className="mt-12 flex items-center text-[10px] font-black text-blue-600 transition-all gap-2 tracking-[0.3em] uppercase opacity-40 group-hover:opacity-100">
              EXPLORE PROTOCOL <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
           </div>
        </div>
      </motion.div>
    </Reveal>
  );
};

export const FeatureGrid = () => {
  return (
    <section className="section-padding bg-transparent relative overflow-visible" id="product" style={{ isolation: 'isolate' }}>
      <div className="container-wide relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
        
        <Reveal>
          <div className="text-center mb-20 relative z-10">
            <div className="glass-card mx-auto max-w-fit px-8 py-4 !rounded-full border-blue-100 mb-8 bg-blue-50/50">
              <span className="text-[12px] font-black tracking-[0.3em] text-blue-600 uppercase drop-shadow-sm">
                {siteContent.features.label}
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6">{siteContent.features.heading}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
              Our comprehensive suite of protective tools sits between your logic and the model, ensuring every interaction is verified.
            </p>
          </div>
        </Reveal>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {siteContent.features.items.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export const CtaBanner = () => {
  return (
    <section className="section-padding bg-transparent relative z-10 py-32">
      <div className="container-wide">
        <Reveal>
          <div className="glass-card !border-white/20 p-12 md:p-24 text-center relative overflow-visible group bg-gradient-to-br from-blue-700 to-blue-900 shadow-[0_40px_100px_-20px_rgba(30,58,138,0.3)] min-h-[400px] flex flex-col items-center justify-center" style={{ isolation: 'isolate' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />
            <h2 className="text-6xl md:text-[5rem] font-black text-white mb-10 tracking-tighter relative z-10">{siteContent.cta.heading}</h2>
            <p className="text-xl md:text-2xl text-blue-100/80 font-medium leading-relaxed max-w-2xl mx-auto mb-16 relative z-10">{siteContent.cta.subheading}</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 relative z-10">
              <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-blue-900 font-black px-14 py-6 rounded-2xl transition-all duration-300 shadow-2xl hover:scale-105 text-xl flex items-center gap-3 uppercase tracking-tighter">
                {siteContent.cta.primary} <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 pt-32 pb-16 relative z-10 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="container-wide">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-20 mb-32">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white shadow-xl text-2xl">S</div>
              <span className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{siteContent.nav.logo}</span>
            </div>
            <p className="text-slate-500 max-w-sm mb-12 leading-relaxed text-lg font-medium">
              Join the future of safe and observable AI development. 
              {siteContent.footer.description}
            </p>
            <div className="flex gap-4">
               {[1, 2, 3].map(i => (
                 <motion.div 
                   key={i} 
                   whileHover={{ scale: 1.1, backgroundColor: '#2563eb', color: '#fff' }}
                   className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 cursor-pointer transition-all shadow-sm"
                 >
                    <div className="w-5 h-5 bg-current rounded-sm"></div>
                 </motion.div>
               ))}
            </div>
          </div>
          {siteContent.footer.columns.map(col => (
            <div key={col.title}>
              <h4 className="font-black text-slate-900 mb-10 uppercase tracking-[0.3em] text-[11px]">{col.title}</h4>
              <ul className="space-y-5">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors font-bold text-[15px]">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
          <p>{siteContent.footer.copyright}</p>
          <div className="flex gap-12">
             <a href="#" className="hover:text-blue-600 transition-all">Privacy Policy</a>
             <a href="#" className="hover:text-blue-600 transition-all">Terms of Service</a>
             <a href="#" className="hover:text-blue-600 transition-all">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
