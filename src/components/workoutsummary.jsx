// WorkoutSummary.jsx — Resumen de la sesión guardada
// Para extender:
//   - Agregar gráfico de volumen total (series × reps × peso) con recharts
//   - Comparar con la sesión anterior del mismo día
//   - Botón para compartir vía Web Share API

import { CheckCircle, Flame, BarChart2, ChevronRight, Home } from "lucide-react";

export default function WorkoutSummary({ workout, onDone }) {
  if (!workout) return null;

  // Calcula totales generales
  const totalSets = workout.exercises.reduce(
    (acc, cat) =>
      acc + cat.exercises.reduce((a, ex) => a + ex.sets.length, 0),
    0
  );
  const totalVolume = workout.exercises.reduce(
    (acc, cat) =>
      acc +
      cat.exercises.reduce(
        (a, ex) =>
          a +
          ex.sets.reduce(
            (s, set) =>
              s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0),
            0
          ),
        0
      ),
    0
  );

  return (
    <div className="screen summary-screen">
      {/* Éxito */}
      <div className="summary-hero">
        <div className="success-ring">
          <CheckCircle size={36} className="success-icon" />
        </div>
        <h1 className="summary-title">¡Sesión completada!</h1>
        <p className="summary-sub">
          {workout.day} · {workout.date}
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{totalSets}</span>
          <span className="stat-label">Series</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{workout.categories.length}</span>
          <span className="stat-label">Músculos</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {totalVolume > 0 ? `${totalVolume.toLocaleString("es-CL")}` : "—"}
          </span>
          <span className="stat-label">Vol. (kg)</span>
        </div>
      </div>

      {/* Calentamiento */}
      {(workout.warmup.weight || workout.warmup.reps) && (
        <div className="summary-block">
          <div className="summary-block-header">
            <Flame size={14} className="summary-icon summary-icon--warmup" />
            <span>Calentamiento</span>
          </div>
          <p className="warmup-summary-text">
            {workout.warmup.weight ? `${workout.warmup.weight} kg` : "—"} ·{" "}
            {workout.warmup.reps ? `${workout.warmup.reps} reps` : "—"}
          </p>
        </div>
      )}

      {/* Desglose por categoría */}
      <div className="summary-block">
        <div className="summary-block-header">
          <BarChart2 size={14} className="summary-icon" />
          <span>Ejercicios registrados</span>
        </div>
        {workout.exercises.map((cat) => (
          <div key={cat.name} className="summary-cat">
            <div className="summary-cat-name">
              <span className="cat-dot cat-dot--sm" />
              {cat.name}
            </div>
            {cat.exercises.map((ex, ei) => (
              <div key={ei} className="summary-exercise">
                <div className="summary-ex-row">
                  <span className="summary-ex-name">{ex.name}</span>
                  <span className="summary-ex-sets">{ex.sets.length} series</span>
                </div>
                <div className="summary-sets-list">
                  {ex.sets.map((s, si) => (
                    <span key={si} className="summary-set-chip">
                      {s.reps || "—"}×{s.weight ? `${s.weight}kg` : "—"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Botón volver */}
      <div className="sticky-footer">
        <button className="cta-button" onClick={onDone}>
          <Home size={18} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}