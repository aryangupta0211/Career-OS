import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CareerOS ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div
          style={{
            padding: '32px',
            maxWidth: '640px',
            margin: '80px auto',
            background: 'var(--surface, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--line, #334155)',
            color: 'var(--foreground, #f8fafc)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#ef4444' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.875rem', marginBottom: '16px' }}>
            CareerOS encountered an unexpected error while rendering this view.
          </p>
          {this.state.error?.message && (
            <pre
              style={{
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                overflowX: 'auto',
                marginBottom: '16px',
                color: '#fca5a5',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Reload Workspace
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
