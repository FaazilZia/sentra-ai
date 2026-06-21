import React, { useState, useEffect, useCallback } from 'react';
import { ShareModal } from '@/components/shared/ShareModal';

interface AuditLog {
  id: string;
  action: string;
  event_type: string;
  severity: string;
  resource_type: string;
  resource_id: string;
  outcome: string;
  ip_address: string;
  timestamp: string;
  user?: { full_name: string; email: string };
}

interface ChainStatus {
  valid: boolean;
  totalChecked: number;
  brokenAt?: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  USER_ACTION: '#6366f1',
  SYSTEM: '#8b5cf6',
  SECURITY: '#ef4444',
  GOVERNANCE: '#f59e0b',
  AUTH: '#3b82f6',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
};

const AuditExplorer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [filters, setFilters] = useState({
    eventType: '', severity: '', search: '', fromDate: '', toDate: '',
  });

  const limit = 50;
  const pages = Math.ceil(total / limit);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters.eventType) params.set('eventType', filters.eventType);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.search) params.set('search', filters.search);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);

      const res = await fetch(`/api/v1/audit?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data && data.success) { 
        setLogs(data.logs || []); 
        setTotal(data.total || 0); 
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setLogs([]);
      setTotal(0);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/v1/audit/verify', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setChainStatus(data.data);
    } finally { setVerifying(false); }
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/audit/export?format=${format}`, { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `audit-logs.${format}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            🔍 Audit Log Explorer
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.875rem' }}>
            Immutable, hash-chained audit trail — {total.toLocaleString()} total entries
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsShareOpen(true)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)',
              background: '#ffffff', color: 'var(--royal-indigo)', cursor: 'pointer', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600
            }}
          >
            🔗 Share
          </button>
          <button
            onClick={verifyChain}
            disabled={verifying}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)',
              background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {verifying ? '⟳ Verifying...' : '🔐 Verify Chain'}
          </button>
          <button
            onClick={() => exportLogs('csv')}
            disabled={exporting}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)',
              background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            {exporting ? 'Exporting...' : '⬇ CSV'}
          </button>
          <button
            onClick={() => exportLogs('json')}
            disabled={exporting}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)',
              background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            ⬇ JSON
          </button>
        </div>
      </div>

      {/* Chain Integrity Status */}
      {chainStatus && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
          background: chainStatus.valid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${chainStatus.valid ? '#22c55e' : '#ef4444'}`,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '1.2rem' }}>{chainStatus.valid ? '✅' : '🚨'}</span>
          <div>
            <strong style={{ color: chainStatus.valid ? '#22c55e' : '#ef4444' }}>
              {chainStatus.valid ? 'Chain Intact' : 'Chain Broken!'}
            </strong>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.8rem' }}>
              {chainStatus.totalChecked} entries verified
              {!chainStatus.valid && ` — broken at entry ${chainStatus.brokenAt}`}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px', marginBottom: '20px',
        background: '#ffffff', padding: '16px', borderRadius: '12px',
        border: '1px solid var(--border-default)',
      }}>
        <input
          placeholder="🔎 Search action, resource..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={inputStyle}
        />
        <select value={filters.eventType} onChange={e => setFilters(f => ({ ...f, eventType: e.target.value }))} style={inputStyle}>
          <option value="">All Event Types</option>
          <option value="USER_ACTION">User Action</option>
          <option value="SECURITY">Security</option>
          <option value="GOVERNANCE">Governance</option>
          <option value="AUTH">Auth</option>
          <option value="SYSTEM">System</option>
        </select>
        <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))} style={inputStyle}>
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <input type="date" value={filters.fromDate} onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} style={inputStyle} />
        <input type="date" value={filters.toDate} onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))} style={inputStyle} />
        <button onClick={() => { setPage(1); fetchLogs(); }}
          style={{ ...inputStyle, background: '#6366f1', color: 'var(--text-primary)', cursor: 'pointer', border: 'none', fontWeight: 600 }}>
          Apply Filters
        </button>
      </div>

      {/* Log Table */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['Timestamp', 'User', 'Action', 'Event Type', 'Severity', 'Resource', 'Outcome', 'IP'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No audit logs found</td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : '#ffffff', transition: 'background 0.15s' }}>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                  <div>{log.user?.full_name || '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{log.user?.email}</div>
                </td>
                <td style={{ padding: '10px 16px', color: '#a78bfa', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {log.action}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    background: `${EVENT_TYPE_COLORS[log.event_type] || '#475569'}22`,
                    color: EVENT_TYPE_COLORS[log.event_type] || '#94a3b8',
                  }}>{log.event_type}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    color: SEVERITY_COLORS[log.severity] || '#94a3b8',
                  }}>{log.severity}</span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {log.resource_type && <span style={{ color: '#6366f1' }}>{log.resource_type}</span>}
                  {log.resource_id && <span style={{ color: 'var(--text-muted)' }}>/{log.resource_id?.slice(0, 8)}</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    background: log.outcome === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: log.outcome === 'success' ? '#22c55e' : '#ef4444',
                  }}>{log.outcome}</span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                  {log.ip_address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>← Prev</button>
          <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Page {page} of {pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={pageBtnStyle}>Next →</button>
        </div>
      )}
      <ShareModal
        resourceType="audit"
        resourceId={null}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)',
  background: '#ffffff', color: 'var(--text-secondary)', fontSize: '0.875rem', outline: 'none',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)',
  background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
};

export default AuditExplorer;
