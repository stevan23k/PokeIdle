import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="bg-surface-dark border-4 border-danger p-6 max-w-2xl w-full text-center shadow-[10px_10px_0_rgba(204,0,0,0.5)]">
            <AlertTriangle size={64} className="text-danger mx-auto mb-4" />
            <h1 className="font-display text-2xl text-danger mb-4">
              ERROR DEL SISTEMA
            </h1>
            <div className="bg-black/50 p-4 border border-border text-left overflow-auto max-h-64 font-body text-[0.7rem] text-danger-light wrap-break-word mb-6">
              {this.state.error?.toString() || "Unknown Error"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-danger border-2 border-danger-dark font-display text-white text-[0.8rem] hover:bg-danger-dark transition-colors"
            >
              REINICIAR JUEGO
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
