import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Lock, Zap, BarChart3, ChevronRight, Check } from 'lucide-react';
import { MarketingNav } from '../components/layout/MarketingNav';
import { MarketingFooter } from '../components/layout/MarketingFooter';
import LightPillar from '../components/ui/LightPillar';
import { BorderGlow } from '../components/ui/BorderGlow';
import StarBorder from '../components/ui/StarBorder';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as any },
  },
};

export default function FeaturesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('threat');

  useEffect(() => {
    const sections = ['threat', 'observe', 'data', 'compliance', 'policy'];
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#0c1324] text-white font-inter antialiased min-h-screen">
      <MarketingNav />

      {/* Global Background Layer — CSS orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0c1324]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[#95d3ba] opacity-[0.05] blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full bg-[#3b82f6] opacity-[0.03] blur-[120px]" />
      </div>

      {/* Hero Light Pillar — low quality for smooth performance */}
      <div className="absolute top-0 inset-x-0 h-[700px] pointer-events-none z-0 overflow-hidden opacity-[0.35]">
        <LightPillar
          topColor="#95d3ba"
          bottomColor="#3b6e5a"
          intensity={2.5}
          rotationSpeed={0.15}
          glowAmount={0.006}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.3}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="low"
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-36 pb-16 min-h-[40vh]">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1e2536] px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.15em] text-[#95d3ba] font-bold">
          PLATFORM CAPABILITIES
        </div>
        <h1 className="max-w-[760px] text-[2.8rem] sm:text-[4rem] font-bold font-manrope tracking-[-0.03em] leading-[1.05] text-[#ffffff] mb-6">
          Every capability.<br/>One platform.
        </h1>
        <p className="max-w-[560px] text-[1.1rem] leading-relaxed text-slate-400 mb-10">
          Security and observability tools purpose-built for enterprise AI — from model inputs to compliance outputs.
        </p>
      </section>

      {/* Content Area with solid background mask */}
      <div className="relative z-10 bg-[#0c1324] w-full">
        {/* Sticky Tab Navigation */}
        <div className="sticky top-[68px] z-[100] bg-[#0c1324] border-b border-white/[0.05]">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-5 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { icon: Shield, id: 'threat', label: 'Threat Protection', color: '#95d3ba' },
            { icon: Eye, id: 'observe', label: 'Observability', color: '#38bdf8' },
            { icon: Lock, id: 'data', label: 'Data Governance', color: '#c084fc' },
            { icon: BarChart3, id: 'compliance', label: 'Compliance', color: '#fbbf24' },
            { icon: Zap, id: 'policy', label: 'Policy Engine', color: '#f87171' },
          ].map(({ icon: Icon, id, label, color }) => (
            <StarBorder
              as="a"
              key={id}
              href={`#${id}`}
              color={activeTab === id ? color : 'rgba(255,255,255,0.2)'}
              speed={activeTab === id ? "3s" : "6s"}
              thickness={2}
              className={`flex shrink-0 transition-all duration-500 ${
                activeTab === id ? 'scale-105 active-star' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-transform duration-300 ${activeTab === id ? 'scale-110' : ''}`} strokeWidth={2} style={{ color: activeTab === id ? color : 'inherit' }} />
                <span className={activeTab === id ? 'font-bold' : ''}>{label}</span>
              </div>
            </StarBorder>
          ))}
        </div>
      </div>

        {/* Feature Deep Dive Sections */}
        <div className="pb-24">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 space-y-32">
          
          {/* Section 01: Threat Protection */}
          <section id="threat" className="flex flex-col lg:flex-row items-center gap-16 scroll-mt-48 pt-16">
            <div className="flex-1 space-y-8 relative z-50">
              <div className="text-[#95d3ba] font-manrope text-5xl font-bold opacity-30">01</div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#151b2d] border border-white/10 px-3 py-1.5 text-[0.75rem] uppercase tracking-widest text-[#95d3ba] font-bold">Threat Protection</div>
              <h2 className="text-4xl sm:text-5xl font-bold font-manrope tracking-tight text-[#ffffff] leading-tight">Block threats before they execute.</h2>
              <p className="text-[#cbd5e1] text-[1.1rem] leading-relaxed max-w-[500px]">
                Sentra deploys an invisible perimeter around your AI workloads, detecting and dropping adversarial inputs with sub-50ms latency.
              </p>
              <ul className="space-y-5 pt-2">
                {['Prompt injection & jailbreak detection', 'Adversarial payload filtering', 'Real-time contextual threat intel'].map(b => (
                  <li key={b} className="flex items-center gap-3 text-[#f1f5f9] text-[1rem]">
                    <div className="flex w-6 h-6 items-center justify-center rounded-full bg-[#95d3ba]/20 text-[#95d3ba]"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                    {b}
                  </li>
                ))}
              </ul>
              <button className="text-[#95d3ba] flex items-center gap-1.5 text-[0.95rem] font-bold mt-6 hover:text-white transition-colors group">
                Learn more <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="flex-1 w-full relative">
               <BorderGlow
                 edgeSensitivity={23}
                 glowColor="40 80 80"
                 backgroundColor="#151b2d"
                 borderRadius={16}
                 glowRadius={40}
                 glowIntensity={1.4}
                 coneSpread={25}
                 animated={false}
                 colors={['#c084fc', '#f472b6', '#38bdf8']}
                 className="w-full shadow-2xl"
               >
                 <div className="p-8">
                   <div className="flex justify-between items-center mb-6">
                     <p className="text-[0.75rem] font-mono text-white/60 tracking-wider">LIVE_THREAT_FEED / wss://us-east</p>
                     <span className="flex h-2.5 w-2.5 rounded-full bg-[#95d3ba] animate-pulse" />
                   </div>
                   <div className="space-y-3">
                     {[
                       { t: 'DAN Jailbreak Variant', conf: '99%', act: 'BLOCKED' },
                       { t: 'Roleplay Exfiltration', conf: '94%', act: 'BLOCKED' },
                       { t: 'Base64 Encoded Injection', conf: '97%', act: 'BLOCKED' }
                     ].map(row => (
                       <div key={row.t} className="flex items-center justify-between bg-[#0c1324] rounded-lg p-3.5 border border-white/10">
                         <div className="flex items-center gap-3">
                           <Shield className="w-4.5 h-4.5 text-white/40" strokeWidth={1.5} />
                           <span className="text-[0.9rem] font-medium text-white">{row.t}</span>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="hidden sm:inline font-mono text-[0.75rem] text-white/60">conf: {row.conf}</span>
                           <span className="px-2.5 py-1 rounded text-[0.7rem] font-bold bg-[#95d3ba]/20 text-[#95d3ba] tracking-wider outline outline-1 outline-[#95d3ba]/30">{row.act}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </BorderGlow>
            </motion.div>
          </section>

          {/* Section 02: Observability */}
          <section id="observe" className="flex flex-col-reverse lg:flex-row items-center gap-16 scroll-mt-48 pt-10">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="flex-1 w-full relative group">
               <BorderGlow
                 edgeSensitivity={23}
                 glowColor="40 80 80"
                 backgroundColor="#151b2d"
                 borderRadius={16}
                 glowRadius={40}
                 glowIntensity={1.4}
                 coneSpread={25}
                 animated={false}
                 colors={['#c084fc', '#f472b6', '#38bdf8']}
                 className="w-full shadow-2xl"
               >
                 <div className="p-8">
                   <div className="flex justify-between items-center mb-6">
                     <p className="text-[0.75rem] font-mono text-white/60">TRACE_ID: req_8f72a9b</p>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-400 animate-heartbeat" />
                       <span className="text-[0.65rem] font-bold text-blue-400 tracking-widest uppercase">Live Trace</span>
                     </div>
                   </div>
                   <div className="relative pt-2 pb-6">
                     <div className="absolute left-[8px] top-6 bottom-0 w-px bg-white/10" />
                     {[
                       { name: 'Gateway Auth', dur: '12ms', width: '20%', color: 'bg-cyan-400' },
                       { name: 'Threat Scanner', dur: '45ms', width: '40%', color: 'bg-blue-400' },
                       { name: 'GPT-4 Inference', dur: '802ms', width: '90%', color: 'bg-indigo-400' }
                     ].map((t, i) => (
                       <motion.div key={t.name} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.3 }} className="flex items-center gap-4 mt-5 relative z-10 group/row">
                         <div className={`w-4 h-4 rounded-full border-4 border-[#151b2d] ${t.color} group-hover/row:scale-125 transition-transform`} />
                         <div className="flex-1">
                           <div className="flex justify-between text-[0.75rem] mb-1.5">
                             <span className="text-white/70 group-hover/row:text-white transition-colors">{t.name}</span>
                             <span className="font-mono text-white/50 group-hover/row:text-blue-300 transition-colors">{t.dur}</span>
                           </div>
                           <div className="h-2 rounded-full bg-[#0c1324] w-full overflow-hidden border border-white/5">
                             <motion.div className={`h-full rounded-full ${t.color} shadow-[0_0_10px_rgba(56,189,248,0.4)] relative overflow-hidden`} initial={{ width: 0 }} whileInView={{ width: t.width }} transition={{ duration: 1, delay: i * 0.2 + 0.5, ease: "circOut" }}>
                               <div className="absolute inset-0 animate-shimmer" />
                             </motion.div>
                           </div>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                   <div className="mt-4 pt-4 border-t border-white/5 flex gap-6">
                     <div>
                       <p className="text-[0.6rem] uppercase tracking-tighter text-white/40 mb-1">Latency</p>
                       <p className="text-sm font-bold text-white font-mono">42.8ms</p>
                     </div>
                     <div>
                       <p className="text-[0.6rem] uppercase tracking-tighter text-white/40 mb-1">Success Rate</p>
                       <p className="text-sm font-bold text-[#95d3ba] font-mono">99.98%</p>
                     </div>
                   </div>
                 </div>
               </BorderGlow>
            </motion.div>
            <div className="flex-1 space-y-8 relative z-50">
              <div className="text-blue-400 font-manrope text-5xl font-bold opacity-30">02</div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#151b2d] border border-white/10 px-3 py-1.5 text-[0.75rem] uppercase tracking-widest text-blue-400 font-bold">Observability</div>
              <h2 className="text-4xl sm:text-5xl font-bold font-manrope tracking-tight text-[#ffffff] leading-tight">See exactly what your models are doing.</h2>
              <p className="text-[#cbd5e1] text-[1.1rem] leading-relaxed max-w-[500px]">
                Capture full payload telemetry. Sentra provides token-level trace history and real-time latency breakdowns across all your deployments.
              </p>
              <ul className="space-y-5 pt-2">
                {['Token-level request/response tracing', 'Latency heatmaps by provider', 'Cost attribution logging'].map(b => (
                  <li key={b} className="flex items-center gap-3 text-[#f1f5f9] text-[1rem]">
                    <div className="flex w-6 h-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 03: Data Governance */}
          <section id="data" className="flex flex-col lg:flex-row items-center gap-16 scroll-mt-48 pt-10">
            <div className="flex-1 space-y-8 relative z-50">
              <div className="text-purple-400 font-manrope text-5xl font-bold opacity-30">03</div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#151b2d] border border-white/10 px-3 py-1.5 text-[0.75rem] uppercase tracking-widest text-purple-400 font-bold">Data Governance</div>
              <h2 className="text-4xl sm:text-5xl font-bold font-manrope tracking-tight text-[#ffffff] leading-tight">Protect sensitive data at the boundary.</h2>
              <p className="text-[#cbd5e1] text-[1.1rem] leading-relaxed max-w-[500px]">
                Automatically detect, mask, or redact PII, PHI, and sensitive corporate data before it ever reaches the model or the end user.
              </p>
              <ul className="space-y-5 pt-2">
                {['Real-time PII/PHI redaction', 'Custom regex data masking', 'Outbound data exfiltration prevention'].map(b => (
                  <li key={b} className="flex items-center gap-3 text-[#f1f5f9] text-[1rem]">
                    <div className="flex w-6 h-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="flex-1 w-full relative">
               <BorderGlow
                 edgeSensitivity={23}
                 glowColor="40 80 80"
                 backgroundColor="#151b2d"
                 borderRadius={16}
                 glowRadius={40}
                 glowIntensity={1.4}
                 coneSpread={25}
                 animated={false}
                 colors={['#c084fc', '#f472b6', '#38bdf8']}
                 className="w-full shadow-2xl"
               >
                 <div className="p-8">
                   <div className="flex justify-between items-center mb-4">
                     <p className="text-[0.75rem] font-mono text-white/60 tracking-wider">DATA_REDACTION / policy_eng_3</p>
                     <span className="flex items-center gap-1.5 text-[0.75rem] bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded font-bold border border-purple-500/30"><Lock className="w-3.5 h-3.5" /> SECURE</span>
                   </div>
                   <div className="space-y-4 font-mono text-[0.85rem]">
                     <div className="bg-[#0c1324] rounded-lg p-5 border border-white/10 space-y-2.5">
                       <p className="text-white/50 text-[0.7rem] uppercase tracking-widest font-bold">Original Payload</p>
                       <p className="text-slate-100 break-words leading-relaxed line-clamp-2">"Update the billing record for John Doe (SSN: 000-00-0000, Card: 4532...1023) to reflect the new premium tier."</p>
                     </div>
                     <div className="flex justify-center -my-2 relative z-10"><Zap className="w-6 h-6 text-white/40 animate-pulse" /></div>
                     <div className="bg-[#0c1324] rounded-lg p-5 border border-purple-500/30 space-y-2.5">
                       <p className="text-purple-400 text-[0.7rem] uppercase tracking-widest font-bold">Sanitized Payload</p>
                       <p className="text-white break-words leading-relaxed line-clamp-2">"Update the billing record for <span className="bg-purple-500/30 text-purple-200 px-1.5 rounded font-bold">[PERSON]</span> (SSN: <span className="bg-purple-500/30 text-purple-200 px-1.5 rounded font-bold">[REDACTED]</span>, Card: <span className="bg-purple-500/30 text-purple-200 px-1.5 rounded font-bold">[CREDIT_CARD]</span>) to reflect the new premium tier."</p>
                     </div>
                   </div>
                 </div>
               </BorderGlow>
            </motion.div>
          </section>

        </div>
      </div>

      {/* Compliance Automation Section */}
      <section id="compliance" className="border-y border-white/5 py-24 bg-[#0c1324] scroll-mt-48 relative z-10">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-16 relative z-50">
            <div className="text-[#95d3ba] font-manrope text-5xl font-bold opacity-30 mb-2">04</div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[#1e2536] border border-white/30 px-3 py-1.5 text-[0.75rem] uppercase tracking-widest text-[#95d3ba] font-bold">Compliance Automation</div>
            <h2 className="text-3xl sm:text-5xl font-bold font-manrope tracking-tight text-[#ffffff]">Audit-ready by default.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md mx-auto">
             {[
               { framework: 'DPDP', pct: 100 },
             ].map(({ framework, pct }) => (
              <motion.div key={framework} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
                <BorderGlow
                  edgeSensitivity={23}
                  glowColor="40 80 80"
                  backgroundColor="#151b2d"
                  borderRadius={16}
                  glowRadius={40}
                  glowIntensity={1.4}
                  coneSpread={25}
                  animated={false}
                  colors={['#c084fc', '#f472b6', '#38bdf8']}
                  className="flex flex-col items-center justify-center text-center gap-6 shadow-lg"
                >
                  <div className="flex flex-col items-center justify-center gap-6 p-8">
                    <div className="relative flex items-center justify-center w-24 h-24">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                        <path className="text-[#0c1324] stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#95d3ba] stroke-current" strokeDasharray={`${pct}, 100`} strokeLinecap="round" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute font-mono text-[1rem] font-bold text-white">{pct}%</span>
                    </div>
                    <span className="text-[1rem] font-bold text-[#95d3ba] tracking-wide">{framework}</span>
                  </div>
                </BorderGlow>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Engine Section */}
      <section id="policy" className="py-24 max-w-screen-xl mx-auto px-6 lg:px-10 scroll-mt-48 relative z-10 bg-[#0c1324]">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex-1 w-full relative">
             <BorderGlow
               edgeSensitivity={23}
               glowColor="40 80 80"
               backgroundColor="#151b2d"
               borderRadius={16}
               glowRadius={40}
               glowIntensity={1.4}
               coneSpread={25}
               animated={false}
               colors={['#c084fc', '#f472b6', '#38bdf8']}
               className="w-full shadow-2xl"
             >
               <div className="p-8">
                 <div className="flex gap-2 border-b border-white/10 pb-4 mb-4">
                   {['Global Rules', 'LLM Guardrails', 'Custom Hooks'].map((tab, i) => (
                     <div key={tab} className={`px-3 py-1.5 rounded text-[0.75rem] font-medium ${i===0 ? 'bg-white/10 text-white' : 'text-white/40'}`}>{tab}</div>
                   ))}
                 </div>
                 <div className="space-y-3">
                   {[
                     { rule: 'Block Competitor Mentions', act: 'REDACT', status: 'ACTIVE' },
                     { rule: 'Enforce JSON formatting', act: 'REJECT', status: 'ACTIVE' },
                     { rule: 'Tone & Toxicity Check', act: 'FLAG', status: 'WARN' }
                   ].map((r, i) => (
                     <div key={r.rule} className="flex items-center justify-between bg-[#0c1324] rounded-lg p-3 border border-white/5">
                       <div>
                         <div className="text-[0.8rem] font-medium text-white/90 mb-1">{r.rule}</div>
                         <div className="text-[0.65rem] text-white/40 font-mono">Condition: Output match</div>
                       </div>
                       <div className="flex flex-col items-end gap-1.5">
                         <span className={`px-2 py-0.5 rounded text-[0.6rem] font-bold tracking-wider ${i===2 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-rose-500/10 text-rose-400'}`}>{r.act}</span>
                         <span className="text-[0.6rem] text-white/30">{r.status}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </BorderGlow>
          </motion.div>
          <div className="flex-1 space-y-6 relative z-50">
            <div className="text-yellow-500 font-manrope text-5xl font-bold opacity-30">05</div>
            <div className="inline-flex items-center gap-2 rounded-md bg-[#1e2536] border border-white/30 px-3 py-1.5 text-[0.75rem] uppercase tracking-widest text-yellow-500 font-bold">Policy Engine</div>
            <h2 className="text-3xl sm:text-5xl font-bold font-manrope tracking-tight text-[#ffffff]">Your rules. Enforced everywhere.</h2>
            <p className="text-[#cbd5e1] text-[1.1rem] leading-relaxed max-w-[480px]">
              Deploy highly specific guardrails without writing a line of application code. Control tone, format, and content instantaneously.
            </p>
            <ul className="space-y-4 pt-2">
              {['No-code rule builder', 'Regex, keyword, and semantic matching', 'Per-model or global policy application'].map(b => (
                <li key={b} className="flex items-center gap-3 text-[#ffffff] text-[1rem] font-medium">
                  <div className="flex w-6 h-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-500 shrink-0"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 max-w-screen-md mx-auto px-6 relative z-10 bg-[#0c1324]">
        <div className="relative z-50">
          <h2 className="text-3xl font-bold font-manrope tracking-tight text-center mb-12 text-[#ffffff]">How Sentra compares.</h2>
          <div className="w-full border border-white/10 rounded-2xl overflow-hidden bg-[#151b2d]/50 backdrop-blur-sm">
            <div className="grid grid-cols-4 font-mono text-[0.7rem] uppercase tracking-widest text-white/40 border-b border-white/10 p-5">
              <div className="col-span-2">Capability</div>
              <div className="text-center text-[#95d3ba] font-bold">Sentra AI</div>
              <div className="text-center text-white/20">AWS Bedrock</div>
            </div>
             {[
               'Inline Context Scanning', 'Multi-Provider Traceability', '0-Day Jailbreak Defense', 'Fully Managed Policies', 'DPDP Reporting Dashboard'
             ].map((cap, i) => (
              <div key={i} className="grid grid-cols-4 items-center p-5 border-b border-white/5 last:border-0 text-[0.85rem]">
                <div className="col-span-2 text-[#cbd5e1] font-medium">{cap}</div>
                <div className="text-center text-[#95d3ba] flex justify-center"><Check className="w-5 h-5" /></div>
                <div className="text-center text-white/20 font-mono text-[0.8rem]">Partial</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA & Footer */}
      <section className="relative z-10 py-32 border-t border-white/[0.05] px-6 text-center bg-[#0c1324]">
        <h2 className="text-[2.5rem] sm:text-[4rem] font-bold tracking-[-0.03em] font-manrope text-[#ffffff] mb-6 relative z-50">
          Ready to see it in action?
        </h2>
        <p className="text-[#94a3b8] text-[1.1rem] mb-10 max-w-[460px] mx-auto relative z-50">
          Explore Sentra AI with a personalized product walkthrough.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-50">
          <button onClick={() => navigate('/login')} className="rounded-full bg-[#c6c6c7] text-[#2f3131] px-8 py-3.5 text-[0.95rem] font-bold hover:bg-white transition-all w-full sm:w-auto active:scale-95">
            Book a demo
          </button>
          <button className="rounded-full border border-white/10 text-[#ffffff]/60 px-8 py-3.5 text-[0.95rem] font-semibold hover:bg-[#151b2d] hover:text-white transition-all w-full sm:w-auto">
            Start free trial
          </button>
        </div>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
