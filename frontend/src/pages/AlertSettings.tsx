import { useEffect, useState } from 'react';
import { Mail, Webhook, Save, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateAlertSettings, testAlert, fetchCurrentUser, fetchCompany } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useAuth } from '../lib/auth';

export default function AlertSettingsPage() {
  const { accessToken, user } = useAuth();
  const [alertEmail, setAlertEmail] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (currentUser.organizationId) {
          const org = await fetchCompany(currentUser.organizationId);
          setAlertEmail(org.alertEmail || '');
          setSlackWebhookUrl(org.slackWebhookUrl || '');
        }
      } catch (err) {
        console.error('Failed to load org settings', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (accessToken) {
      loadSettings();
    }
  }, [accessToken]);

  const handleSaveAlerts = async () => {
    setIsSaving(true);
    try {
      if (alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) {
        throw new Error('Invalid email format');
      }
      if (slackWebhookUrl && !slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
        throw new Error('Invalid Slack webhook URL');
      }
      await updateAlertSettings({ alertEmail, slackWebhookUrl });
      alert('Alert settings saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save alert settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    try {
      await testAlert();
      alert('Test alerts dispatched to configured channels');
    } catch (err: any) {
      alert(err.message || 'Failed to send test alert');
    } finally {
      setIsTesting(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-[800px] space-y-6 pb-12 p-6">
      <header className="flex items-center justify-between">
        <div>
          <Link to="/app" className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-950 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">Alert Settings</h1>
          <p className="text-sm text-slate-400">Configure where to receive notifications for security violations.</p>
        </div>
      </header>

      <div className="space-y-6">
        {!isAdmin ? (
          <SurfaceCard title="Access Denied">
            <p className="text-sm text-slate-400">Only administrators can modify alert settings.</p>
          </SurfaceCard>
        ) : loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-800/50" />
        ) : (
          <SurfaceCard 
            title="Incident Alert Channels" 
            description="Configure where to receive notifications when a security policy blocks an AI action."
          >
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="alertEmail" className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Admin Alert Email
                </label>
                <input
                  id="alertEmail"
                  type="email"
                  placeholder="security-admin@company.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="slackWebhook" className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Webhook className="h-3.5 w-3.5" /> Slack Webhook URL
                </label>
                <input
                  id="slackWebhook"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800 mt-4">
                <button
                  onClick={handleSaveAlerts}
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={handleTestAlert}
                  disabled={isTesting || (!alertEmail && !slackWebhookUrl)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> {isTesting ? 'Sending...' : 'Test Alert'}
                </button>
              </div>
            </div>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
