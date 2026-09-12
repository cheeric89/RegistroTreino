import { Component } from "react";

export function PageLoading({ label = "Cargando…" }) {
  return <div className="page-loading" role="status" aria-live="polite"><span className="app-loading-spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export default class PageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page-loading" role="alert">
        <strong>No pudimos abrir esta pantalla</strong>
        <p>Comprueba tu conexión e inténtalo otra vez.</p>
        <button type="button" className="primary-action-button" onClick={() => window.location.reload()}>Recargar Treino</button>
        <button type="button" className="secondary-action-button" onClick={this.props.onHome}>Volver a Inicio</button>
      </div>
    );
  }
}
