'use client';
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log errors for debugging — can be wired to an error reporting service
    console.error('[CRM ErrorBoundary]', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] mx-3 sm:mx-4 md:mx-6 p-3 sm:p-4 md:p-8">
          <div className="flex flex-col items-center gap-6 p-10 rounded-2xl max-w-lg w-full bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/20 border border-emerald-100 dark:border-emerald-900/40 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/25">
              <AlertTriangle className="h-6 w-6 sm:h-10 sm:w-10 text-white" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h2>
              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-sm">
                {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
            {this.state.error?.stack && (
              <pre className="text-xs font-mono text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-[40vh] overflow-auto w-full whitespace-pre-wrap break-words">
                {this.state.error.stack}
              </pre>
            )}
            <Button
              onClick={() => this.setState({ hasError: false })}
              className="gap-2 min-h-[44px] min-w-[44px] touch-manipulation w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
