import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, isLoading, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading || workspaces.length === 0) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '8px',
          border: '1px solid rgba(99,102,241,0.3)',
          background: 'rgba(99,102,241,0.1)',
          color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem',
          transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>🗂</span>
        <span style={{ fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentWorkspace?.name || 'Default'}
        </span>
        <span style={{ color: '#6366f1', fontSize: '0.7rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          minWidth: '220px', overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #334155' }}>
            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Workspaces
            </span>
          </div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => { switchWorkspace(ws); setIsOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', border: 'none', textAlign: 'left',
                background: currentWorkspace?.id === ws.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: '#e2e8f0', cursor: 'pointer', fontSize: '0.85rem',
                transition: 'background 0.15s', fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: currentWorkspace?.id === ws.id ? 'rgba(99,102,241,0.3)' : 'rgba(71,85,105,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: currentWorkspace?.id === ws.id ? '#818cf8' : '#94a3b8',
                flexShrink: 0,
              }}>
                {ws.name.slice(0, 2).toUpperCase()}
              </span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: currentWorkspace?.id === ws.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ws.name}
                </div>
                {ws.is_default && (
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Default</div>
                )}
              </div>
              {currentWorkspace?.id === ws.id && (
                <span style={{ color: '#6366f1', fontSize: '0.9rem' }}>✓</span>
              )}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #334155', padding: '8px' }}>
            <a
              href="/app/settings/workspaces"
              style={{
                display: 'block', textAlign: 'center', padding: '8px',
                color: '#6366f1', fontSize: '0.8rem', textDecoration: 'none',
                borderRadius: '6px', transition: 'background 0.15s',
              }}
            >
              + Manage Workspaces
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default WorkspaceSwitcher;
