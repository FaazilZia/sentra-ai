import { motion } from 'framer-motion';
import { Reveal } from '../ui/Reveal';
import { siteContent } from '../../lib/content';
import { Shield, Lock, Fingerprint, Code2, LineChart, CheckCircle2, Zap, Building2, Rocket, Activity, ArrowRight } from 'lucide-react';

export const HowItWorks = () => {
  return (
    <section className="pt-48 pb-32 bg-transparent relative z-10 overflow-visible scroll-mt-24" id="how-it-works" style={{ isolation: 'isolate' }}>
      <div className="container-wide">
        <Reveal>
          <div className="text-center mb-32 relative">
            <span className="text-[12px] font-black tracking-[0.4em] text-blue-600 uppercase mb-6 block">
              {siteContent.howItWorks.label}
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">{siteContent.howItWorks.heading}</h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-20 relative justify-center">
          <div className="hidden md:block absolute top-[80px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent -z-10" />
          
          {siteContent.howItWorks.steps.map((step, i) => (
            <Reveal key={step.title} delay={0.2 * i} yOffset={50}>
              <div className="relative group flex flex-col items-center text-center px-6">
                <div className="w-40 h-40 rounded-[3rem] glass-card flex items-center justify-center mb-12 relative z-10 transition-all duration-700 group-hover:scale-110 group-hover:shadow-[0_40px_80px_rgba(168,127,251,0.15)] bg-white/5 border-white/10 group-hover:border-blue-400 backdrop-blur-xl">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-[3rem]"></div>
                   {i === 0 ? <Code2 size={56} className="text-blue-400" /> : i === 1 ? <LineChart size={56} className="text-blue-300" /> : <Shield size={56} className="text-blue-500" />}
                   <div className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-base font-black shadow-xl border-4 border-[#020617] uppercase tracking-tighter">
                     0{i + 1}
                   </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-[280px] mx-auto text-base font-medium">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ProblemSolution = () => {
  const content = siteContent.problemSection;
  
  return (
    <section className="section-padding bg-transparent relative z-10 overflow-visible" style={{ isolation: 'isolate' }}>
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-32 items-center">
          <div className="space-y-16">
            <Reveal>
              <span className="text-[12px] font-black tracking-[0.4em] text-blue-600 uppercase mb-6 block">
                {content.label}
              </span>
              <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.95] mb-12">
                {content.heading}
              </h2>
            </Reveal>

            <div className="space-y-8">
              {content.problems.map((prob, i) => (
                <Reveal key={prob.title} delay={0.1 * i} yOffset={30}>
                  <div className="flex gap-8 p-10 rounded-3xl glass-card border-white/5 hover:border-blue-500/40 transition-all group bg-white/5 backdrop-blur-md">
                    <div className="shrink-0 w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-xl">
                      {i+1}
                    </div>
                    <div>
                      <h4 className="text-white font-black mb-3 flex items-center gap-3 transition-colors uppercase text-[16px] tracking-tight">{prob.title}</h4>
                      <p className="text-slate-400 text-base font-medium leading-relaxed">{prob.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={0.4} yOffset={60}>
            <div className="relative">
              <div className="absolute -inset-10 bg-blue-500/10 rounded-[4rem] blur-[120px] pointer-events-none"></div>
              <div className="relative glass-card bg-slate-900/60 p-16 border-white/10 shadow-[0_60px_100px_-20px_rgba(0,0,0,0.5)] overflow-visible backdrop-blur-2xl">
                 <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center mb-12 shadow-[0_25px_50px_rgba(168,127,251,0.3)]">
                    <Shield size={40} />
                 </div>
                 <h3 className="text-4xl font-black text-white mb-8 tracking-tighter leading-none uppercase">
                    {content.solution.title}
                 </h3>
                 <p className="text-slate-400 font-medium leading-relaxed text-xl mb-12">
                    {content.solution.desc}
                 </p>
                 
                 <div className="space-y-6 mb-12">
                    {["Deep visibility across 50+ LLMs", "Sub-millisecond latency guardrails", "Enterprise-wide compliance policy sync"].map(item => (
                      <div key={item} className="flex items-center gap-4 text-slate-300 font-bold text-lg tracking-tight">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                           <CheckCircle2 size={14} className="text-blue-400" />
                        </div>
                        {item}
                      </div>
                    ))}
                 </div>
                 
                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className="w-full py-6 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[14px] shadow-xl"
                 >
                    Secure Your Pipeline <Zap size={20} />
                 </motion.button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export const LivePreview = () => {
  return (
    <section className="section-padding bg-transparent relative z-10 overflow-visible" style={{ isolation: 'isolate' }}>
      <div className="container-wide">
        <Reveal>
          <div className="text-center mb-24">
            <span className="text-[12px] font-black tracking-[0.4em] text-blue-600 uppercase mb-6 block">
              Live System Preview
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Real-Time Risk Detection</h2>
          </div>
        </Reveal>

        <Reveal yOffset={80}>
          <div className="relative">
            <div className="absolute -inset-20 bg-blue-400/5 rounded-[6rem] blur-[150px] pointer-events-none" />
            <div className="relative glass-card bg-slate-950/40 p-3 border-white/5 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl">
               <div className="p-4 md:p-16 grid md:grid-cols-2 gap-16">
                  <div className="space-y-10">
                     <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-inner backdrop-blur-md">
                        <div className="flex items-center gap-4 mb-6 text-red-400">
                           <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                              <Shield size={20} />
                           </div>
                           <span className="text-sm font-black uppercase tracking-[0.2em]">Risk Intercepted</span>
                        </div>
                        <p className="font-mono text-base text-white p-6 bg-slate-900/50 rounded-2xl border border-white/10 shadow-sm leading-relaxed font-bold">
                           <span className="text-red-500 font-black mr-2 opacity-80"># ALERT</span> PII/CREDENTIAL_LEAK detected in response. Action: REJECTED
                        </p>
                     </div>
                     
                     <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 opacity-60 backdrop-blur-md">
                        <div className="flex items-center gap-4 mb-6 text-blue-400">
                           <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <Activity size={20} />
                           </div>
                           <span className="text-sm font-black uppercase tracking-[0.2em]">Monitoring Flow</span>
                        </div>
                        <p className="font-mono text-base text-slate-500 p-6 bg-slate-900/30 rounded-2xl border border-dashed border-white/10 font-bold italic">
                           Awaiting next inference pass...
                        </p>
                     </div>
                  </div>

                  <div className="flex flex-col h-full justify-center">
                     <div className="glass-card bg-white/5 p-10 border-white/10 h-full flex flex-col justify-end gap-6 shadow-inner backdrop-blur-xl">
                        <div className="flex justify-between items-end h-40 gap-3">
                        {[30, 45, 40, 65, 55, 50, 85, 75, 95, 80, 100, 85, 75, 65, 80, 75, 60, 45, 55, 40].map((h, i) => (
                          <motion.div 
                              key={i}
                              className="flex-1 bg-gradient-to-t from-blue-400/20 to-blue-600 rounded-full"
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 1.5, delay: i * 0.05, repeat: Infinity, repeatType: "reverse" }}
                          />
                        ))}
                        </div>
                        <div className="flex items-center justify-between pt-8 border-t border-white/10">
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Global Health</span>
                              <span className="text-2xl font-black text-white tracking-tighter">99.992% <span className="text-blue-400 text-sm font-black ml-1 uppercase">SAFE</span></span>
                           </div>
                           <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg">OK</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export const UseCases = () => {
  return (
    <section className="section-padding bg-transparent relative z-10 overflow-visible" id="use-cases" style={{ isolation: 'isolate' }}>
      <div className="container-wide">
        <Reveal>
          <div className="text-center mb-24">
            <span className="text-[12px] font-black tracking-[0.4em] text-blue-600 uppercase mb-6 block">
              {((siteContent as any).useCases || []).label}
            </span>
            <h2 className="text-5xl md:text-[6rem] font-black text-white tracking-tighter leading-none">{((siteContent as any).useCases || []).heading}</h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {((siteContent as any).useCases || []).items.map((item, i) => (
              <Reveal key={item.title} delay={0.1 * i} yOffset={40}>
                <div className="glass-card group p-12 bg-white/5 border-white/10 hover:border-blue-500/40 transition-all flex flex-col h-full shadow-sm hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-xl">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl -z-10" />
                   <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-12 shadow-lg group-hover:bg-blue-500 group-hover:-translate-y-2 transition-all">
                      {i === 0 ? <Building2 size={28} /> : i === 1 ? <Zap size={28} /> : <Rocket size={28} />}
                   </div>
                   <h3 className="text-2xl font-black text-white mb-6 tracking-tighter uppercase">{item.title}</h3>
                   <p className="text-slate-400 leading-relaxed font-medium mb-12 flex-grow text-lg">{item.desc}</p>
                   <div className="flex items-center gap-4 text-blue-400 text-[11px] font-black tracking-[0.3em] uppercase opacity-60 group-hover:opacity-100 transition-all">
                       VIEW IMPACT <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                   </div>
                </div>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  );
};

export const TrustSecurity = () => {
  return (
    <section className="py-40 bg-transparent relative z-10 overflow-visible" id="security" style={{ isolation: 'isolate' }}>
      <div className="container-wide">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-20">
            <Reveal delay={0.2} width="100%">
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">{siteContent.security.heading}</h2>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 justify-items-center max-w-4xl mx-auto">
               {siteContent.security.items.map((item: any, i: number) => (
                 <Reveal key={item.title} delay={0.1 * i} yOffset={30} width="fit-content">
                   <div className="flex flex-col items-center text-center p-12 glass-card bg-slate-900/80 border-white/10 hover:border-blue-500/50 hover:bg-slate-900 transition-all group shadow-2xl backdrop-blur-2xl w-full max-w-[400px] min-h-[400px]">
                      <div className="shrink-0 w-24 h-24 rounded-[2.5rem] bg-blue-600 flex items-center justify-center text-white mb-10 group-hover:scale-110 group-hover:shadow-[0_20px_40px_rgba(37,99,235,0.4)] transition-all shadow-lg">
                         {i === 0 ? <Fingerprint size={40} /> : i === 1 ? <Lock size={40} /> : <Shield size={40} />}
                      </div>
                      <div>
                         <h4 className="text-white font-black mb-6 text-2xl tracking-tighter uppercase">{item.title}</h4>
                         <p className="text-slate-200 text-lg leading-relaxed font-semibold opacity-90">{item.desc}</p>
                      </div>
                   </div>
                 </Reveal>
               ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
