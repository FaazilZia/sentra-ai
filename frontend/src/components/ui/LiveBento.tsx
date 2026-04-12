import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

const BentoCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const background = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(13, 148, 136, 0.1),
      transparent 80%
    )
  `;

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10 p-8 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};

export const LiveBento = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 scroll-mt-24" id="product">
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
          Guardrails without the friction.
        </h2>
        <p className="text-xl text-slate-600">
          We combined enterprise-grade security with a developer-first experience. Interact with the core modules below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
        
        {/* Large Main Card */}
        <BentoCard className="md:col-span-2 md:row-span-2">
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Real-time Prompt Injection Shield</h3>
              <p className="text-slate-500 max-w-md">Our neural layer intercepts malicious inputs before they ever reach your LLM billing account.</p>
            </div>
            
            {/* Live interaction mockup */}
            <div className="w-full h-48 bg-slate-50 rounded-2xl border border-slate-100 p-4 mt-6 flex overflow-hidden relative">
              {/* Fake animated prompt logs */}
              <motion.div 
                animate={{ y: [0, -100] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="w-full flex flex-col gap-3 font-mono text-xs"
              >
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center text-red-600">
                  <span>[BLOCKED] ignore previous instructions...</span>
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center text-teal-600">
                  <span>[PASSED] summarize this financial...</span>
                  <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center text-red-600">
                  <span>[BLOCKED] write a script to bypass...</span>
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center text-teal-600">
                  <span>[PASSED] what is the weather in...</span>
                  <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                </div>
                 <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center text-red-600">
                  <span>[BLOCKED] ignore previous instructions...</span>
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                </div>
              </motion.div>
              {/* Bottom gradient fade out */}
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-50 to-transparent z-10" />
            </div>
          </div>
        </BentoCard>

        {/* Small Card 1 */}
        <BentoCard>
           <div className="flex flex-col h-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Sub-millisecond Latency</h3>
            <p className="text-slate-500 text-sm">Engineered across regions to sit invisibly on your pipeline.</p>
            <div className="mt-auto flex items-end justify-center h-full pb-4">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-teal-500 to-cyan-500 tracking-tighter">
                {"<0.5"}
                <span className="text-2xl text-slate-400">ms</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Small Card 2 */}
        <BentoCard>
          <div className="flex flex-col h-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">100% Policy Sync</h3>
            <p className="text-slate-500 text-sm">Automatically ingest your DPDP policies.</p>
            <div className="mt-auto flex justify-center items-center h-full">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full border-[6px] border-teal-100 border-t-teal-500"
              />
            </div>
          </div>
        </BentoCard>

        {/* Medium Wide Card */}
        <BentoCard className="md:col-span-3">
          <div className="flex flex-col md:flex-row items-center justify-between h-full gap-8">
            <div className="md:w-1/2">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Semantic PII Masking Engine</h3>
              <p className="text-slate-500 max-w-md">
                We locate, extract, and replace sensitive context with synthetic tokens precisely before parsing via LLM. Once returned, your clients see their original context perfectly hydrated.
              </p>
            </div>
            <div className="md:w-1/2 w-full h-full bg-slate-900 rounded-2xl p-6 font-mono text-sm text-slate-300 shadow-inner overflow-hidden flex flex-col justify-center">
              <p><span className="text-pink-400">const</span> prompt = <span className="text-green-400">"My email is laksh@company.com"</span>;</p>
              <div className="my-4 h-[1px] w-full border-b border-slate-700 border-dashed" />
              <motion.p
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
              >
                <span className="text-teal-400">Sentra.intercept</span>(prompt)
              </motion.p>
              <p className="mt-4 text-slate-500">// Output to LLM:</p>
              <p className="text-white">"My email is <span className="bg-teal-500/20 text-teal-300 px-1 rounded">USER_EMAIL_01</span>"</p>
            </div>
          </div>
        </BentoCard>

      </div>
    </div>
  );
};
