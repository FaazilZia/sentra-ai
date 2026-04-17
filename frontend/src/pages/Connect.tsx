import { useState, useEffect } from 'react';
import { 
  Zap, Copy, Check, 
  Database, Cloud, Link2, 
  Lock, RefreshCw, Smartphone
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { 
  createApiKey, fetchApiKeys, 
  APIKeyResponse, APIKeyBundle,
  fetchConnectors, createConnector
} from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';

type Tab = 'sdk' | 'sources';

export default function ConnectPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('sdk');
  
  // API Keys state
  const [keys, setKeys] = useState<APIKeyResponse[]>([]);
  const [newKey, setNewKey] = useState<APIKeyBundle | null>(null);
  const [keyName, setKeyName] = useState('');
  
  // Connectors state
  const [connectors, setConnectors] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysData, connsData] = await Promise.all([
        fetchApiKeys(),
        fetchConnectors()
      ]);
      setKeys(keysData);
      setConnectors(connsData.items || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      // Data load complete
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || isCreating) return;
    setIsCreating(true);
    try {
      const keyBundle = await createApiKey(keyName);
      setNewKey(keyBundle);
      setKeyName('');
      const updatedKeys = await fetchApiKeys();
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
      await createConnector({
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
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12 text-[var(--foreground)]">
      {/* Dynamic Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[var(--card)] p-8 md:p-10 border border-[var(--card-border)] shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
               <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Link2 className="h-3.5 w-3.5" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500/80">Infrastructure Integration</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] md:text-4xl mb-3 uppercase">
              Power your Governance engine.
            </h1>
            <p className="text-sm text-[var(--muted)] font-bold leading-relaxed max-w-xl uppercase tracking-wider">
              Connect external AI agents via our lightweight SDK or bridge directly into your 
              cloud infrastructure for deep-scan compliance discovery.
            </p>
          </div>
          <div className="flex bg-[var(--muted-background)]/50 p-1 rounded-xl border border-[var(--card-border)] self-start backdrop-blur-md">
             <button 
                onClick={() => setActiveTab('sdk')}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'sdk' ? 'bg-[var(--foreground)] text-[var(--background)] shadow-lg' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
             >
                Agents & SDKs
             </button>
             <button 
                onClick={() => setActiveTab('sources')}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'sources' ? 'bg-[var(--foreground)] text-[var(--background)] shadow-lg' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
             >
                Data Connectors
             </button>
          </div>
        </div>
      </section>

      {activeTab === 'sdk' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SurfaceCard title="1. Install the SDK" description="Add telemetry capabilities to your agent logic." className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl">
            <div className="group relative mt-4 rounded-xl bg-[var(--background)]/50 p-5 border border-[var(--card-border)] font-mono text-xs">
               <span className="text-cyan-400">$</span> <span className="text-[var(--foreground)]">npm install @sentra-ai/sdk</span>
               <button onClick={() => copyToClipboard('npm install @sentra-ai/sdk')} className="absolute right-3 top-3 p-2 rounded-lg bg-[var(--foreground)]/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity opacity-0 group-hover:opacity-100"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-6">
               {[
                  { icon: Lock, label: 'End-to-End Encrypted', desc: 'Audit logs are hashed before transit.' },
                  { icon: Zap, label: '0ms Latency', desc: 'Asynchronous shipping avoids blocking.' },
               ].map((feat, idx) => (
                  <div key={idx} className="space-y-2">
                     <div className="flex items-center gap-2">
                        <feat.icon className="h-4 w-4 text-cyan-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">{feat.label}</span>
                     </div>
                     <p className="text-[10px] text-[var(--muted)] font-bold leading-snug uppercase tracking-tight">{feat.desc}</p>
                  </div>
               ))}
            </div>
          </SurfaceCard>

          <SurfaceCard title="2. Service Key" description="Authenticated tokens for agent-to-cloud mapping." className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl">
             {newKey ? (
               <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 animate-in zoom-in duration-300">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 block mb-3">Copy & Store Secretly</span>
                  <div className="relative rounded-lg bg-[var(--background)] p-3 border border-[var(--card-border)] overflow-hidden font-mono text-xs text-white break-all pr-12">
                     {newKey.api_key}
                     <button onClick={() => copyToClipboard(newKey.api_key)} className="absolute right-2 top-2 p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--muted)] hover:text-[var(--foreground)]">
                        {copied ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5" />}
                     </button>
                  </div>
                  <button onClick={() => setNewKey(null)} className="mt-3 text-[10px] text-[var(--muted)] underline hover:text-[var(--foreground)] font-black uppercase">Dismiss Key</button>
               </div>
             ) : (
               <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
                  <input 
                    type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)}
                    placeholder="E.g. CustomerSupport-PRD"
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-4 text-xs font-black uppercase tracking-widest text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <button type="submit" disabled={!keyName || isCreating} className="w-full h-12 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50">
                    {isCreating ? 'Generating...' : 'Issue Access Key'}
                  </button>
               </form>
             )}
             <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4 block">Active Service Principals</span>
                <div className="space-y-2">
                   {keys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted-background)] border border-[var(--card-border)]">
                         <span className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">{k.name}</span>
                         <span className="text-[10px] font-mono text-[var(--muted)]">{k.key_prefix}••••</span>
                      </div>
                   ))}
                </div>
             </div>
          </SurfaceCard>

          <div className="lg:col-span-2">
             <SurfaceCard title="3. Implementation" description="Initialize the Sentra client in your agent initialization logic." className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl">
                <div className="mt-4 rounded-xl bg-[var(--background)]/80 p-6 border border-[var(--card-border)] font-mono text-[13px] text-cyan-400 overflow-x-auto leading-relaxed">
                   <pre>{sdkCodeSnippet}</pre>
                </div>
             </SurfaceCard>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* SQL Database */}
           <div className="group relative flex flex-col rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 mb-8 transition-colors group-hover:bg-indigo-600 group-hover:text-white border border-indigo-500/20">
                 <Database className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-[var(--foreground)] mb-3 uppercase tracking-tight">Relational Database</h3>
              <p className="text-[11px] text-[var(--muted)] font-bold leading-relaxed mb-10 uppercase tracking-widest">
                 Introspect and scan Postgres, MySQL, or SQL Server for PII before it reaches your agents.
              </p>
              <div className="mt-auto pt-6 border-t border-[var(--card-border)]">
                 <button 
                  onClick={handleCreateSqlConnector}
                  disabled={isConnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--background)] hover:opacity-90 transition-all shadow-lg"
                 >
                    {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Connect SQL Source'}
                 </button>
              </div>
           </div>

           {/* Google Drive Mock */}
           <div className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-8 group-hover:bg-blue-600 group-hover:text-white border border-blue-500/20">
                 <Cloud className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-[var(--foreground)] mb-3 uppercase tracking-tight">Google Drive</h3>
              <p className="text-[11px] text-[var(--muted)] font-bold leading-relaxed mb-10 uppercase tracking-widest">
                 Discovery-scan Docs, Sheets, and Slides for behavioral governance at the source.
              </p>
              <div className="mt-auto pt-6 border-t border-[var(--card-border)]">
                 <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--card-border)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] hover:bg-[var(--foreground)]/5 transition-all">
                    Initiate OAuth
                 </button>
              </div>
           </div>

           {/* Mobile / App Connector */}
           <div className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-8 group-hover:bg-rose-600 group-hover:text-white border border-rose-500/20">
                 <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-[var(--foreground)] mb-3 uppercase tracking-tight">Mobile Interface</h3>
              <p className="text-[11px] text-[var(--muted)] font-bold leading-relaxed mb-10 uppercase tracking-widest">
                 Direct integration for mobile agent interfaces with native PII masking.
              </p>
              <div className="mt-auto pt-6 border-t border-[var(--card-border)]">
                 <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--muted-background)] py-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] cursor-not-allowed border border-[var(--card-border)]">
                    Coming Soon
                 </button>
              </div>
           </div>

           {/* Active Remote Sources List */}
           <div className="md:col-span-2 lg:col-span-3 mt-6">
              <SurfaceCard title="Active Remote Integrations" description="Managed connection state for enterprise data sources." className="bg-[var(--card)] border-[var(--card-border)] rounded-3xl">
                 <div className="overflow-hidden rounded-2xl border border-[var(--card-border)]">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-[var(--muted-background)] text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
                          <tr>
                             <th className="px-6 py-4">Source Name</th>
                             <th className="px-6 py-4">State</th>
                             <th className="px-6 py-4">Configuration</th>
                             <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--card-border)]">
                          {connectors.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-[var(--muted)] font-black uppercase tracking-widest">No active deep-scan sources.</td></tr>
                          ) : connectors.map(c => (
                            <tr key={c.id} className="hover:bg-[var(--foreground)]/5 transition-colors">
                               <td className="px-6 py-5 font-black text-[var(--foreground)] flex items-center gap-2 uppercase">
                                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                  {c.name}
                                  <span className="text-[9px] text-[var(--muted)] ml-2 opacity-50">{c.type.toUpperCase()}</span>
                               </td>
                               <td className="px-6 py-5 uppercase tracking-widest font-black text-green-500 text-[10px]">Verified</td>
                               <td className="px-6 py-5 font-mono text-[var(--muted)] text-[10px]">protocol://{c.type}.internal.sentra.ai</td>
                               <td className="px-6 py-5 text-right font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 cursor-pointer text-[10px]">Disconnect</td>
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
