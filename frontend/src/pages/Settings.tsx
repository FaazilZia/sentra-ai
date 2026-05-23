import { useState, useEffect } from 'react';
import { 
  Key, 
  Bell, 
  Copy, 
  RefreshCw, 
  Save,
  Slack
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  fetchApiKeys, 
  rotateApiKey, 
  updateAlertEmail, 
  updateWebhookUrl,
  fetchSlackConfig,
  saveSlackConfig,
  testSlackConnection,
  deleteSlackConfig
} from '@/lib/api';

export default function Settings() {
  const addToast = useStore((state) => state.addToast);
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

  useEffect(() => {
    async function loadData() {
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
    loadData();
  }, []);

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

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Settings</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Global Configuration & Security Keys
          </p>
        </div>
      </div>

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
    </div>
  );
}

