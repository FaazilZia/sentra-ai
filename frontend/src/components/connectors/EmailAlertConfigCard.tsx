import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  X, 
  Send, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { 
  fetchEmailAlertConfig, 
  saveEmailAlertConfig, 
  testEmailAlert, 
  AlertSeverityFilter
} from '@/lib/api';
import { useStore } from '@/store/useStore';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function EmailAlertConfigCard() {
  const { addToast } = useStore();

  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>('high');
  const [hourlyRateLimit, setHourlyRateLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [emailInputError, setEmailInputError] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await fetchEmailAlertConfig();
      if (config) {
        setRecipients(config.recipients || []);
        setEnabled(config.enabled ?? false);
        setSeverityFilter(config.severityFilter || 'high');
        setHourlyRateLimit(config.hourlyRateLimit || 10);
      }
    } catch (err: any) {
      console.warn('Could not load email alert configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = () => {
    setEmailInputError(null);
    const trimmed = newEmail.trim().toLowerCase();

    if (!trimmed) {
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailInputError('Please enter a valid email address.');
      return;
    }

    if (recipients.includes(trimmed)) {
      setEmailInputError('This email is already in the recipient list.');
      return;
    }

    if (recipients.length >= 10) {
      setEmailInputError('Maximum of 10 recipients allowed per organization.');
      return;
    }

    setRecipients([...recipients, trimmed]);
    setNewEmail('');
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveEmailAlertConfig({
        recipients,
        enabled,
        severityFilter,
        hourlyRateLimit,
      });
      addToast({
        message: 'Email alert settings saved successfully.',
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        message: err.message || 'Failed to save email alert settings.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (recipients.length === 0) {
      addToast({
        message: 'Please add at least one recipient email before sending a test alert.',
        type: 'warning',
      });
      return;
    }

    setTesting(true);
    try {
      const res = await testEmailAlert();
      addToast({
        message: res.message || 'Test email alert sent successfully!',
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        message: err.message || 'Failed to send test email alert.',
        type: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div 
        data-testid="email-alerts-loading"
        className="card-base p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm flex items-center justify-center py-12"
      >
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isConfigActive = enabled && recipients.length > 0;

  return (
    <div 
      data-testid="email-alerts-card"
      className="card-base p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Email Alert Channel
              <span 
                data-testid="email-alerts-status-badge"
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  isConfigActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isConfigActive ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Active ({recipients.length})
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" /> Inactive
                  </>
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deliver real-time security alerts to designated team members when high-risk policy violations occur.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Enable / Disable Channel */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="email-alerts-enabled-toggle"
            data-testid="email-alerts-enabled-toggle"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
          />
          <label 
            htmlFor="email-alerts-enabled-toggle" 
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Enable email notification channel for this organization
          </label>
        </div>

        {/* Recipients input and chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Notification Recipients
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              {recipients.length} / 10 recipients
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              data-testid="email-alerts-recipient-input"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailInputError) setEmailInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. security-team@yourcompany.com"
              disabled={recipients.length >= 10}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="button"
              data-testid="email-alerts-add-recipient-button"
              onClick={handleAddRecipient}
              disabled={recipients.length >= 10 || !newEmail.trim()}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {emailInputError && (
            <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {emailInputError}
            </p>
          )}

          {/* Recipient tags list */}
          {recipients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipients.map((email) => (
                <span
                  key={email}
                  data-testid={`email-alerts-recipient-chip-${email}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-mono text-xs"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(email)}
                    className="p-0.5 hover:text-rose-500 rounded transition-colors"
                    title={`Remove ${email}`}
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              No alert recipients configured. Add at least one address to receive notifications.
            </p>
          )}
        </div>

        {/* Severity filter & rate limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
              Severity Filter
            </label>
            <select
              data-testid="email-alerts-severity-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverityFilter)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="high">High Risk Only (Critical security blocks)</option>
              <option value="medium_and_high">Medium &amp; High Risk (Blocks and flags)</option>
              <option value="all">All Alerts (Low, Medium, and High)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Control the threshold for outbound alerts dispatched through this channel.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              Hourly Rate Limit
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={hourlyRateLimit}
              onChange={(e) => setHourlyRateLimit(Math.max(1, Number.parseInt(e.target.value, 10) || 10))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400">
              Maximum emails sent per hour. Protects recipients against alert floods.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            data-testid="send-test-email-button"
            disabled={testing || saving || recipients.length === 0}
            onClick={handleSendTestEmail}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send Test Email
          </button>
          <button
            type="submit"
            data-testid="save-email-alerts-button"
            disabled={saving || testing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
