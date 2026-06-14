// src/components/workoutsummary.jsx
// Programación defensiva completa: todos los accesos a propiedades usan
// encadenamiento opcional (?.) y valores por defecto (|| 0 / [])
import { CheckCircle, Flame, BarChart2, Home } from "lucide-react";

export default function WorkoutSummary({ workout, onDone }) {
  // Guard: si no llegan datos, no renderizamos nada
  if (!workout) return null;

  // "exercises" es el array de categorías guardado por WorkoutForm
  // Soportamos tanto "exercises" como "categories" por compatibilidad retroactiva
  const exerciseCats = workout.exercises ?? workout.categories ?? [];

  // ── Cálculo defensivo de totales ──────────────────────
  const totalSets = exerciseCats.reduce((acc, cat) => {
    const catSets = (cat?.exercises ?? []).reduce(
      (a, ex) => a + (ex?.sets?.length ?? 0),
      0
    );
    return acc + catSets;
  }, 0);

  const totalVolume = exerciseCats.reduce((acc, cat) => {
    const catVol = (cat?.exercises ?? []).reduce((a, ex) => {
      const exVol = (ex?.sets ?? []).reduce((s, set) => {
        const w = parseFloat(set?.weight) || 0;
        const r = parseInt(set?.reps, 10) || 0;
        return s + w * r;
      }, 0);
      return a + exVol;
    }, 0);
    return acc + catVol;
  }, 0);

  const totalExercises = exerciseCats.reduce(
    (acc, cat) => acc + (cat?.exercises?.length ?? 0),
    0
  );

  return (
    <div className="screen summary-screen">
      {/* Éxito hero */}
      <div className="summary-hero">
        <div className="success-ring">
          <CheckCircle size={36} className="success-icon" />
        </div>
        <h1 className="summary-title">¡Sesión completada!</h1>
        <p className="summary-sub">
          {workout.day ?? "Entrenamiento"} · {workout.date ?? ""}
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{totalSets}</span>
          <span className="stat-label">Series</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{exerciseCats.length}</span>
          <span className="stat-label">Músculos</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {totalVolume > 0
              ? totalVolume.toLocaleString("es-CL")
              : "—"}
          </span>
          <span className="stat-label">Vol. kg</span>
        </div>
      </div>

      {/* Calentamiento (opcional) */}
      {workout.warmup && (workout.warmup.weight || workout.warmup.reps) && (
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
          <span>
            {totalExercises} ejercicio{totalExercises !== 1 ? "s" : ""} registrado
            {totalExercises !== 1 ? "s" : ""}
          </span>
        </div>

        {exerciseCats.length === 0 && (
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>
            No se registraron ejercicios.
          </p>
        )}

        {exerciseCats.map((cat, ci) => (
          <div key={ci} className="summary-cat">
            <div className="summary-cat-name">
              <span className="cat-dot cat-dot--sm" />
              {cat?.name ?? "Sin nombre"}
            </div>

            {(cat?.exercises ?? []).length === 0 && (
              <p style={{ color: "var(--text-3)", fontSize: 13, paddingLeft: 16 }}>
                Sin ejercicios.
              </p>
            )}

            {(cat?.exercises ?? []).map((ex, ei) => {
              const sets = ex?.sets ?? [];
              const doneSets = sets.filter((s) => s?.done).length;
              return (
                <div key={ei} className="summary-exercise">
                  <div className="summary-ex-row">
                    <span className="summary-ex-name">{ex?.name ?? "Ejercicio"}</span>
                    <span className="summary-ex-sets">
                      {doneSets}/{sets.length} series
                    </span>
                  </div>
                  <div className="summary-sets-list">
                    {sets.map((s, si) => (
                      <span
                        key={si}
                        className="summary-set-chip"
                        style={
                          s?.done
                            ? { borderColor: "var(--success)", color: "var(--success)" }
                            : {}
                        }
                      >
                        {s?.reps || "—"}×{s?.weight ? `${s.weight}kg` : "—"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sticky-footer">
        <button type="button" className="cta-button" onClick={onDone}>
          <Home size={18} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}