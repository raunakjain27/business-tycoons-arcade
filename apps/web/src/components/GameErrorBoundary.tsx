import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useHubStore } from '../hubStore';
import { reportTelemetry } from '../errorTelemetry';

interface Props {
  children: ReactNode;
  fallbackGameName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GameErrorBoundary caught an unhandled exception:', error, errorInfo);
    reportTelemetry({
      type: 'error',
      message: error?.message || 'Component Crash',
      stack: error?.stack,
      context: { componentStack: errorInfo?.componentStack },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnToHub = () => {
    this.setState({ hasError: false, error: null });
    try {
      useHubStore.getState().setView('dashboard');
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '32px 24px',
            background: 'linear-gradient(145deg, rgba(26, 22, 37, 0.95), rgba(15, 12, 22, 0.98))',
            borderRadius: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(16px)',
            color: '#f8fafc',
            textAlign: 'center',
            margin: '20px auto',
            maxWidth: '600px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            🕹️
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #f87171, #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            Mini-Game Interrupted
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: '#94a3b8',
              margin: '0 0 24px 0',
              maxWidth: '420px',
              lineHeight: 1.5,
            }}
          >
            An unexpected error occurred in this game session. Don't worry—your coins, level progress, and overall streak are safe!
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              🔄 Reload Mini-Game
            </button>

            <button
              onClick={this.handleReturnToHub}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🏠 Return to Arcade Hub
            </button>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details
              style={{
                marginTop: '24px',
                textAlign: 'left',
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f87171',
                fontFamily: 'monospace',
                overflowX: 'auto',
              }}
            >
              <summary style={{ cursor: 'pointer', color: '#94a3b8', marginBottom: '6px' }}>
                Technical Details
              </summary>
              {this.state.error.toString()}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
