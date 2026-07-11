import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label to identify which boundary tripped (for logs) */
  name?: string;
  /** If true, render a minimal inline fallback instead of a full-page one */
  inline?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error.message || "Unexpected error";

    if (this.props.inline) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive">Something went wrong</p>
              <p className="text-muted-foreground mt-1 break-words">{message}</p>
              <button
                onClick={this.reset}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2 break-words">{message}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              <Home className="h-4 w-4" /> Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
