import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/** Keeps one broken page from blanking the whole app: shows a message and a retry button instead. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('AstroTwin page error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="workspace-empty" role="alert">
      <h2>This page hit a problem.</h2>
      <p>Your flights are saved. Try again, or go back to the workspace.</p>
      <p className="field-note">{this.state.error.message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 18 }}>
        <button className="button button-light" onClick={() => this.setState({ error: null })}>Try again</button>
        <a className="button button-outline" href="#/">Go to workspace</a>
      </div>
    </div>;
  }
}
