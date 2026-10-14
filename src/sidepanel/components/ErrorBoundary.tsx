import React from 'react';
import '../styles/paper.css';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="empty">
        <h2>Something smudged.</h2>
        <p className="note err">{this.state.error.message}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => window.location.reload()} type="button">
            Reload JobFill
          </button>
        </div>
      </main>
    );
  }
}
