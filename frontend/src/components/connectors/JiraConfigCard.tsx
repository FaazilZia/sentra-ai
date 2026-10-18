import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldAlert, 
  Trash2,
  ExternalLink,
  Lock
} from 'lucide-react';
import { 
  fetchJiraConfig, 
  saveJiraConfig, 
  deleteJiraConfig, 
  testJiraConnection, 
  JiraConfig 
} from '@/lib/api';
import { useStore } from '@/store/useStore';

export function JiraConfigCard() {
  const { addToast } = useStore();
  const [siteUrl, setSiteUrl] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [hourlyCap, setHourlyCap] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

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
      const config = await fetchJiraConfig();
      if (config) {
        setSiteUrl(config.siteUrl || '');
        setProjectKey(config.projectKey || '');
        setUserEmail(config.userEmail || '');
        setApiToken(config.apiToken || '');
        setIssueType(config.issueType || 'Task');
        setHourlyCap(config.hourlyCap || 10);
        setEnabled(config.enabled ?? true);
        setLastError(config.lastError || null);
        setHasExistingConfig(true);
      } else {
        setHasExistingConfig(false);
      }
    } catch (err: any) {
      console.warn('Could not load Jira configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!siteUrl.trim() || !projectKey.trim() || !userEmail.trim() || !apiToken.trim()) {
      addToast({ message: 'Please provide Site URL, Project Key, Email, and API Token to test.', type: 'warning' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testJiraConnection({
        siteUrl: siteUrl.trim(),
        projectKey: projectKey.trim().toUpperCase(),
        userEmail: userEmail.trim(),
        apiToken: apiToken.trim(),
      });
      setTestResult({
        success: true,
        message: res.project?.name 
          ? `Connected to "${res.project.name}" (${res.project.key}) successfully.` 
          : res.message || 'Connection verified successfully.'
      });
      setLastError(null);
      addToast({ message: 'Jira connection verified successfully.', type: 'success' });
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to Jira.';
      setTestResult({ success: false, message: msg });
      addToast({ message: msg, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim() || !projectKey.trim() || !userEmail.trim() || !apiToken.trim()) {
      addToast({ message: 'Please fill out all required Jira fields.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<JiraConfig> = {
        siteUrl: siteUrl.trim(),
        projectKey: projectKey.trim().toUpperCase(),
        userEmail: userEmail.trim(),
        apiToken: apiToken.trim(),
        issueType: issueType.trim() || 'Task',
        hourlyCap: Number(hourlyCap) || 10,
        enabled,
      };

      const saved = await saveJiraConfig(payload);
      setHasExistingConfig(true);
      setApiToken(saved.apiToken || '••••••••••••');
      setLastError(null);
      addToast({ message: 'Jira configuration saved securely.', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save Jira configuration.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to disconnect Jira? Alerts will no longer create Jira tickets.')) {
      return;
    }

    try {
      await deleteJiraConfig();
      setSiteUrl('');
      setProjectKey('');
      setUserEmail('');
      setApiToken('');
      setIssueType('Task');
      setHourlyCap(10);
      setEnabled(true);
      setLastError(null);
      setHasExistingConfig(false);
      setTestResult(null);
      addToast({ message: 'Jira integration disconnected.', type: 'info' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to disconnect Jira.', type: 'error' });
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
          <div className="h-10 w-10 rounded-lg bg-[#0052CC]/10 text-[#0052CC] flex items-center justify-center font-bold">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Jira Cloud Integration
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
              Automatically creates incident tickets in Jira Cloud when an AI agent action is BLOCKED with high risk.
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

      {/* Security & Feature Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-2">
        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
          <Lock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">Zero-Exposure Security: </span>
            Jira API credentials are AES-256-GCM encrypted at rest. PII (SSNs, Card numbers, emails) is automatically redacted before ticket creation.
          </div>
        </div>
        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">Required Permissions: </span>
            Your Atlassian API token only requires <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[11px] font-mono">Browse Projects</code> and <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[11px] font-mono">Create Issues</code> scopes.
          </div>
        </div>
      </div>

      {lastError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Last Delivery Error:</div>
            <div className="mt-0.5 font-mono text-[11px]">{lastError}</div>
          </div>
        </div>
      )}

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
            <span className="font-bold">{testResult.success ? 'Success: ' : 'Test Failed: '}</span>
            {testResult.message}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Site URL */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Jira Site URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              The root URL of your Jira Cloud instance.
            </p>
          </div>

          {/* Project Key */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Project Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="SEC, AI, or ENG"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono uppercase"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Target project key where incident tickets will be created.
            </p>
          </div>

          {/* User Email */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Atlassian Account Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="security@company.com"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Email address associated with the Jira API token.
            </p>
          </div>

          {/* API Token */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Jira API Token <span className="text-red-500">*</span>
              </label>
              <a 
                href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-indigo-500 hover:text-indigo-400 flex items-center gap-0.5"
              >
                Generate Token <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <input
              type="password"
              required
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Atlassian API Token"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Never exposed after saving. Encrypted with AES-256-GCM.
            </p>
          </div>

          {/* Issue Type */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Issue Type
            </label>
            <input
              type="text"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              placeholder="Task, Bug, or Incident"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Must match an issue type name available in your Jira project (default: <span className="font-mono">Task</span>).
            </p>
          </div>

          {/* Hourly Cap */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Hourly Ticket Cap
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={hourlyCap}
              onChange={(e) => setHourlyCap(Math.max(1, parseInt(e.target.value) || 10))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Maximum individual tickets created per hour. Over this cap, extra incidents roll into a single summary ticket.
            </p>
          </div>
        </div>

        {/* Enabled Checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="jira-enabled-toggle"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <label htmlFor="jira-enabled-toggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            Enable Jira Ticket Dispatch for BLOCKED + High Risk Incidents
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={testing || saving}
            onClick={handleTestConnection}
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
