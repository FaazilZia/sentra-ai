import { useState, useEffect } from 'react';
import { 
  Zap, Key, Copy, Check, Terminal, Code2, Shield, 
  ArrowRight, Database, Cloud, Link2, Globe, Server,
  Lock, RefreshCw, Smartphone
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { 
  createApiKey, fetchApiKeys, deleteApiKey, 
  APIKeyResponse, APIKeyBundle,
  fetchConnectors, createConnector, testConnector
} from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';

type Tab = 'sdk' | 'sources';

export default function ConnectPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('sdk');
  
  // API Keys state
  const [keys, setKeys] = useState<APIKeyResponse[]>([]);
  const [newKey, setNewKey] = useState<APIKeyBundle | null>(null);
  const [keyName, setKeyName] = useState('');
  
  // Connectors state
  const [connectors, setConnectors] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (accessToken) {
      loadData();
    }
  }, [accessToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysData, connsData] = await Promise.all([
        fetchApiKeys(accessToken!),
        fetchConnectors(accessToken!)
      ]);
      setKeys(keysData);
      setConnectors(connsData.items || []);
    } catch (err) {
      console.error('Failed to load data', err);
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
      const updatedKeys = await fetchApiKeys(accessToken!);
      setKeys(updatedKeys);
    } catch (err) {
      alert('Failed to generate key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSqlConnector = async () => {
    setIsConnecting(true);
    try {
      await createConnector(accessToken!, {
        name: 'Production SQL DB',
        type: 'sql',
        config: { host: 'db.internal.sentra.ai', port: 5432 }
      });
      alert('Connection Request Sent: Our worker is verifying the handshake.');
      loadData();
    } catch (err) {
      alert('Failed to create connector');
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sdkCodeSnippet = `import { SentraClient } from '@sentra-ai/sdk';\n\nconst sentra = new SentraClient({\n  apiKey: '${newKey?.api_key || 'YOUR_API_KEY_HERE'}',\n  baseUrl: 'https://sentra-ai-tau.vercel.app/api/v1'\n});\n\n// Log a security event\nawait sentra.logEvent({ agent: 'Support-Bot', details: 'PII access detected' });`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      {/* Dynamic Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 md:p-10 border border-white/5 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
               <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Link2 className="h-3.5 w-3.5" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-500/80">Infrastructure Integration</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl mb-3">
              Power your Governance engine.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Connect external AI agents via our lightweight SDK or bridge directly into your 
              cloud infrastructure for deep-scan compliance discovery.
            </p>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 self-start">
             <button 
                onClick={() => setActiveTab('sdk')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'sdk' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                Agents & SDKs
             </button>
             <button 
                onClick={() => setActiveTab('sources')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'sources' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                Data Connectors
             </button>
          </div>
        </div>
      </section>

      {activeTab === 'sdk' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SurfaceCard title="1. Install the SDK" description="Add telemetry capabilities to your agent logic.">
            <div className="group relative mt-4 rounded-xl bg-slate-900/80 p-4 border border-white/5 font-mono text-sm">
               <span className="text-cyan-400">$</span> <span className="text-white">npm install @sentra-ai/sdk</span>
               <button onClick={() => copyToClipboard('npm install @sentra-ai/sdk')} className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
               {[
                  { icon: Lock, label: 'End-to-End Encrypted', desc: 'Audit logs are hashed before transit.' },
                  { icon: Zap, label: '0ms Latency', desc: 'Asynchronous shipping avoids blocking.' },
               ].map((feat, idx) => (
                  <div key={idx} className="space-y-1.5">
                     <div className="flex items-center gap-2">
                        <feat.icon className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white">{feat.label}</span>
                     </div>
                     <p className="text-[10px] text-slate-500 leading-snug">{feat.desc}</p>
                  </div>
               ))}
            </div>
          </SurfaceCard>

          <SurfaceCard title="2. Service Key" description="Authenticated tokens for agent-to-cloud mapping.">
             {newKey ? (
               <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 animate-in zoom-in duration-300">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 block mb-3">Copy & Store Secretly</span>
                  <div className="relative rounded-lg bg-slate-950 p-3 border border-white/10 overflow-hidden font-mono text-xs text-white break-all pr-12">
                     {newKey.api_key}
                     <button onClick={() => copyToClipboard(newKey.api_key)} className="absolute right-2 top-2 p-1.5 rounded-md bg-white/5 text-slate-500 hover:text-white">
                        {copied ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5" />}
                     </button>
                  </div>
                  <button onClick={() => setNewKey(null)} className="mt-3 text-[10px] text-slate-500 underline hover:text-white">Dismiss Key</button>
               </div>
             ) : (
               <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
                  <input 
                    type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)}
                    placeholder="E.g. CustomerSupport-PRD"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <button type="submit" disabled={!keyName || isCreating} className="w-full h-11 rounded-xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">
                    {isCreating ? 'Generating...' : 'Issue Access Key'}
                  </button>
               </form>
             )}
             <div className="mt-6 border-t border-slate-100 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">Active Service Principals</span>
                <div className="space-y-2">
                   {keys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs font-semibold text-slate-900">{k.name}</span>
                         <span className="text-[10px] font-mono text-slate-400">{k.key_prefix}••••</span>
                      </div>
                   ))}
                </div>
             </div>
          </SurfaceCard>

          <div className="lg:col-span-2">
             <SurfaceCard title="3. Implementation" description="Initialize the Sentra client in your agent initialization logic.">
                <div className="mt-4 rounded-xl bg-slate-950 p-6 border border-white/10 font-mono text-[13px] text-slate-300 overflow-x-auto leading-relaxed">
                   <pre>{sdkCodeSnippet}</pre>
                </div>
             </SurfaceCard>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* SQL Database */}
           <div className="group relative flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                 <Database className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">Relational Database</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-8">
                 Introspect and scan Postgres, MySQL, or SQL Server for PII before it reaches your agents.
              </p>
              <div className="mt-auto pt-6 border-t border-slate-50">
                 <button 
                  onClick={handleCreateSqlConnector}
                  disabled={isConnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-slate-800 transition-all"
                 >
                    {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Connect SQL Source'}
                 </button>
              </div>
           </div>

           {/* Google Drive Mock */}
           <div className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white">
                 <Cloud className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">Google Drive</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-8">
                 Discovery-scan Docs, Sheets, and Slides for behavioral governance at the source.
              </p>
              <div className="mt-auto pt-6 border-t border-slate-50">
                 <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-100 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
                    Initiate OAuth
                 </button>
              </div>
           </div>

           {/* Mobile / App Connector */}
           <div className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-6 group-hover:bg-rose-600 group-hover:text-white">
                 <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">Mobile Interface</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-8">
                 Direct integration for mobile agent interfaces with native PII masking.
              </p>
              <div className="mt-auto pt-6 border-t border-slate-50">
                 <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 cursor-not-allowed">
                    Coming Soon
                 </button>
              </div>
           </div>

           {/* Active Remote Sources List */}
           <div className="md:col-span-2 lg:col-span-3 mt-4">
              <SurfaceCard title="Active Remote Integrations" description="Managed connection state for enterprise data sources.">
                 <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <tr>
                             <th className="px-4 py-3">Source Name</th>
                             <th className="px-4 py-3">State</th>
                             <th className="px-4 py-3">Configuration</th>
                             <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {connectors.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">No active deep-scan sources. Connect your first database above.</td></tr>
                          ) : connectors.map(c => (
                            <tr key={c.id}>
                               <td className="px-4 py-4 font-bold text-slate-900 flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                  {c.name}
                               </td>
                               <td className="px-4 py-4 uppercase tracking-tighter font-extrabold text-green-600">Verified</td>
                               <td className="px-4 py-4 font-mono text-slate-400">protocol://{c.type}.internal.sentra.ai</td>
                               <td className="px-4 py-4 text-right underline text-slate-400 hover:text-rose-500 cursor-pointer">Disconnect</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </SurfaceCard>
           </div>
        </div>
      )}
    </div>
  );
}
