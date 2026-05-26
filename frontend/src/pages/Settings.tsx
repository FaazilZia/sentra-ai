import { useState, useEffect } from 'react';
import { 
  Key, 
  Bell, 
  Copy, 
  RefreshCw, 
  Save,
  Slack,
  Globe,
  Database,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { 
  fetchApiKeys, 
  rotateApiKey, 
  updateAlertEmail, 
  updateWebhookUrl,
  fetchSlackConfig,
  saveSlackConfig,
  testSlackConnection,
  deleteSlackConfig,
  fetchCompany,
  fetchMcpAgentKeys,
  createMcpAgentKey,
  revokeMcpAgentKey,
  fetchMcpAuditLogs,
  saveSsoConfig
} from '@/lib/api';

export default function Settings() {
  const addToast = useStore((state) => state.addToast);
  const { user } = useAuth();
  
  // Tab State: 'general' | 'mcp' | 'sso'
  const [activeTab, setActiveTab] = useState<'general' | 'mcp' | 'sso'>('general');

  // Company Details
  const [company, setCompany] = useState<any>(null);

  // General Settings States
  const [apiKey, setApiKey] = useState('sk-sentra-••••••••••••••••');
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Slack Integration States
  const [slackUrl, setSlackUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [slackNotifyOn, setSlackNotifyOn] = useState<string[]>([]);
  const [slackStatus, setSlackStatus] = useState<'connected' | 'not_configured'>('not_configured');
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackSaving, setSlackSaving] = useState(false);

  // MCP Gateway Key Management States
  const [mcpKeys, setMcpKeys] = useState<any[]>([]);
  const [mcpKeysLoading, setMcpKeysLoading] = useState(false);
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyAllowedTools, setNewKeyAllowedTools] = useState('');
  const [newKeyBlockedTools, setNewKeyBlockedTools] = useState('');
  const [creatingMcpKey, setCreatingMcpKey] = useState(false);

  // Generated Raw Key Display Modal States
  const [generatedRawKey, setGeneratedRawKey] = useState('');
  const [rawKeyModalOpen, setRawKeyModalOpen] = useState(false);

  // Revocation Modal States
  const [keyToRevoke, setKeyToRevoke] = useState<any>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingMcpKey, setRevokingMcpKey] = useState(false);

  // MCP Audit Logs States
  const [mcpLogs, setMcpLogs] = useState<any[]>([]);
  const [mcpLogsLoading, setMcpLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilterDecision, setLogsFilterDecision] = useState<'all' | 'allowed' | 'blocked'>('all');

  // SAML SSO Configuration States
  const [ssoProviderName, setSsoProviderName] = useState('');
  const [idpMetadataXml, setIdpMetadataXml] = useState('');
  const [savingSso, setSavingSso] = useState(false);

  // Initialize and Load Data
  useEffect(() => {
    async function loadGeneralData() {
      try {
        const keys = await fetchApiKeys();
        if (keys && keys.length > 0) {
          const key = keys[0];
          setApiKey(key.key || `sk-sentra-****${key.key_prefix || 'abcd'}`);
        }
      } catch (err) {
        console.error('Settings load API keys error:', err);
      }

      try {
        const slack = await fetchSlackConfig();
        if (slack && slack.webhookUrl) {
          setSlackUrl(slack.webhookUrl);
          setSlackChannel(slack.channel);
          setSlackEnabled(slack.enabled);
          setSlackNotifyOn(slack.notifyOn || []);
          setSlackStatus('connected');
        }
      } catch (err) {
        console.error('Settings load Slack config error:', err);
      }
    }
    loadGeneralData();
  }, []);

  // Fetch company details for dynamic ACS and Entity IDs
  useEffect(() => {
    if (user?.organizationId) {
      fetchCompany(user.organizationId)
        .then((data) => {
          setCompany(data);
          if (data.alertEmail) setEmail(data.alertEmail);
          if (data.slackWebhookUrl) setWebhookUrl(data.slackWebhookUrl);
          
          // Seed SSO inputs
          setSsoProviderName(data.sso_provider || '');
          if (data.saml_metadata) {
            setIdpMetadataXml(data.saml_metadata.idpMetadataXml || '');
          }
        })
        .catch((err) => console.error('Settings load company details error:', err));
    }
  }, [user]);

  // Load MCP Tab Data (Keys and Logs)
  const loadMcpData = async () => {
    if (activeTab !== 'mcp') return;

    try {
      setMcpKeysLoading(true);
      const keys = await fetchMcpAgentKeys();
      setMcpKeys(keys);
    } catch (err) {
      console.error('Failed to load MCP keys:', err);
      addToast({ message: 'Failed to load MCP agent keys', type: 'error' });
    } finally {
      setMcpKeysLoading(false);
    }
  };

  const loadMcpLogs = async () => {
    if (activeTab !== 'mcp') return;

    try {
      setMcpLogsLoading(true);
      const res = await fetchMcpAuditLogs(logsPage, 10, logsFilterDecision);
      setMcpLogs(res.logs || []);
      setLogsPages(res.pages || 1);
      setLogsTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load MCP logs:', err);
    } finally {
      setMcpLogsLoading(false);
    }
  };

  useEffect(() => {
    loadMcpData();
  }, [activeTab]);

  useEffect(() => {
    loadMcpLogs();
  }, [activeTab, logsPage, logsFilterDecision]);

  // General tab actions
  const handleRotateKey = async () => {
    try {
      setLoading(true);
      const res = await rotateApiKey();
      setApiKey(res.api_key);
      addToast({ message: 'API key regenerated successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to regenerate API key', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    addToast({ message: 'API key copied to clipboard', type: 'info' });
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAlertEmail(email);
      addToast({ message: 'Alert email saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save alert email', type: 'error' });
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateWebhookUrl(webhookUrl);
      addToast({ message: 'Webhook URL saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save webhook URL', type: 'error' });
    }
  };

  // Slack Integration Handlers
  const handleSaveSlack = async () => {
    try {
      setSlackSaving(true);
      await saveSlackConfig({
        webhookUrl: slackUrl,
        channel: slackChannel,
        enabled: slackEnabled,
        notifyOn: slackNotifyOn
      });
      setSlackStatus('connected');
      addToast({ message: 'Slack configuration saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save Slack configuration', type: 'error' });
    } finally {
      setSlackSaving(false);
    }
  };

  const handleTestSlack = async () => {
    try {
      setSlackTesting(true);
      await testSlackConnection({
        webhookUrl: slackUrl,
        channel: slackChannel
      });
      addToast({ message: 'Slack integration test message dispatched successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Slack connection test failed', type: 'error' });
    } finally {
      setSlackTesting(false);
    }
  };

  const handleDeleteSlack = async () => {
    try {
      await deleteSlackConfig();
      setSlackUrl('');
      setSlackChannel('');
      setSlackEnabled(true);
      setSlackNotifyOn([]);
      setSlackStatus('not_configured');
      addToast({ message: 'Slack integration disconnected', type: 'info' });
    } catch (err) {
      addToast({ message: 'Failed to disconnect Slack integration', type: 'error' });
    }
  };

  // MCP Gateway Handlers
  const handleCreateMcpKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast({ message: 'Key name is required', type: 'warning' });
      return;
    }

    try {
      setCreatingMcpKey(true);
      const allowed = newKeyAllowedTools.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const blocked = newKeyBlockedTools.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await createMcpAgentKey(newKeyName.trim(), allowed, blocked);
      
      setNewKeyName('');
      setNewKeyAllowedTools('');
      setNewKeyBlockedTools('');
      setCreateKeyModalOpen(false);
      
      // Store the generated raw key, then open display modal
      setGeneratedRawKey(res.rawKey);
      setRawKeyModalOpen(true);
      
      loadMcpData();
      addToast({ message: 'MCP Agent Key generated successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to create agent key:', err);
      addToast({ message: 'Failed to create agent key', type: 'error' });
    } finally {
      setCreatingMcpKey(false);
    }
  };

  const handleRevokeMcpKey = async () => {
    if (!keyToRevoke) return;

    try {
      setRevokingMcpKey(true);
      await revokeMcpAgentKey(keyToRevoke.id);
      addToast({ message: `Revoked key: ${keyToRevoke.name}`, type: 'success' });
      setRevokeModalOpen(false);
      setKeyToRevoke(null);
      loadMcpData();
    } catch (err) {
      console.error('Failed to revoke key:', err);
      addToast({ message: 'Failed to revoke key', type: 'error' });
    } finally {
      setRevokingMcpKey(false);
    }
  };

  // SAML SSO configuration handlers
  const handleSaveSso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idpMetadataXml.trim()) {
      addToast({ message: 'IdP Metadata XML is required', type: 'warning' });
      return;
    }

    try {
      setSavingSso(true);
      const res = await saveSsoConfig(idpMetadataXml.trim(), ssoProviderName.trim());
      setCompany(res);
      addToast({ message: 'SAML SSO Configuration updated successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to save SSO config:', err);
      addToast({ message: 'Failed to update SAML SSO Configuration', type: 'error' });
    } finally {
      setSavingSso(false);
    }
  };

  // Helper values for SAML configuration display
  const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/v1$/, '').replace(/\/api$/, '') || 'http://localhost:10000';
  const spEntityId = company ? `${backendUrl}/api/v1/saml/${company.slug}/metadata` : '';
  const spAcsUrl = company ? `${backendUrl}/api/v1/saml/${company.slug}/callback` : '';
  const ssoLoginUrl = company ? `${backendUrl}/api/v1/saml/${company.slug}` : '';

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Settings</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Global Configuration & Enterprise Controls
          </p>
        </div>
      </div>

      {/* Sleek Custom Tab Switcher */}
      <div className="flex border-b border-[var(--border-default)] mb-4 gap-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          General & Alerts
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'mcp'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          MCP Gateway
        </button>
        <button
          onClick={() => setActiveTab('sso')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'sso'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          SAML SSO
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {/* ============================================================== */}
        {/* TAB 1: GENERAL SETTINGS */}
        {/* ============================================================== */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Section 1: API Keys */}
            <div className="lg:col-span-6 space-y-4">
              <div className="card-base p-6">
                <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
                  <Key className="h-4 w-4 text-[var(--royal-indigo)]" />
                  API Authentication
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Active API Key</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] overflow-hidden text-ellipsis">
                        {apiKey}
                      </div>
                      <button 
                        onClick={handleCopyKey}
                        className="p-2.5 text-[var(--text-muted)] hover:text-[var(--royal-indigo)] bg-[var(--bg-page)] border border-[var(--border-default)] rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
                      Use this key to authenticate your SDK calls to Sentra AI.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleRotateKey}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest hover:bg-black/10 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Regenerate Key
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Alert Configuration */}
            <div className="lg:col-span-6 space-y-4">
              <div className="card-base p-6">
                <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[var(--royal-indigo)]" />
                  Alert Configuration
                </h3>

                <div className="space-y-8">
                  <form onSubmit={handleSaveEmail}>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor="alert-email" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Alert Email</label>
                        <input 
                          id="alert-email"
                          type="email" 
                          placeholder="alerts@company.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                        />
                      </div>
                      <button 
                        type="submit"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] rounded text-[9px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all w-fit self-end"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Email
                      </button>
                    </div>
                  </form>

                  <div className="h-px bg-[var(--border-default)] opacity-50" />

                  <form onSubmit={handleSaveWebhook}>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor="webhook-url" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Webhook URL</label>
                        <input 
                          id="webhook-url"
                          type="url" 
                          placeholder="https://hooks.slack.com/services/..." 
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                        />
                      </div>
                      <button 
                        type="submit"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] rounded text-[9px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all w-fit self-end"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Webhook
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Section 3: Slack Integration */}
            <div className="lg:col-span-12 space-y-4">
              <div className="card-base p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
                    <Slack className="h-4 w-4 text-[#4A154B]" />
                    Slack Integration
                  </h3>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
                    slackStatus === 'connected' 
                      ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                    {slackStatus === 'connected' ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="slack-webhook" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Slack Webhook URL</label>
                      <input 
                        id="slack-webhook"
                        type="password" 
                        placeholder="https://hooks.slack.com/services/..." 
                        value={slackUrl}
                        onChange={(e) => setSlackUrl(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                      />
                    </div>

                    <div>
                      <label htmlFor="slack-channel" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Slack Channel</label>
                      <input 
                        id="slack-channel"
                        type="text" 
                        placeholder="#alerts-compliance" 
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        id="slack-enabled"
                        type="checkbox"
                        checked={slackEnabled}
                        onChange={(e) => setSlackEnabled(e.target.checked)}
                        className="h-4 w-4 accent-[var(--royal-indigo)] rounded border-[var(--border-default)] cursor-pointer"
                      />
                      <label htmlFor="slack-enabled" className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-wider cursor-pointer">
                        Enable Slack Notifications
                      </label>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-2.5">Alert Triggers</span>
                    <div className="space-y-2.5 bg-[var(--bg-page)] border border-[var(--border-default)] rounded p-4">
                      {[
                        { id: 'guardrail_block', label: 'Guardrail Blocks' },
                        { id: 'drift_detected', label: 'Behavioral Drift Detected' },
                        { id: 'incident_created', label: 'Security Incidents' },
                        { id: 'policy_violation', label: 'Policy Violations' },
                        { id: 'workflow_change', label: 'Workflow Phase Transitions' }
                      ].map((trigger) => (
                        <div key={trigger.id} className="flex items-center gap-2">
                          <input 
                            id={`trigger-${trigger.id}`}
                            type="checkbox"
                            checked={slackNotifyOn.includes(trigger.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSlackNotifyOn([...slackNotifyOn, trigger.id]);
                              } else {
                                setSlackNotifyOn(slackNotifyOn.filter(x => x !== trigger.id));
                              }
                            }}
                            className="h-3.5 w-3.5 accent-[var(--royal-indigo)] rounded cursor-pointer"
                          />
                          <label htmlFor={`trigger-${trigger.id}`} className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer">
                            {trigger.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-[var(--border-default)] pt-4">
                  {slackStatus === 'connected' && (
                    <button 
                      onClick={handleDeleteSlack}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Disconnect Slack
                    </button>
                  )}
                  <button 
                    onClick={handleTestSlack}
                    disabled={slackTesting || !slackUrl || !slackChannel}
                    className="px-4 py-2 bg-black/5 hover:bg-black/10 text-[var(--text-primary)] border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {slackTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button 
                    onClick={handleSaveSlack}
                    disabled={slackSaving || !slackUrl || !slackChannel}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {slackSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MCP GATEWAY */}
        {/* ============================================================== */}
        {activeTab === 'mcp' && (
          <div className="space-y-6">
            {/* API Keys Table */}
            <div className="card-base p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
                    <Key className="h-4 w-4 text-[var(--royal-indigo)]" />
                    MCP Agent Keys
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-xl">
                    SAML-authenticated API access credentials for dynamic, real-time agent governance over Model Context Protocol (MCP) integrations.
                  </p>
                </div>
                
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setCreateKeyModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Agent Key
                  </button>
                )}
              </div>

              {mcpKeysLoading ? (
                <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-muted)]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs uppercase tracking-wider font-bold">Loading agent credentials...</span>
                </div>
              ) : mcpKeys.length === 0 ? (
                <div className="py-12 text-center bg-black/5 rounded border border-dashed border-[var(--border-default)]">
                  <AlertTriangle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">No Agent Keys Registered</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Generate a key to grant your external AI agents access to Sentra's governance pipeline.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                        <th className="pb-3 font-black">Key Name</th>
                        <th className="pb-3 font-black">Prefix</th>
                        <th className="pb-3 font-black">Created At</th>
                        <th className="pb-3 font-black">Last Used</th>
                        <th className="pb-3 font-black text-center">Allowed Tools</th>
                        <th className="pb-3 font-black text-center">Status</th>
                        <th className="pb-3 font-black text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mcpKeys.map((key) => (
                        <tr key={key.id} className="border-b border-[var(--border-default)]/30 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 font-bold text-[var(--text-primary)]">{key.name}</td>
                          <td className="py-3.5 font-mono text-[var(--text-secondary)] text-[10px]">{key.key_prefix}••••</td>
                          <td className="py-3.5 text-[var(--text-muted)]">{new Date(key.created_at).toLocaleDateString()}</td>
                          <td className="py-3.5 text-[var(--text-muted)]">
                            {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() + ' ' + new Date(key.last_used_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span className="italic">Never</span>}
                          </td>
                          <td className="py-3.5 text-center">
                            {key.allowed_tools && key.allowed_tools.length > 0 ? (
                              <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">
                                {key.allowed_tools.length} Limit
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] italic">All Tools</span>
                            )}
                          </td>
                          <td className="py-3.5">
                            <div className="flex justify-center">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                key.is_active 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                                {key.is_active ? 'Active' : 'Revoked'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            {key.is_active && user?.role === 'ADMIN' ? (
                              <button
                                onClick={() => {
                                  setKeyToRevoke(key);
                                  setRevokeModalOpen(true);
                                }}
                                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Revoke Key"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[10px] italic">No actions</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Logs Table */}
            <div className="card-base p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
                    <Database className="h-4 w-4 text-[var(--royal-indigo)]" />
                    MCP Gateway Audit Logs
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Immutable governance evaluation logs intercepting external model execution attempts.
                  </p>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Decision:</span>
                  <select
                    value={logsFilterDecision}
                    onChange={(e) => {
                      setLogsFilterDecision(e.target.value as any);
                      setLogsPage(1);
                    }}
                    className="bg-transparent text-xs text-[var(--text-primary)] font-bold border-none outline-none cursor-pointer"
                  >
                    <option value="all">All Logs</option>
                    <option value="allowed">Allowed Only</option>
                    <option value="blocked">Blocked Only</option>
                  </select>
                </div>
              </div>

              {mcpLogsLoading ? (
                <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-muted)]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs uppercase tracking-wider font-bold">Loading audit trails...</span>
                </div>
              ) : mcpLogs.length === 0 ? (
                <div className="py-8 text-center text-[var(--text-muted)]">
                  <CheckCircle2 className="h-8 w-8 text-green-500/20 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">No Evaluation Logs Recorded</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Logs will appear as soon as external agents trigger registered MCP tools.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                          <th className="pb-3 font-black">Timestamp</th>
                          <th className="pb-3 font-black">Tool Name</th>
                          <th className="pb-3 font-black">Args Summary</th>
                          <th className="pb-3 font-black text-center">Decision</th>
                          <th className="pb-3 font-black text-center">Risk</th>
                          <th className="pb-3 font-black">Reason</th>
                          <th className="pb-3 font-black text-right">Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mcpLogs.map((log) => (
                          <tr key={log.id} className="border-b border-[var(--border-default)]/30 hover:bg-white/5 transition-colors">
                            <td className="py-3 text-[var(--text-muted)] whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 font-bold font-mono text-[var(--text-primary)]">{log.tool_name}</td>
                            <td className="py-3 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-secondary)] font-mono text-[10px]">
                              {log.input_summary || '{}'}
                            </td>
                            <td className="py-3">
                              <div className="flex justify-center">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  log.decision === 'allowed'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                  {log.decision}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex justify-center">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  log.risk_level === 'high' 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                    : log.risk_level === 'medium'
                                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                      : 'bg-green-500/10 text-green-500 border-green-500/20'
                                }`}>
                                  {log.risk_level}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-[var(--text-secondary)] max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={log.reason}>
                              {log.reason || 'None provided'}
                            </td>
                            <td className="py-3 text-right font-mono text-[10px] text-[var(--text-muted)]">
                              {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Simple Pagination Controls */}
                  {logsPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[var(--border-default)]/30 pt-4 text-xs">
                      <span className="text-[var(--text-muted)]">
                        Showing page <span className="font-bold text-[var(--text-secondary)]">{logsPage}</span> of <span className="font-bold text-[var(--text-secondary)]">{logsPages}</span> ({logsTotal} logs)
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={logsPage === 1}
                          className="px-3 py-1 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider disabled:opacity-50 text-[var(--text-primary)]"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setLogsPage(prev => Math.min(logsPages, prev + 1))}
                          disabled={logsPage === logsPages}
                          className="px-3 py-1 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider disabled:opacity-50 text-[var(--text-primary)]"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SAML SSO */}
        {/* ============================================================== */}
        {activeTab === 'sso' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form configuration */}
            <div className="lg:col-span-7 space-y-4">
              <div className="card-base p-6">
                <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[var(--royal-indigo)]" />
                  SAML 2.0 Identity Provider Config
                </h3>

                <form onSubmit={handleSaveSso} className="space-y-6">
                  <div>
                    <label htmlFor="sso-provider" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                      SSO Provider Name
                    </label>
                    <input
                      id="sso-provider"
                      type="text"
                      placeholder="e.g. Okta, Azure Active Directory, Google Workspace"
                      value={ssoProviderName}
                      onChange={(e) => setSsoProviderName(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="idp-xml" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                      IdP Metadata XML
                    </label>
                    <textarea
                      id="idp-xml"
                      rows={12}
                      placeholder="Paste the full IdP XML metadata string provided by your Identity Provider..."
                      value={idpMetadataXml}
                      onChange={(e) => setIdpMetadataXml(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[10px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] resize-y"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingSso || !idpMetadataXml.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingSso ? 'Configuring SSO...' : 'Save & Enable SSO'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Read-only details */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card-base p-6">
                <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--royal-indigo)]" />
                  Service Provider (SP) Credentials
                </h3>

                {!company ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">
                    Resolving tenant workspace slug...
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                        SAML Status
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${company.sso_enabled ? 'bg-green-500' : 'bg-zinc-500'}`} />
                        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)]">
                          {company.sso_enabled ? `SAML SSO Enabled (${company.sso_provider || 'SAML'})` : 'Inactive (Mock SSO Active)'}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-[var(--border-default)]/40" />

                    <div>
                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                        Your SP Entity ID
                      </span>
                      <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                        {spEntityId}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                        Your ACS URL (Assertion Consumer Service)
                      </span>
                      <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                        {spAcsUrl}
                      </div>
                    </div>

                    <div className="h-px bg-[var(--border-default)]/40" />

                    <div>
                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                        SSO Login URL
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                          {ssoLoginUrl}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ssoLoginUrl);
                            addToast({ message: 'SSO Login URL copied!', type: 'info' });
                          }}
                          className="p-2 border border-[var(--border-default)] rounded hover:text-[var(--royal-indigo)] bg-[var(--bg-page)]"
                          title="Copy Link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {company.sso_enabled && (
                      <div className="pt-2">
                        <a
                          href={spEntityId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-black/10 transition-colors w-full"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Download SP Metadata XML
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* 1. MCP CREATE AGENT KEY MODAL */}
      {createKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setCreateKeyModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-[var(--royal-indigo)]" />
              Generate MCP Agent Key
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mb-6 border-b border-[var(--border-default)] pb-3">
              Configure allowed and blocked tools to restrict agent behavior. Leave lists blank to authorize all tools.
            </p>

            <form onSubmit={handleCreateMcpKey} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Key Name / Agent Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. LangChain Invoice Agent"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Allowed Tools (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. sentra.checkAction, database.read"
                  value={newKeyAllowedTools}
                  onChange={(e) => setNewKeyAllowedTools(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Blocked Tools (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. filesystem.write, shell.execute"
                  value={newKeyBlockedTools}
                  onChange={(e) => setNewKeyBlockedTools(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]/60">
                <button
                  type="button"
                  onClick={() => setCreateKeyModalOpen(false)}
                  className="px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] hover:bg-black/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMcpKey || !newKeyName.trim()}
                  className="px-5 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {creatingMcpKey ? 'Generating...' : 'Generate key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MCP KEY DISPLAY (RAW KEY SHOWN ONLY ONCE) */}
      {rawKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-page)] border border-red-500/20 rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-sm font-black uppercase tracking-wider text-green-500 flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Agent Secret Key Generated
            </h3>
            
            {/* Warning Message */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3.5 mb-6 flex gap-3 text-red-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider">Security Warning</p>
                <p className="text-[9px] font-bold leading-normal mt-0.5">
                  Store this key securely. It will not be shown again. If you lose this key, you will have to regenerate a new one.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Raw Key Value
                </span>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 font-mono text-[11px] text-green-400 break-all select-all">
                    {generatedRawKey}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedRawKey);
                      addToast({ message: 'Secret key copied!', type: 'success' });
                    }}
                    className="p-2.5 border border-[var(--border-default)] rounded bg-[var(--bg-page)] hover:text-green-400 hover:border-green-500/30 transition-all self-start"
                    title="Copy Key"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border-default)]/60">
                <button
                  onClick={() => {
                    setGeneratedRawKey('');
                    setRawKeyModalOpen(false);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  I have saved this key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MCP KEY REVOCATION CONFIRMATION */}
      {revokeModalOpen && keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--bg-page)] border border-red-500/20 rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-sm font-black uppercase tracking-wider text-red-500 flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4" />
              Revoke Agent Credentials?
            </h3>
            
            <p className="text-[10px] text-[var(--text-secondary)] font-bold mb-6">
              Are you sure you want to revoke <span className="text-[var(--text-primary)] font-black">"{keyToRevoke.name}"</span>? 
              Any external AI agent running on this token will immediately be blocked from verifying tools or executing actions. This operation is permanent.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]/60">
              <button
                type="button"
                onClick={() => {
                  setRevokeModalOpen(false);
                  setKeyToRevoke(null);
                }}
                className="px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeMcpKey}
                disabled={revokingMcpKey}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {revokingMcpKey ? 'Revoking...' : 'Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
