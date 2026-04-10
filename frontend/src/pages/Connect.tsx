import { useState, useEffect } from 'react';
import { Zap, Key, Copy, Check, Terminal, Code2, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { createApiKey, fetchApiKeys, deleteApiKey, APIKeyResponse, APIKeyBundle } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';

export default function ConnectPage() {
  const { accessToken } = useAuth();
  const [keys, setKeys] = useState<APIKeyResponse[]>([]);
  const [newKey, setNewKey] = useState<APIKeyBundle | null>(null);
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (accessToken) {
      loadKeys();
    }
  }, [accessToken]);

  const loadKeys = async () => {
    try {
      const data = await fetchApiKeys(accessToken!);
      setKeys(data);
    } catch (err) {
      console.error('Failed to load keys', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || isCreating) return;

    setIsCreating(true);
    try {
      const keyBundle = await createApiKey(accessToken!, keyName);
      setNewKey(keyBundle);
      setKeyName('');
      loadKeys();
    } catch (err) {
      alert('Failed to generate key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this key?')) return;
    try {
      await deleteApiKey(accessToken!, id);
      loadKeys();
    } catch (err) {
      alert('Failed to revoke key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sdkCodeSnippet = `import { SentraClient } from '@sentra-ai/sdk';

const sentra = new SentraClient({
  apiKey: '${newKey?.api_key || 'YOUR_API_KEY_HERE'}',
  baseUrl: 'https://sentra-ai-tau.vercel.app/api/v1'
});

// Log an event from your agent
await sentra.logEvent({
  agentName: 'CustomerSupportBot',
  action: 'pii_redaction_success',
  severity: 10,
  details: 'Redacted SSN from user prompt'
});`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-12">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 md:p-12 border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.1),transparent_40%)]" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                <Zap className="h-4 w-4" />
             </div>
             <span className="text-sm font-bold uppercase tracking-[0.2em] text-green-500/80">Developer Onboarding</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
            Connect your AI agents in seconds.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Sentra AI is built to monitor external agents. Use our lightweight SDK to beam 
            telemetry, risks, and audit logs directly from your LangChain or OpenAI apps.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Install SDK */}
        <SurfaceCard 
          title="1. Install the SDK" 
          description="Add the Sentra Telemetry client to your Node.js or TypeScript project."
        >
          <div className="group relative mt-4 rounded-xl bg-slate-900 p-4 border border-white/5 font-mono text-sm overflow-hidden">
             <span className="text-green-400">$</span> <span className="text-white">npm install @sentra-ai/sdk</span>
             <button 
                onClick={() => copyToClipboard('npm install @sentra-ai/sdk')}
                className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
             >
                <Copy className="h-4 w-4" />
             </button>
          </div>
          
          <div className="mt-8 space-y-4">
             <h4 className="flex items-center gap-2 text-sm font-semibold text-white uppercase tracking-wider">
                <Shield className="h-4 w-4 text-green-500" />
                Security First
             </h4>
             <p className="text-sm text-slate-400 leading-relaxed">
                The SDK uses asynchronous transmission to ensure your AI response times remain lightning fast. 
                Governance data is queued and shipped in the background.
             </p>
          </div>
        </SurfaceCard>

        {/* Step 2: API Keys */}
        <SurfaceCard 
          title="2. Generate Service Key" 
          description="Manage secure machine-to-machine tokens for your agents."
        >
          {newKey ? (
            <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/5 p-6 animate-in fade-in zoom-in duration-300">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-green-500">New Key Generated</span>
                  <button onClick={() => setNewKey(null)} className="text-slate-500 hover:text-white text-xs underline">Hide</button>
               </div>
               <div className="group relative rounded-xl bg-slate-950 p-4 border border-white/10 overflow-hidden">
                  <span className="text-green-400 font-mono break-all text-sm">{newKey.api_key}</span>
                  <button 
                    onClick={() => copyToClipboard(newKey.api_key)}
                    className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
               </div>
               <p className="mt-4 text-[11px] text-slate-500 leading-tight italic">
                  Store this key safely. You will not be able to see it again after you refresh this page.
               </p>
            </div>
          ) : (
            <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
               <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Key Label (e.g. SalesBot PRD)</label>
                  <input 
                    type="text" 
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Enter agent name..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                  />
               </div>
               <button 
                 type="submit"
                 disabled={!keyName || isCreating}
                 className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-slate-200 disabled:opacity-50"
               >
                 {isCreating ? 'Generating...' : <><Key className="h-4 w-4" /> Generate API Key</>}
               </button>
            </form>
          )}

          <div className="mt-8">
             <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Active Keys</h4>
             {loading ? (
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
             ) : keys.length === 0 ? (
                <p className="text-sm text-slate-600 italic">No active keys found.</p>
             ) : (
                <div className="space-y-3">
                   {keys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                         <div>
                            <p className="text-sm font-semibold text-white">{k.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{k.key_prefix}••••••••</p>
                         </div>
                         <button 
                            onClick={() => handleDeleteKey(k.id)}
                            className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-500 transition-colors"
                         >
                            Revoke
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </SurfaceCard>

        {/* Step 3: Integration Code */}
        <div className="lg:col-span-2">
           <SurfaceCard 
            title="3. Initialize & Ship" 
            description="Copy this boilerplate into your application to start sending telemetry."
           >
             <div className="group relative mt-6 rounded-2xl bg-slate-950 p-6 border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                   <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-mono text-slate-400">src/sentra.ts</span>
                   </div>
                   <button 
                    onClick={() => copyToClipboard(sdkCodeSnippet)}
                    className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all"
                   >
                     {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                     {copied ? 'Copied' : 'Copy boiler-plate'}
                   </button>
                </div>
                <pre className="font-mono text-sm leading-relaxed overflow-x-auto text-slate-300">
                  {sdkCodeSnippet}
                </pre>
             </div>
             
             <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 border border-green-500/10">
                <div className="flex items-center gap-5">
                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg">
                      <Code2 className="h-6 w-6" />
                   </div>
                   <div>
                      <h4 className="font-bold text-white">Advanced Documentation</h4>
                      <p className="text-sm text-slate-400">Read our full API reference for custom event schemas and LangChain callbacks.</p>
                   </div>
                </div>
                <button className="flex items-center gap-2 text-sm font-bold text-green-500 hover:text-green-400 transition-colors">
                   View Docs <ArrowRight className="h-4 w-4" />
                </button>
             </div>
           </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
