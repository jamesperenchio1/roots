import { Component, type ReactNode } from 'react';
import { Leaf, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { withTranslation, type WithTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryBase extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, { contexts: { react: errorInfo as unknown as Record<string, unknown> } });
    }
  }

  render() {
    const { t, children, fallback } = this.props;
    if (this.state.hasError) {
      if (fallback) return fallback;
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <Leaf className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-light mb-2">{t('errorBoundary.title')}</h1>
            <p className="text-zinc-500 text-sm mb-6">
              {t('errorBoundary.description')}
            </p>
            {this.state.error && (
              <div className="bg-zinc-900 border border-white/5 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs text-zinc-600 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('errorBoundary.refresh')}
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-2 border border-white/20 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                <Home className="w-4 h-4" />
                {t('errorBoundary.goHome')}
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return children;
  }
}

const ErrorBoundary = withTranslation('common')(ErrorBoundaryBase);
export default ErrorBoundary;
