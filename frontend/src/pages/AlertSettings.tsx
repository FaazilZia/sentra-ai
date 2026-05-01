import { useState, useEffect } from 'react';
import { ShieldAlert, BellRing, Activity, Clock, Link as LinkIcon, Plus } from 'lucide-react';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { createAlertRule, fetchAlertRules, AlertRule } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function AlertSettings() {
  const { accessToken } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [threshold, setThreshold] = useState<number>(5);
  const [timeWindow, setTimeWindow] = useState<number>(1);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchAlertRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load alert rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) loadRules();
  }, [accessToken]);

  const handleSave = async () => {
    // Basic validation
    if (!webhookUrl || threshold <= 0 || timeWindow <= 0) return;
    
    // Basic URL pattern check
    try {
      new URL(webhookUrl);
    } catch (e) {
      alert("Please enter a valid webhook URL (e.g., https://hooks.slack.com/...)");
      return;
    }

    setSaving(true);
    try {
      await createAlertRule({
        threshold_count: threshold,
        time_window_minutes: timeWindow,
        webhook_url: webhookUrl
      });
      setWebhookUrl('');
      setThreshold(5);
      setTimeWindow(1);
      await loadRules();
    } catch (err) {
      console.error('Failed to save alert rule', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12 px-6 lg:px-8 pt-8 bg-[#0a0f1a] min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 uppercase">
          <BellRing className="h-8 w-8 text-rose-500" />
          Alert Rules
        </h1>
        <p className="mt-2 text-slate-400 font-medium max-w-xl">
          Get notified instantly when high-risk activity spikes across your AI fleet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Rule Form */}
        <div className="lg:col-span-1 space-y-6">
          <SurfaceCard 
            title="Create Alert Rule" 
            description="Trigger a webhook when blocked actions exceed your threshold."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-500" /> Threshold (Blocked)
                </label>
                <input
                  type="number"
                  min="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0a0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" /> Time Window (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0a0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-slate-500" /> Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors font-mono"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={saving || !webhookUrl}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Plus className="h-4 w-4" /> Save Rule</>
                )}
              </button>
            </div>
          </SurfaceCard>
        </div>

        {/* Existing Rules List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">Active Rules</h2>
          
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : rules.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <ShieldAlert className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Alert Rules</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-2">Create a rule to receive real-time webhook notifications when security events happen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map(rule => (
                <div key={rule.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-rose-500">{rule.threshold_count}</span> Blocked Actions
                    </h3>
                    <p className="text-sm text-slate-400">Within {rule.time_window_minutes} minute(s)</p>
                  </div>
                  <div className="bg-[#0a0f1a] border border-slate-800 px-4 py-2 rounded-lg truncate max-w-xs md:max-w-md">
                    <span className="text-xs font-mono text-slate-500 truncate">{rule.webhook_url}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
