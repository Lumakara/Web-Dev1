import React, { type ReactNode, type ReactElement } from 'react';
import { getErrorMessage, getErrorCode } from '@/lib/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('❌ Error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactElement {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback as ReactElement;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children as ReactElement;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  const isDev = import.meta.env.DEV;
  const errorMessage = error ? getErrorMessage(error) : 'Terjadi kesalahan tidak terduga';
  const errorCode = error ? getErrorCode(error) : 'UNKNOWN';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-soft-lg p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-accent/30 text-primary flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-primary">
            Terjadi Kesalahan Aplikasi
          </h1>
        </div>

        <div className="mb-4 p-4 bg-muted rounded-xl border border-border">
          <p className="text-primary text-sm font-medium">
            {errorMessage}
          </p>
          {isDev && (
            <p className="text-secondary text-xs mt-2 font-mono">
              Code: {errorCode}
            </p>
          )}
        </div>

        {isDev && error instanceof Error && (
          <details className="mb-4 text-xs text-left">
            <summary className="cursor-pointer text-muted-foreground font-mono">
              Stack trace
            </summary>
            <pre className="mt-2 p-2 bg-background rounded-lg border border-border overflow-auto max-h-40 text-muted-foreground">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-secondary transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2.5 bg-background border border-border text-primary rounded-xl font-semibold hover:bg-muted transition-colors"
          >
            Ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}

export function useErrorHandler(onError?: (error: Error) => void) {
  return (error: Error) => {
    console.error('Error caught:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  };
}

export function useAsyncError() {
  const [, setError] = React.useState();

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}
