import { useEffect, useRef, useState } from 'react';
import { Bot, Link, SendHorizontal, Sparkles, X } from 'lucide-react';
import { askAI } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Sentra AI Copilot. How can I help you regarding your governance strategy today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const responseText = await askAI(userMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble reaching the network right now. Please try again later. (" + (error instanceof Error ? error.message : String(error)) + ")" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div 
          className="mb-4 flex h-[500px] max-h-[calc(100vh-120px)] w-[360px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300 sm:w-[400px]"
          style={{ boxShadow: '0 20px 40px -10px rgba(8, 146, 208, 0.15)' }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Ask AI</span>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400/80">Edge Copilot Online</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 pr-3">
            <div className="flex flex-col gap-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'border border-white/5 bg-slate-800/80 text-slate-200'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-2 flex items-center gap-2 text-cyan-400">
                        <Bot className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Copilot</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl border border-white/5 bg-slate-800/80 px-4 py-4 text-slate-400">
                    <div className="flex h-1.5 gap-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.3s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.15s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-white/10 bg-slate-900/60 p-4">
            <form onSubmit={handleSubmit} className="relative flex items-center">
               <div className="absolute left-3 text-slate-500">
                  <Link className="h-4 w-4" />
               </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Sentra..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-30"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {/* Subtle glow layer behind the button */}
          <div className="absolute inset-0 -z-10 rounded-full bg-cyan-400 opacity-40 blur-md transition-all group-hover:opacity-70 group-hover:blur-lg" />
          <Sparkles className="h-6 w-6 text-white" />
          
          {/* Notification red dot for unread status purely for visual aesthetic */}
          <span className="absolute right-0 top-0 flex h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-red-500"></span>
        </button>
      )}
    </div>
  );
}
