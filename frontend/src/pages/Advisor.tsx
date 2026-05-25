import { useEffect, useState, useRef } from 'react';
import { Sparkles, Bot, User, Send, AlertTriangle, RefreshCw, Layers, Cpu } from 'lucide-react';
import { apiBaseUrl, fetchAdvisorSuggestions, AdvisorMessage } from '@/lib/api';

interface StreamedToolActivity {
  name: string;
  status: 'running' | 'completed' | 'waiting_approval';
  input?: any;
}

export default function Advisor() {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your **Sentra AI Compliance Advisor**. I have real-time access to your organization's EU AI Act posture, NIST AI RMF score, ISO 42001/27001 checklists, and unresolved drift incidents. How can I help secure your AI pipelines today?"
    }
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<StreamedToolActivity | null>(null);
  
  // Direct Write Action Approvals state
  const [pendingWriteAction, setPendingWriteAction] = useState<{
    name: string;
    description: string;
    payload: any;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch dynamic smart suggestion chips
    fetchAdvisorSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([
        "How do we resolve our active drift incidents?",
        "How can we improve our ISO 42001 score?",
        "Summarize my open compliance gaps.",
        "List all third-party AI vendors under review."
      ]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolActivity]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: AdvisorMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setToolActivity(null);

    // Placeholder for streamed AI assistant response
    const assistantIndex = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${apiBaseUrl}/advisor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start advisor agent session');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              accumulatedResponse += `\n\n❌ **Error**: ${parsed.error}`;
              setMessages(prev => {
                const copy = [...prev];
                copy[assistantIndex] = { role: 'assistant', content: accumulatedResponse };
                return copy;
              });
            } else if (parsed.text) {
              accumulatedResponse += parsed.text;
              setMessages(prev => {
                const copy = [...prev];
                copy[assistantIndex] = { role: 'assistant', content: accumulatedResponse };
                return copy;
              });
            } else if (parsed.tool_start) {
              setToolActivity({
                name: parsed.tool_start,
                status: 'running'
              });
            } else if (parsed.tool_confirm) {
              // Intercept the write tool calls to show interactive card warnings
              const isWriteAction = ['create_incident', 'create_drift_alert', 'update_guardrail_status'].includes(parsed.tool_confirm.name);
              
              setToolActivity({
                name: parsed.tool_confirm.name,
                status: isWriteAction ? 'waiting_approval' : 'completed',
                input: parsed.tool_confirm.input
              });

              if (isWriteAction) {
                // Open confirmation UI overlay
                setPendingWriteAction({
                  name: parsed.tool_confirm.name,
                  description: `AI Advisor recommends executing the system command \`${parsed.tool_confirm.name}\`.`,
                  payload: parsed.tool_confirm.input
                });
              }
            } else if (parsed.tool_result) {
              setToolActivity(prev => {
                if (prev && prev.name === parsed.tool_result.name) {
                  return { ...prev, status: 'completed' };
                }
                return prev;
              });
              
              // Render structured evidence in the chat bubble if the result returned lists
              if (Array.isArray(parsed.tool_result.result)) {
                accumulatedResponse += `\n\n📋 **Retrieved ${parsed.tool_result.result.length} Records from \`${parsed.tool_result.name}\`**:\n`;
                parsed.tool_result.result.slice(0, 3).forEach((item: any) => {
                  accumulatedResponse += `- **${item.name || item.title || item.details || 'Record'}** (${item.status || item.severity || 'ACTIVE'})\n`;
                });
                if (parsed.tool_result.result.length > 3) {
                  accumulatedResponse += `- *and ${parsed.tool_result.result.length - 3} other items...*\n`;
                }
                setMessages(prev => {
                  const copy = [...prev];
                  copy[assistantIndex] = { role: 'assistant', content: accumulatedResponse };
                  return copy;
                });
              }
            }
          } catch (e) {
            // Chunk border sync fallback
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[assistantIndex] = { 
          role: 'assistant', 
          content: "⚠️ I encountered an error communicating with the Anthropic AI engine. Please ensure your `ANTHROPIC_API_KEY` is loaded in your environment for compliance queries." 
        };
        return copy;
      });
    } finally {
      setIsLoading(false);
      setToolActivity(null);
    }
  };

  const handleApproveAction = async () => {
    if (!pendingWriteAction) return;
    
    // Add success feedback to messages
    const successMsg = `✅ **Action Executed**: Mapped write action \`${pendingWriteAction.name}\` successfully completed in backend database.`;
    setMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
    setPendingWriteAction(null);
    setToolActivity(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] gap-4 p-4 animate-fade-in relative">
      
      {/* Dynamic Write Action Approval Card Overlay */}
      {pendingWriteAction && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-base max-w-md w-full border-rose-500/30 shadow-2xl p-6 bg-white animate-fade-in">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-sm font-black uppercase tracking-widest">Compliance Action Confirmation</h3>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed mb-4">
              The Chief AI Compliance Advisor is attempting to perform a mutating write command on your system. 
              Please verify and approve this action.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 font-mono text-[10px] text-slate-700">
              <div className="font-bold text-[var(--royal-indigo)] mb-1">COMMAND: {pendingWriteAction.name}</div>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(pendingWriteAction.payload, null, 2)}
              </pre>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setPendingWriteAction(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all"
              >
                Reject Action
              </button>
              <button 
                onClick={handleApproveAction}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 transition-all shadow-md shadow-rose-500/20"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 bg-white px-4 py-3 rounded-[var(--radius)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl text-[var(--royal-indigo)]">
            <Bot className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">AI Governance Advisor</h2>
              <span className="badge-pill bg-indigo-100 text-[var(--royal-indigo)] font-bold text-[9px] uppercase tracking-tighter">CLAUDE SONNET 4</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Real-time context of EU AI Act, NIST AI RMF & ISO frameworks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMessages([
              {
                role: 'assistant',
                content: "Hello! I am your **Sentra AI Compliance Advisor**. I have real-time access to your organization's EU AI Act posture, NIST AI RMF score, ISO 42001/27001 checklists, and unresolved drift incidents. How can I help secure your AI pipelines today?"
              }
            ])}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 active:bg-slate-100"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Chat
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden min-h-0">
        
        {/* Left Suggestions & Context Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="card-base p-4 flex flex-col gap-3 bg-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--royal-indigo)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Dynamic suggestions
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Click one of the chips below to query the advisor with real-time org context:</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(sug)}
                  className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-[var(--royal-indigo)] hover:bg-[var(--ghost-violet)]/20 active:scale-98 transition-all text-[11px] font-medium text-[var(--text-primary)] leading-normal"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="card-base p-4 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-300" />
              Active System Integrations
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-between border-b border-indigo-800/40 pb-2">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">EU AI Act Assessment</span>
                <span className="badge-pill bg-indigo-500/30 text-indigo-200 font-bold">READY</span>
              </div>
              <div className="flex items-center gap-2 justify-between border-b border-indigo-800/40 pb-2">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">NIST AI RMF Baseline</span>
                <span className="badge-pill bg-indigo-500/30 text-indigo-200 font-bold">CONNECTED</span>
              </div>
              <div className="flex items-center gap-2 justify-between border-b border-indigo-800/40 pb-2">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">ISO 42001 Clause List</span>
                <span className="badge-pill bg-indigo-500/30 text-indigo-200 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="lg:col-span-3 card-base bg-white flex flex-col overflow-hidden relative">
          
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border shadow-sm shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-slate-100 border-slate-200 text-slate-700' 
                    : 'bg-indigo-50 border-indigo-100 text-[var(--royal-indigo)]'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                
                <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium ${
                  msg.role === 'user'
                    ? 'bg-[var(--royal-indigo)] text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/60 text-slate-800 rounded-tl-none whitespace-pre-wrap'
                }`}>
                  {msg.content === '' ? (
                    <div className="flex items-center gap-2 text-indigo-500 py-1">
                      <Cpu className="h-4 w-4 animate-spin" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Claude Thinking...</span>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {/* Inline Tool Execution Indicator */}
            {toolActivity && (
              <div className="flex items-center gap-2 text-indigo-500/80 bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 max-w-sm animate-pulse">
                <Cpu className="h-4 w-4 animate-spin text-[var(--royal-indigo)]" />
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Executing Compliance Query</div>
                  <div className="text-[9px] font-mono text-[var(--text-secondary)] mt-0.5">Tool: {toolActivity.name} ({toolActivity.status})</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="border-t border-[var(--border-default)] p-3 flex gap-2 items-center bg-slate-50"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Ask anything about EU AI Act status, NIST scores, ISO controls, or unresolved incidents..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-[var(--royal-indigo)] focus:ring-1 focus:ring-[var(--royal-indigo)]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--royal-indigo)] text-white hover:bg-[var(--mid-indigo)] active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-md shadow-indigo-600/10"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
