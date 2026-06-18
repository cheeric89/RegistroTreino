// src/components/profile/PRsView.jsx
// Lista de récords personales (mejor peso × reps levantado por ejercicio).
// Componente puro de presentación — toda la lógica de dónde vienen los
// datos (Supabase vs. cálculo local) vive en hooks/usePRs.js.

import { Trophy, Medal } from "lucide-react";
import { usePRs } from "../../hooks/usePRs";

export default function PRsView() {
  const { prs, loading } = usePRs();

  if (loading) {
    return <p className="prs-loading">Cargando tus récords…</p>;
  }

  if (!prs || prs.length === 0) {
    return (
      <div className="empty-state">
        <p>Aún no tienes récords registrados.</p>
        <p>¡Completa un entrenamiento para empezar a sumar marcas!</p>
      </div>
    );
  }

  return (
    <div className="prs-list">
      {prs.map((pr, i) => (
        <div key={pr.exercise_key || pr.exercise_name || i} className="pr-row">
          <div className="pr-row-rank">
            {i === 0 ? (
              <Trophy size={16} className="pr-rank-gold" />
            ) : (
              <Medal size={14} className="pr-rank-icon" />
            )}
          </div>
          <div className="pr-row-body">
            <span className="pr-row-name">{pr.exercise_name}</span>
            <span className="pr-row-meta">
              {pr.best_weight > 0 ? `${pr.best_weight} kg` : "—"} × {pr.best_reps || "—"} reps
            </span>
          </div>
          <div className="pr-row-volume">
            <span className="pr-row-volume-num">{Math.round(pr.best_volume)}</span>
            <span className="pr-row-volume-label">vol.</span>
          </div>
        </div>
      ))}
    </div>
  );
}