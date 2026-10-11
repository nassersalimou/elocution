import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleNavigateBack = () => {
    window.location.href = '/entrainement';
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.gameTitle
        ? `Impossible de charger ${this.props.gameTitle}`
        : 'Une erreur inattendue est survenue';

      return (
        <div className="page game-container animate-fade-in" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div className="card" style={{ maxWidth: '540px', margin: '2rem auto', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Une exception a empêché l'affichage de l'activité. Vos données et votre progression restent intactes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={this.handleRetry}
              >
                Réessayer
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={this.handleNavigateBack}
              >
                Retour aux entraînements
              </button>
            </div>

            {this.state.error && (
              <details style={{ textAlign: 'left', marginTop: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--violet-light)', fontWeight: 600 }}>
                  Détails techniques (développement)
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem', color: '#f87171' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
