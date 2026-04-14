import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Lock, Zap, ArrowRight, Activity, ChevronRight, AlertTriangle, CheckCircle, BarChart3, Globe, Database } from 'lucide-react';
import { MarketingNav } from '../components/layout/MarketingNav';
import { MarketingFooter } from '../components/layout/MarketingFooter';

/* ─────────────────── fade-up variant ─────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: d },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();

  /* Typing effect for hero badge */
  const words = ['Secure', 'Observe', 'Govern', 'Protect'];
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIndex(i => (i + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative bg-[#0c1324] text-white font-inter antialiased overflow-x-hidden min-h-screen">
      
      <MarketingNav />

      {/* ═══════════════════════════════════════════
          GLOBAL BACKGROUND
      ═══════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#0c1324]" />
        {/* Soft mint orb */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#95d3ba] opacity-[0.06] blur-[160px] animate-slow-float" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#0c1324_90%)]" />
        {/* Noise */}
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
        />
      </div>

      {/* ═══════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-16">
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/5 bg-[#151b2d] px-4 py-1.5 text-[0.78rem] tracking-wide text-white/60"
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#95d3ba] animate-pulse" />
          <span className="text-[#c6c6c7] font-medium mr-0.5 transition-all duration-500">{words[wordIndex]}</span>
          enterprise AI infrastructure
        </motion.div>

        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
          className="max-w-[820px] text-[3rem] sm:text-[4.5rem] lg:text-[6rem] font-bold font-manrope tracking-[-0.03em] leading-[0.98] text-white mb-7"
        >
          The control plane<br />
          <span className="text-white/35">for AI security.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
          className="max-w-[520px] text-[1.1rem] leading-relaxed text-[#c6c6c7]/80 mb-10 font-inter"
        >
          Sentra AI gives your team unified observability, automated compliance, and real-time threat protection — built for production-grade AI systems.
        </motion.p>

        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <button
            onClick={() => navigate('/login')}
            className="group flex items-center gap-2 rounded-full bg-[#c6c6c7] text-[#2f3131] px-7 py-3.5 text-[0.95rem] font-bold hover:bg-white transition-all w-full sm:w-auto justify-center active:scale-95"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-white/10 text-white/70 px-7 py-3.5 text-[0.95rem] font-semibold hover:bg-white/[0.04] hover:text-white transition-all w-full sm:w-auto justify-center">
            Request a demo
          </button>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={0.55}
          className="relative w-full max-w-[1100px] mt-24"
        >
          <div className="absolute -inset-x-10 top-0 bottom-0 bg-[#95d3ba]/5 blur-[80px] -z-10 rounded-full" />
          <div className="rounded-2xl border border-white/10 bg-[#151b2d]/80 backdrop-blur-sm shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#151b2d]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex items-center gap-2 text-[0.72rem] text-white/30 font-mono">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#95d3ba]" />
                sentra.live / dashboard
              </div>
              <div className="w-16" />
            </div>

            {/* Dashboard body */}
            <div className="p-6 grid grid-cols-12 gap-5 text-left">
              {/* Sidebar */}
              <div className="col-span-2 hidden md:flex flex-col gap-3 font-inter">
                {[Activity, Shield, Eye, BarChart3, Database, Globe].map((Icon, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[0.78rem] font-medium ${i === 0 ? 'bg-white/5 text-white' : 'text-white/30 hover:text-white/60'} cursor-default transition-colors`}>
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    {['Overview', 'Threats', 'Observe', 'Reports', 'Data', 'Network'][i]}
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div className="col-span-12 md:col-span-7 space-y-5 font-inter">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Threats Blocked', val: '1,842', color: 'text-[#95d3ba]' },
                    { label: 'Avg Response', val: '38ms', color: 'text-blue-400' },
                    { label: 'Risk Score', val: '2.4 / 10', color: 'text-white' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-xl bg-[#0c1324] border border-white/5 p-4 shadow-inner">
                      <p className="text-white/40 text-[0.72rem] mb-1.5 font-medium">{label}</p>
                      <p className={`font-semibold text-[1.1rem] tracking-tight ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="rounded-xl bg-[#0c1324] border border-white/5 p-5 h-44 relative overflow-hidden shadow-inner">
                  <p className="text-white/40 text-[0.75rem] mb-4 font-medium">Threat activity · last 30 days</p>
                  <svg className="absolute bottom-5 left-5 right-5 h-20 w-[calc(100%-2.5rem)]" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#95d3ba" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#95d3ba" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,55 L20,45 L40,50 L60,30 L80,35 L100,20 L120,28 L140,15 L160,22 L180,10 L200,18" fill="none" stroke="#95d3ba" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <path d="M0,55 L20,45 L40,50 L60,30 L80,35 L100,20 L120,28 L140,15 L160,22 L180,10 L200,18 L200,60 L0,60 Z" fill="url(#gLine)" />
                  </svg>
                </div>
                {/* Alert list */}
                <div className="rounded-xl bg-[#0c1324] border border-white/5 divide-y divide-white/5 shadow-inner">
                  {[
                    { icon: AlertTriangle, label: 'Prompt injection attempt blocked', time: '2s ago', color: 'text-amber-400' },
                    { icon: CheckCircle, label: 'PII automatically redacted', time: '18s ago', color: 'text-[#95d3ba]' },
                    { icon: Shield, label: 'Policy gate enforced on output', time: '1m ago', color: 'text-blue-400' },
                  ].map(({ icon: Icon, label, time, color }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} strokeWidth={2} />
                      <span className="text-white/60 text-[0.78rem] flex-1 font-medium">{label}</span>
                      <span className="text-white/30 text-[0.7rem] font-mono">{time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className="col-span-12 md:col-span-3 space-y-5 font-inter">
                <div className="rounded-xl bg-[#0c1324] border border-white/5 p-5 space-y-4 shadow-inner">
                  <p className="text-white/40 text-[0.75rem] font-medium">Compliance status</p>
                   {[
                     { name: 'DPDP', pct: 100 },
                   ].map(({ name, pct }) => (
                    <div key={name}>
                      <div className="flex justify-between text-[0.7rem] mb-1.5 text-white/50 font-medium">
                        <span>{name}</span><span className="text-[#95d3ba]">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-[#95d3ba]/80" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-[#0c1324] border border-white/5 p-5 space-y-3 shadow-inner">
                  <p className="text-white/40 text-[0.75rem] mb-3 font-medium">Active models</p>
                  {['GPT-4o', 'Claude 3.5', 'Llama 3.1'].map(m => (
                    <div key={m} className="flex items-center gap-2.5 text-[0.75rem] text-white/60 font-medium">
                      <span className="flex h-2 w-2 rounded-full bg-[#95d3ba]/60" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>


       {/* ═══════════════════════════════════════════
           PLATFORM SECTION
       ═══════════════════════════════════════════ */}
       <section id="platform" className="relative z-10 py-32 px-6">
        <div className="max-w-screen-xl mx-auto lg:px-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="mb-4 inline-flex items-center rounded-sm bg-[#151b2d] border border-white/5 px-3 py-1 text-[0.73rem] text-[#95d3ba] uppercase tracking-widest font-semibold">
              Platform Features
            </div>
            <h2 className="text-[2.6rem] sm:text-[3.8rem] font-bold font-manrope tracking-tight leading-[1.05] text-white max-w-[640px] mb-6">
              Every layer of AI security.<br />One platform.
            </h2>
            <p className="text-white/50 font-inter text-[1.1rem] max-w-[500px] mb-20 leading-relaxed">
              From inference-time threat blocking to post-deployment compliance auditing — Sentra covers every surface.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-inter">
            {[
              {
                icon: Shield,
                title: 'Threat Intelligence',
                desc: 'Real-time detection of prompt injections, jailbreaks, and adversarial inputs with sub-50ms response times.',
                wide: false,
                accent: 'border-[#95d3ba]/20',
              },
              {
                icon: Eye,
                title: 'Full-Spectrum Observability',
                desc: 'Capture every token, trace every decision, and audit complete inference histories across all deployed models.',
                wide: false,
                accent: '',
              },
              {
                icon: Lock,
                title: 'Data Governance & PII',
                desc: 'Automatic detection and redaction of PII, PHI, and sensitive data at the model boundary — before any output reaches users.',
                wide: false,
                accent: '',
              },
              {
                icon: BarChart3,
                title: 'Compliance Automation',
                desc: 'Auto-generate audit reports for SOC 2, ISO 27001, HIPAA, and GDPR. Continuous control monitoring with real-time dashboards.',
                wide: true,
                accent: 'border-white/10',
              },
              {
                icon: Zap,
                title: 'Policy Enforcement Engine',
                desc: 'Define and enforce organizational rules across any LLM. Block, redact, or flag outputs that violate policy without overhead.',
                wide: false,
                accent: '',
              },
            ].map(({ icon: Icon, title, desc, wide, accent }) => (
              <motion.div
                key={title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`group relative rounded-2xl border ${accent || 'border-white/5'} bg-[#151b2d] p-8 flex flex-col gap-4 cursor-default transition-all duration-300 hover:shadow-2xl hover:border-white/20 ${wide ? 'md:col-span-2' : ''}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#0c1324] text-[#95d3ba] transition-colors">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[1.1rem] font-bold text-white mb-2">{title}</h3>
                  <p className="text-[0.95rem] text-white/50 leading-relaxed">{desc}</p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-1.5 text-[#95d3ba] font-semibold text-[0.88rem] opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
         </div>
       </section>

{/* ═══════════════════════════════════════════
           HOW IT WORKS (Vertical Flow)
       ═══════════════════════════════════════════ */}
      <section className="relative z-10 py-32 border-t border-white/5 px-6">
        <div className="max-w-screen-xl mx-auto lg:px-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-24 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <div className="mb-4 inline-flex items-center rounded-sm bg-[#151b2d] border border-white/5 px-3 py-1 text-[0.73rem] text-[#95d3ba] uppercase tracking-widest font-semibold">Deployment</div>
              <h2 className="text-[2.6rem] sm:text-[3.8rem] font-bold font-manrope tracking-tight leading-[1.05] text-white max-w-[480px]">
                Up in minutes.<br/><span className="text-white/40">Secured for years.</span>
              </h2>
            </div>
            <p className="text-white/50 font-inter text-[1.1rem] max-w-[400px] leading-relaxed">
              No infrastructure changes. No re-training. Drop Sentra into your existing stack with a single API layer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
            {[
              { step: '01', title: 'Connect your models', desc: 'Integrate via our lightweight SDK or proxy. Works with any LLM provider.' },
              { step: '02', title: 'Configure your policies', desc: 'Set threat thresholds, compliance rules, and governance policies easily.' },
              { step: '03', title: 'Ship with confidence', desc: 'Sentra runs silently in the background — monitoring and protecting every inference.' },
            ].map(({ step, title, desc }) => (
              <motion.div key={step} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col gap-5 group border-l-2 border-white/10 pl-6 hover:border-[#95d3ba] transition-colors duration-500">
                <div className="text-[1.2rem] font-manrope font-bold text-[#95d3ba]">{step}</div>
                <h3 className="text-[1.2rem] font-bold text-white">{title}</h3>
                <p className="text-[0.95rem] font-inter text-white/50 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA
      ═══════════════════════════════════════════ */}
      <section className="relative z-10 py-36 border-t border-white/5 px-6 bg-[radial-gradient(ellipse_at_top,transparent_0%,#0c1324_90%)]">
        <div className="max-w-[720px] mx-auto text-center relative">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-[3rem] sm:text-[4.5rem] font-bold font-manrope tracking-tight leading-[1.0] text-white mb-6">
            Secure your AI.<br /><span className="text-white/40">Starting today.</span>
          </motion.h2>
          <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} className="text-[#c6c6c7]/70 font-inter text-[1.1rem] mb-10 max-w-[480px] mx-auto">
            Join the teams that trust Sentra to protect their AI products in production, every day.
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')} className="rounded-full bg-[#c6c6c7] text-[#2f3131] px-8 py-4 text-[0.95rem] font-bold hover:bg-white transition-all active:scale-95">
              Start free trial
            </button>
            <button className="rounded-full border border-white/10 text-white/70 bg-[#151b2d] px-8 py-4 text-[0.95rem] font-semibold hover:bg-white/5 hover:text-white transition-all">
              Talk to sales
            </button>
          </motion.div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
