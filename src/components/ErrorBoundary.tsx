import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Portfolio error:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="load-state">
          <p className="eyebrow">Something went wrong</p>
          <h1>A fresh start?</h1>
          <p>Please reload the page, or get in touch by email.</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <a href="mailto:jhardeyemor@gmail.com">jhardeyemor@gmail.com</a>
        </main>
      );
    return this.props.children;
  }
}
