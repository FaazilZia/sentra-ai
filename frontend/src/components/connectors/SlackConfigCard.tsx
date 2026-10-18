import React, { useState, useEffect } from 'react';
import { 
  Slack, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Lock
} from 'lucide-react';
import { 
  fetchSlackConfig, 
  saveSlackConfig, 
  deleteSlackConfig, 
  testSlackConnection, 
  SlackConfig 
} from '@/lib/api';
import { useStore } from '@/store/useStore';

export function SlackConfigCard() {
  const { addToast } = useStore();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [notifyOn, setNotifyOn] = useState<string[]>(['guardrail_block', 'incident_created']);

  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await fetchSlackConfig();
      if (config && config.webhookUrl) {
        setWebhookUrl(config.webhookUrl);
        setChannel(config.channel || '');
        setEnabled(config.enabled ?? true);
        setNotifyOn(config.notifyOn?.length ? config.notifyOn : ['guardrail_block', 'incident_created']);
        setHasExistingConfig(true);
      }
    } catch (err: any) {
      console.warn('Could not load Slack configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim() || !channel.trim()) {
      addToast({ message: 'Please provide both Webhook URL and Channel to test.', type: 'warning' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await testSlackConnection({
        webhookUrl: webhookUrl.trim(),
        channel: channel.trim()
      });
      setTestResult({
        success: true,
        message: `Test alert dispatched to ${channel.trim()} successfully.`
      });
      addToast({ message: 'Slack test alert dispatched.', type: 'success' });
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch Slack test alert.';
      setTestResult({ success: false, message: msg });
      addToast({ message: msg, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !channel.trim()) {
      addToast({ message: 'Please provide Webhook URL and Channel.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload: SlackConfig = {
        webhookUrl: webhookUrl.trim(),
        channel: channel.trim(),
        enabled,
        notifyOn
      };
      await saveSlackConfig(payload);
      setHasExistingConfig(true);
      addToast({ message: 'Slack configuration saved securely.', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save Slack configuration.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to disconnect Slack?')) {
      return;
    }

    try {
      await deleteSlackConfig();
      setWebhookUrl('');
      setChannel('');
      setEnabled(true);
      setNotifyOn(['guardrail_block', 'incident_created']);
      setHasExistingConfig(false);
      setTestResult(null);
      addToast({ message: 'Slack integration disconnected.', type: 'info' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to disconnect Slack.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#4A154B]/10 text-[#4A154B] dark:text-[#E01E5A] flex items-center justify-center font-bold">
            <Slack className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Slack Alert Dispatcher
              </h3>
              {hasExistingConfig ? (
                enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Disabled
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Posts Block Kit alert notifications when actions are BLOCKED or FLAGGED by Sentraa guardrails.
            </p>
          </div>
        </div>

        {hasExistingConfig && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs font-bold border border-red-200 dark:border-red-900/40 transition-all self-start sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" /> Disconnect
          </button>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Lock className="h-4 w-4 text-indigo-500 shrink-0" />
        <span>Webhook URLs are AES-256-GCM encrypted. Sensitive PII is automatically redacted before dispatch.</span>
      </div>

      {testResult && (
        <div className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
          testResult.success 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
            : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          )}
          <div>
            <span className="font-bold">{testResult.success ? 'Success: ' : 'Failed: '}</span>
            {testResult.message}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Slack Webhook URL <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Target Channel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#sentraa-alerts"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="slack-enabled-toggle"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <label htmlFor="slack-enabled-toggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            Enable Slack Notification Dispatcher
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={testing || saving}
            onClick={handleTest}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all disabled:opacity-50"
          >
            {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Test Connection
          </button>
          <button
            type="submit"
            disabled={saving || testing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
