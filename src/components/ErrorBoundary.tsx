"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", background: "#050308", color: "#e6e6e6",
          fontFamily: "'Noto Serif SC', serif", padding: "2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "1.2rem", color: "#d4af37", marginBottom: "1rem" }}>审判中断</div>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1.5rem" }}>
            因子波动异常，审判过程被强制终止。
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: "0.7rem", letterSpacing: "0.2em",
              color: "#d4af37", background: "none", border: "1px solid rgba(212,175,55,0.3)",
              padding: "0.5rem 1.5rem", cursor: "pointer", borderRadius: 2,
            }}
          >
            重新审判
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
