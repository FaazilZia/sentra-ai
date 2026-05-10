import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">
              System Error
            </h2>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6">
              A rendering error occurred in this module. Your data is safe.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-rose-400/70 bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 mb-6 text-left overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Module
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
