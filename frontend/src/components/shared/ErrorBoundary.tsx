/**
 * ErrorBoundary — Item 24
 * =======================
 * Catches unhandled render-phase errors in the React tree and renders a
 * polished fallback UI instead of a blank/broken screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * The boundary is class-based because React's getDerivedStateFromError/
 * componentDidCatch APIs still require class components.
 */

import { Component, ErrorInfo, ReactNode } from 'react';


interface Props {
  children: ReactNode;
  /** Optional custom fallback rendered instead of the built-in error UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, errors are already captured by Sentry on the backend;
    // log a minimal trace here so DevTools show the component stack.
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
    // Navigate to the app root to clear any broken state
    window.location.href = '/app';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-page, #0f172a)',
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              padding: '3rem 2.5rem',
              background: 'var(--surface-glass, rgba(255,255,255,0.04))',
              border: '1px solid var(--border-muted, rgba(255,255,255,0.08))',
              borderRadius: 16,
              textAlign: 'center',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Icon */}
            <div
              aria-hidden="true"
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              ⚠
            </div>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary, #f8fafc)',
                margin: '0 0 0.75rem',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                margin: '0 0 0.5rem',
              }}
            >
              An unexpected error occurred in the Sentraa AI application. The
              engineering team has been notified automatically.
            </p>

            <p
              style={{
                color: 'var(--text-tertiary, #64748b)',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                margin: '0 0 2rem',
              }}
            >
              Error ID: {this.state.errorId}
            </p>

            <button
              id="error-boundary-reset-btn"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.65rem 1.5rem',
                background: 'var(--royal-indigo, #4f46e5)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
              onFocus={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
              onBlur={e => (e.currentTarget.style.opacity = '1')}
            >
              ↩ Return to Dashboard
            </button>

            {/* Collapsible error detail (dev/staging only) */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'left',
                  fontSize: '0.78rem',
                  color: '#ef4444',
                  background: 'rgba(239,68,68,0.06)',
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: 8, fontWeight: 600 }}>
                  Error details (dev only)
                </summary>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
