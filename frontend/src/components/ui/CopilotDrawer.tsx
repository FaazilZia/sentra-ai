import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Send, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { chatWithCopilot } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Sentra Copilot. How can I help you manage your AI governance, compliance, and security operations today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { accessToken } = useAuth();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !accessToken || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await chatWithCopilot(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error. Please ensure your OpenAI key is configured correctly.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-slate-900 border border-slate-700/50 text-white shadow-[0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:bg-slate-800 group"
      >
        <div className="relative">
          <BrainCircuit className="h-6 w-6 text-cyan-400" />
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
          </span>
        </div>
        <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.2em] text-slate-100 group-hover:text-white">
          Brain Co-Pilot
        </span>
      </motion.button>

      {/* Side Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      Sentra Copilot
                      <span className="inline-flex items-center rounded-full bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-600 border border-cyan-100 uppercase tracking-wider">AI</span>
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Compliance Advisor</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
              >
                {messages.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-50 text-slate-800 border border-slate-100'
                    }`}>
                      {m.content}
                      {m.role === 'assistant' && (
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <ShieldCheck size={12} className="text-cyan-500" />
                          Verified Advice
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer Input */}
              <div className="border-t border-slate-100 p-6 bg-white">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about compliance or risks..."
                    className="w-full rounded-2xl border-0 bg-slate-100 py-3.5 pl-5 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-slate-800 disabled:opacity-30"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  <Sparkles size={10} /> Powered by Sentra AI Intelligence
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
