import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { showErrorBox } from '@/lib/error-tracker';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Tampilkan error box
    showErrorBox('💥 REACT ERROR BOUNDARY', {
      'Error': error.message,
      'Component': errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
    }, 'error');
    
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
          <div className="max-w-md w-full text-center">
            <div className="animate-bounce mb-6">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Terjadi Kesalahan
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Maaf, aplikasi mengalami masalah. Silakan coba muat ulang halaman.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-sm font-mono text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-red-500 dark:text-red-400 mt-2 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Muat Ulang
              </Button>
              <Link to="/">
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  className="w-full sm:w-auto"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ke Beranda
                </Button>
              </Link>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
              Jika masalah berlanjut, hubungi support kami
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook untuk error handling
export function useErrorHandler() {
  return (error: Error) => {
    showErrorBox('💥 HANDLED ERROR', {
      'Error': error.message,
      'Stack': error.stack?.split('\n')[0] || 'N/A',
    }, 'error');
    console.error('Handled error:', error);
  };
}
