import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let display = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(display) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        display = `Cloud sync issue (${parsed.operationType || 'request'} on ${parsed.path || 'data'}): ${parsed.error}`;
      }
    } catch {
      // plain error message
    }
    return { hasError: true, message: display };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reload FindMyBites
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
