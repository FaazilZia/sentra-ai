import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Play,
  Upload,
  Info,
  Server,
  ShieldAlert,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  fetchConnectors,
  createConnector,
  testConnector,
  scanConnector,
  deleteConnector,
  ConnectorItem,
  CreateConnectorPayload,
} from '@/lib/api';
import { useStore } from '@/store/useStore';

function getStatusBadgeClass(status: string): string {
  if (status === 'active') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (status === 'error') {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function InboundConnectorsCard() {
  const addToast = useStore((state) => state.addToast);

  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'postgres' | 's3' | 'gdrive' | 'slack'>('postgres');

  // Postgres fields
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDatabase, setPgDatabase] = useState('postgres');
  const [pgUser, setPgUser] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [pgSchema, setPgSchema] = useState('public');
  const [pgSsl, setPgSsl] = useState(true);
  const [pgAllowSelfSigned, setPgAllowSelfSigned] = useState(false);

  // S3 fields
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3AccessKeyId, setS3AccessKeyId] = useState('');
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('');

  // GDrive fields
  const [gdriveEmail, setGdriveEmail] = useState('');
  const [gdrivePrivateKey, setGdrivePrivateKey] = useState('');

  // Slack fields
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackIncludePrivate, setSlackIncludePrivate] = useState(false);
  const [showSlackToken, setShowSlackToken] = useState(false);

  // Action states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; warning?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const res = await fetchConnectors();
      setConnectors(res.data || []);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to load connectors', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnectors();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text);
        if (parsed.client_email) setGdriveEmail(parsed.client_email);
        if (parsed.private_key) setGdrivePrivateKey(parsed.private_key);
        addToast({ message: 'Service account JSON loaded successfully', type: 'info' });
      } catch {
        addToast({ message: 'Invalid JSON file format', type: 'error' });
      }
    }).catch(() => {
      addToast({ message: 'Failed to read file', type: 'error' });
    });
  };

  const buildPayload = (): CreateConnectorPayload => {
    if (type === 'postgres') {
      return {
        name,
        type: 'postgres',
        config: {
          schema: pgSchema || 'public',
          ssl: pgSsl,
          allowSelfSigned: pgAllowSelfSigned,
        },
        credentials: {
          host: pgHost,
          port: Number(pgPort) || 5432,
          database: pgDatabase,
          user: pgUser,
          password: pgPassword,
          allowSelfSigned: pgAllowSelfSigned,
        },
      };
    }

    if (type === 's3') {
      return {
        name,
        type: 's3',
        config: {
          bucketName: s3Bucket,
          region: s3Region,
        },
        credentials: {
          bucketName: s3Bucket,
          region: s3Region,
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
      };
    }

    if (type === 'gdrive') {
      return {
        name,
        type: 'gdrive',
        config: {
          client_email: gdriveEmail,
        },
        credentials: {
          client_email: gdriveEmail,
          private_key: gdrivePrivateKey,
        },
      };
    }

    return {
      name,
      type: 'slack',
      config: {
        includePrivateChannels: slackIncludePrivate,
      },
      credentials: {
        botToken: slackBotToken.trim(),
      },
    };
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = buildPayload();
      const res = await testConnector({
        type: payload.type,
        config: payload.config,
        credentials: payload.credentials,
      });

      if (res.success) {
        const isWarning = Boolean(
          res.warning ||
          res.message?.includes('0 readable file') ||
          res.message?.includes('0 readable channel')
        );
        setTestResult({
          success: true,
          warning: isWarning,
          message: res.message || (isWarning ? 'Connected, but 0 readable items were found in scope.' : 'Connection test successful!'),
        });
        addToast({
          message: isWarning ? (res.message || 'Connected, but 0 readable items found in scope') : 'Connection test passed!',
          type: isWarning ? 'warning' : 'info',
        });
      } else {
        setTestResult({
          success: false,
          warning: false,
          message: res.message || 'Connection test failed',
        });
        addToast({ message: res.message || 'Connection test failed', type: 'error' });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Connection test failed';
      setTestResult({
        success: false,
        warning: false,
        message: errMsg,
      });
      addToast({ message: errMsg, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ message: 'Connector name is required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      await createConnector(payload);
      addToast({ message: `Connector "${name}" added and queued for initial scan`, type: 'info' });
      setShowAddForm(false);
      setName('');
      setTestResult(null);
      setPgAllowSelfSigned(false);
      setSlackBotToken('');
      setSlackIncludePrivate(false);
      await loadConnectors();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to save connector', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerScan = async (id: string, connName: string) => {
    try {
      setScanningId(id);
      await scanConnector(id);
      addToast({ message: `Scan initiated for "${connName}"`, type: 'info' });
      setTimeout(() => {
        void loadConnectors();
      }, 2000);
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to trigger scan', type: 'error' });
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (id: string, connName: string) => {
    if (!window.confirm(`Are you sure you want to delete connector "${connName}"?`)) return;

    try {
      setDeletingId(id);
      await deleteConnector(id);
      addToast({ message: `Connector "${connName}" deleted`, type: 'info' });
      await loadConnectors();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete connector', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const renderTypeIcon = (connType: string) => {
    switch (connType) {
      case 'postgres':
      case 'sql':
        return <Database className="h-4 w-4 text-blue-400" />;
      case 's3':
        return <Cloud className="h-4 w-4 text-amber-400" />;
      case 'gdrive':
        return <HardDrive className="h-4 w-4 text-emerald-400" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <Server className="h-4 w-4 text-zinc-400" />;
    }
  };

  const renderTypeLabel = (connType: string) => {
    switch (connType) {
      case 'postgres':
      case 'sql':
        return 'PostgreSQL';
      case 's3':
        return 'Amazon S3';
      case 'gdrive':
        return 'Google Drive';
      case 'slack':
        return 'Slack Workspace';
      default:
        return connType.toUpperCase();
    }
  };

  const renderConnectorsContent = () => {
    if (loading) {
      return (
        <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-xs uppercase tracking-wider font-bold">Loading inbound connectors...</span>
        </div>
      );
    }

    if (connectors.length === 0) {
      return (
        <div className="py-10 text-center bg-black/5 rounded border border-dashed border-[var(--border-default)]">
          <Database className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            No Inbound Connectors Configured
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-md mx-auto">
            Connect a PostgreSQL database, Amazon S3 bucket, Google Drive folder, or Slack workspace to begin scanning your enterprise assets for sensitive data.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {connectors.map((c) => {
          const hasError = Boolean(c.last_error);
          return (
            <div
              key={c.id}
              className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded p-4 space-y-3 transition-colors hover:border-[var(--royal-indigo)]/50"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-black/10 border border-[var(--border-default)]">
                    {renderTypeIcon(c.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--text-primary)]">{c.name}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-black/10 text-[var(--text-secondary)] border-[var(--border-default)]">
                        {renderTypeLabel(c.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
                      <span>
                        Last scan:{' '}
                        <strong className="text-[var(--text-secondary)]">
                          {c.last_scan_at ? new Date(c.last_scan_at).toLocaleString() : 'Never'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Calls: <strong className="text-[var(--text-secondary)]">{c.total_api_calls || 0}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Health Score:{' '}
                        <strong className={c.health_score < 80 ? 'text-amber-400' : 'text-emerald-400'}>
                          {c.health_score}%
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${getStatusBadgeClass(c.status)}`}
                  >
                    {c.status}
                  </span>

                  <button
                    onClick={() => handleTriggerScan(c.id, c.name)}
                    disabled={scanningId === c.id}
                    type="button"
                    className="flex items-center gap-1 px-3 py-1 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-semibold uppercase tracking-wider text-[var(--text-primary)] transition-all disabled:opacity-50"
                    title="Trigger scan"
                  >
                    <RefreshCw className={`h-3 w-3 ${scanningId === c.id ? 'animate-spin' : ''}`} />
                    Scan Now
                  </button>

                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    type="button"
                    className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete connector"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Show last_error if present */}
              {hasError && (
                <div className="bg-red-500/10 border border-red-500/25 rounded p-2.5 text-xs text-red-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <strong className="text-[10px] font-bold uppercase tracking-wider block">
                      Last Scan Error:
                    </strong>
                    <span className="text-[11px] leading-relaxed text-red-300">{c.last_error}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card-base p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--royal-indigo)]" />
              Inbound Data Connectors
            </h3>
            <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
              Phase 3 Live
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            Connect enterprise data sources to scan schema metadata and files for sensitive PII/secrets. Protected by SSRF guards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadConnectors}
            disabled={loading}
            type="button"
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 rounded transition-colors"
            title="Refresh connectors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setTestResult(null);
            }}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-semibold uppercase tracking-widest transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? 'Close Form' : 'Add Connector'}
          </button>
        </div>
      </div>

      {/* Add Connector Form */}
      {showAddForm && (
        <form onSubmit={handleSaveConnector} className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded p-5 mb-6 space-y-4">
          <div className="border-b border-[var(--border-default)]/60 pb-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
              Configure New Inbound Connector
            </h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Credentials are encrypted using AES-256-GCM and never returned in plain text.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="conn-name" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                Connector Name *
              </label>
              <input
                id="conn-name"
                type="text"
                required
                placeholder="e.g. Analytics Data Warehouse"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              />
            </div>

            <div>
              <label htmlFor="conn-type" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                Data Source Type *
              </label>
              <select
                id="conn-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as any);
                  setTestResult(null);
                }}
                className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              >
                <option value="postgres">PostgreSQL (Metadata Only)</option>
                <option value="s3">Amazon S3</option>
                <option value="gdrive">Google Drive</option>
                <option value="slack">Slack Workspace</option>
              </select>
            </div>
          </div>

          {/* Type 1: PostgreSQL */}
          {type === 'postgres' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded p-3 text-[10px] text-blue-300">
                <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <strong className="font-semibold block uppercase tracking-wide">PostgreSQL Metadata Only:</strong>{' '}
                  Sentraa scans schema metadata (tables and columns via <code className="font-mono text-white">information_schema</code>) to detect sensitive schema designs. We NEVER query or store customer row data. Please use a read-only database user.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="pg-host" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Database Host *
                  </label>
                  <input
                    id="pg-host"
                    type="text"
                    required
                    placeholder="db.yourcompany.com"
                    value={pgHost}
                    onChange={(e) => setPgHost(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
                <div>
                  <label htmlFor="pg-port" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Port
                  </label>
                  <input
                    id="pg-port"
                    type="number"
                    value={pgPort}
                    onChange={(e) => setPgPort(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pg-database" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Database Name *
                  </label>
                  <input
                    id="pg-database"
                    type="text"
                    required
                    value={pgDatabase}
                    onChange={(e) => setPgDatabase(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
                <div>
                  <label htmlFor="pg-schema" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Schema (Default: public)
                  </label>
                  <input
                    id="pg-schema"
                    type="text"
                    value={pgSchema}
                    onChange={(e) => setPgSchema(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pg-user" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Database User (Read-Only) *
                  </label>
                  <input
                    id="pg-user"
                    type="text"
                    required
                    placeholder="sentraa_readonly"
                    value={pgUser}
                    onChange={(e) => setPgUser(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
                <div>
                  <label htmlFor="pg-password" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Password *
                  </label>
                  <input
                    id="pg-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={pgPassword}
                    onChange={(e) => setPgPassword(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    id="pg-ssl"
                    type="checkbox"
                    checked={pgSsl}
                    onChange={(e) => setPgSsl(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--royal-indigo)] rounded cursor-pointer"
                  />
                  <label htmlFor="pg-ssl" className="text-[10px] font-semibold text-[var(--text-secondary)] cursor-pointer">
                    Require SSL Connection (Recommended)
                  </label>
                </div>

                {pgSsl && (
                  <div className="flex items-center gap-2 pl-5">
                    <input
                      id="pg-allow-self-signed"
                      type="checkbox"
                      checked={pgAllowSelfSigned}
                      onChange={(e) => setPgAllowSelfSigned(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--royal-indigo)] rounded cursor-pointer"
                    />
                    <label htmlFor="pg-allow-self-signed" className="text-[10px] font-semibold text-amber-400/90 cursor-pointer">
                      Allow self-signed certificate (not recommended)
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Type 2: Amazon S3 */}
          {type === 's3' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded p-3 text-[10px] text-amber-300">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong className="font-semibold block uppercase tracking-wide">Minimum IAM Permissions:</strong>{' '}
                  Requires only <code className="font-mono text-white">s3:ListBucket</code> and <code className="font-mono text-white">s3:GetObject</code> on target bucket.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s3-bucket" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    Bucket Name *
                  </label>
                  <input
                    id="s3-bucket"
                    type="text"
                    required
                    placeholder="my-company-vault"
                    value={s3Bucket}
                    onChange={(e) => setS3Bucket(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
                <div>
                  <label htmlFor="s3-region" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    AWS Region *
                  </label>
                  <input
                    id="s3-region"
                    type="text"
                    required
                    value={s3Region}
                    onChange={(e) => setS3Region(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s3-access-key-id" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    AWS Access Key ID *
                  </label>
                  <input
                    id="s3-access-key-id"
                    type="text"
                    required
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={s3AccessKeyId}
                    onChange={(e) => setS3AccessKeyId(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
                <div>
                  <label htmlFor="s3-secret-access-key" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                    AWS Secret Access Key *
                  </label>
                  <input
                    id="s3-secret-access-key"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={s3SecretAccessKey}
                    onChange={(e) => setS3SecretAccessKey(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type 3: Google Drive */}
          {type === 'gdrive' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded p-3 text-[10px] text-emerald-300">
                <Info className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <strong className="font-semibold block uppercase tracking-wide">Service Account Integration:</strong>{' '}
                  Share target Google Drive folders with the Service Account email as a &ldquo;Viewer&rdquo;. Upload the downloaded JSON key file or paste the private key below.
                </div>
              </div>

              <div className="border border-dashed border-[var(--border-default)] rounded p-4 text-center bg-black/5">
                <Upload className="h-5 w-5 text-[var(--text-secondary)] mx-auto mb-1.5" />
                <label htmlFor="gdrive-json-upload" className="text-xs font-semibold text-[var(--royal-indigo)] hover:underline cursor-pointer block">
                  Upload Service Account JSON (.json)
                </label>
                <input
                  id="gdrive-json-upload"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Automatically extracts client_email and private_key from file
                </p>
              </div>

              <div>
                <label htmlFor="gdrive-email" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Service Account Client Email *
                </label>
                <input
                  id="gdrive-email"
                  type="email"
                  required
                  placeholder="sentraa-reader@my-project.iam.gserviceaccount.com"
                  value={gdriveEmail}
                  onChange={(e) => setGdriveEmail(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div>
                <label htmlFor="gdrive-private-key" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Private Key (Pasted in any newline format) *
                </label>
                <textarea
                  id="gdrive-private-key"
                  rows={4}
                  required
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...&#10;-----END PRIVATE KEY-----"
                  value={gdrivePrivateKey}
                  onChange={(e) => setGdrivePrivateKey(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>
            </div>
          )}

          {/* Type 4: Slack Workspace */}
          {type === 'slack' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded p-3 text-[10px] text-purple-300">
                <Info className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
                <div>
                  <strong className="font-semibold block uppercase tracking-wide">Slack Inbound Scanning:</strong>{' '}
                  Sentraa scans public and configured workspace channels for PII and compliance violations using your Slack App Bot User OAuth Token.
                  <strong className="text-white"> Zero raw message text or file content is stored.</strong> Only findings and metadata are retained.
                </div>
              </div>

              <div>
                <label htmlFor="slack-bot-token" className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Bot User OAuth Token *
                </label>
                <div className="relative">
                  <input
                    id="slack-bot-token"
                    type={showSlackToken ? 'text' : 'password'}
                    required
                    placeholder="xoxb-your-slack-bot-token"
                    value={slackBotToken}
                    onChange={(e) => setSlackBotToken(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSlackToken(!showSlackToken)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    title={showSlackToken ? 'Hide token' : 'Show token'}
                  >
                    {showSlackToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Must start with <code className="font-mono text-white">xoxb-</code>. Stored encrypted at rest with AES-256-GCM.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="slack-include-private"
                  type="checkbox"
                  checked={slackIncludePrivate}
                  onChange={(e) => setSlackIncludePrivate(e.target.checked)}
                  className="rounded border-[var(--border-default)] bg-[var(--card-bg)] text-[var(--royal-indigo)] focus:ring-[var(--royal-indigo)]/20"
                />
                <label htmlFor="slack-include-private" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Include private channels (requires bot to be invited to each private channel)
                </label>
              </div>

              <div className="bg-black/5 border border-[var(--border-default)] rounded p-3 text-[10px] space-y-1.5 text-[var(--text-secondary)]">
                <div className="flex items-center text-[var(--text-primary)] font-semibold uppercase tracking-wide">
                  <Info className="h-3.5 w-3.5 text-purple-400 mr-1.5" />
                  Required Slack Bot Token Scopes
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li><code className="font-mono text-purple-300">channels:read</code> — View public channels in workspace</li>
                  <li><code className="font-mono text-purple-300">channels:history</code> — Read message history for compliance scanning</li>
                  <li><code className="font-mono text-purple-300">files:read</code> — Scan attached documents and text files for PII</li>
                  <li><code className="font-mono text-[var(--text-muted)]">groups:read</code>, <code className="font-mono text-[var(--text-muted)]">groups:history</code> (Optional, for private channels)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Test Result Message Banner */}
          {testResult && (
            <div
              className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                testResult.warning
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {testResult.warning ? (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              ) : testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold block uppercase tracking-wider text-[10px]">
                  {testResult.warning ? 'Warning' : testResult.success ? 'Test Passed' : 'Test Failed'}
                </span>
                <span className="text-[11px] leading-relaxed mt-0.5 block">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-[var(--border-default)]/60">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="px-4 py-2 bg-black/5 hover:bg-black/10 text-[var(--text-primary)] border border-[var(--border-default)] rounded text-[9px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Connector'}
            </button>
          </div>
        </form>
      )}

      {/* Connectors Table / List */}
      {renderConnectorsContent()}
    </div>
  );
}
