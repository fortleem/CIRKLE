"use client";

import { Component, type ReactNode } from "react";
import { captureError } from "@/lib/error-monitoring";

interface Props {
  children: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary — catches render errors per screen.
 * Shows a friendly error message with retry button.
 * Bilingual fallback (English + Arabic).
 *
 * Every caught error is forwarded to the lightweight error-monitoring
 * service (see `src/lib/error-monitoring.ts`) so it lands in the
 * `/api/monitoring/errors` admin buffer alongside server-side errors.
 * In production the same call site can be re-pointed to Sentry by
 * editing only `error-monitoring.ts`.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.screenName || "unknown"}]`, error, errorInfo);
    // Forward to the monitoring service. The componentStack is the most
    // useful piece for reproducing the render-time failure.
    captureError(error, {
      screenName: this.props.screenName || "unknown",
      source: "ErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "home" } }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="font-display text-xl mb-1">Something went wrong</h2>
          <p className="text-xs text-muted-foreground mb-1">حاجة وقعت</p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            {this.props.screenName ? `Screen: ${this.props.screenName}` : "An unexpected error occurred."}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-full bg-gradient-gold text-charcoal text-xs font-medium hover:scale-105 transition"
            >
              Try again · حاول تاني
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 rounded-full glass text-xs font-medium hover:bg-muted/40 transition"
            >
              Go home · ارجع الرئيسية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
