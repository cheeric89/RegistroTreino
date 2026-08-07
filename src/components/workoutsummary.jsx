import { BarChart2, CheckCircle, Flame, Home } from "lucide-react";

export default function WorkoutSummary({ workout, onDone }) {
  if (!workout) return null;

  const exerciseCategories = workout.exercises ?? workout.categories ?? [];
  const totalSets = exerciseCategories.reduce(
    (total, category) =>
      total +
      (category?.exercises ?? []).reduce(
        (categoryTotal, exercise) => categoryTotal + (exercise?.sets?.length ?? 0),
        0
      ),
    0
  );

  const totalVolume = exerciseCategories.reduce(
    (total, category) =>
      total +
      (category?.exercises ?? []).reduce(
        (categoryTotal, exercise) =>
          categoryTotal +
          (exercise?.sets ?? []).reduce(
            (setTotal, set) =>
              setTotal + (Number(set?.weight) || 0) * (Number(set?.reps) || 0),
            0
          ),
        0
      ),
    0
  );

  const totalExercises = exerciseCategories.reduce(
    (total, category) => total + (category?.exercises?.length ?? 0),
    0
  );

  return (
    <div className="screen summary-screen flow-screen">
      <div className="summary-hero">
        <div className="success-ring">
          <CheckCircle size={36} className="success-icon" />
        </div>
        <span className="page-eyebrow">Entrenamiento guardado</span>
        <h1 className="summary-title">¡Sesión completada!</h1>
        <p className="summary-sub">
          {workout.day ?? "Entrenamiento"} · {workout.date ?? ""}
        </p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{totalSets}</span>
          <span className="stat-label">Series</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{exerciseCategories.length}</span>
          <span className="stat-label">Músculos</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {totalVolume > 0 ? totalVolume.toLocaleString("es-CL") : "—"}
          </span>
          <span className="stat-label">Vol. kg</span>
        </div>
      </div>

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

      <div className="summary-block">
        <div className="summary-block-header">
          <BarChart2 size={14} className="summary-icon" />
          <span>
            {totalExercises} ejercicio{totalExercises !== 1 ? "s" : ""} registrado
            {totalExercises !== 1 ? "s" : ""}
          </span>
        </div>

        {exerciseCategories.length === 0 && (
          <p className="summary-empty-copy">No se registraron ejercicios.</p>
        )}

        {exerciseCategories.map((category, categoryIndex) => (
          <div key={`${category?.name}-${categoryIndex}`} className="summary-cat">
            <div className="summary-cat-name">
              <span className="cat-dot cat-dot--sm" />
              {category?.name ?? "Sin nombre"}
            </div>

            {(category?.exercises ?? []).length === 0 && (
              <p className="summary-empty-copy summary-empty-copy--indented">Sin ejercicios.</p>
            )}

            {(category?.exercises ?? []).map((exercise, exerciseIndex) => {
              const sets = exercise?.sets ?? [];
              const doneSets = sets.filter((set) => set?.done).length;
              return (
                <div key={`${exercise?.name}-${exerciseIndex}`} className="summary-exercise">
                  <div className="summary-ex-row">
                    <span className="summary-ex-name">{exercise?.name ?? "Ejercicio"}</span>
                    <span className="summary-ex-sets">{doneSets}/{sets.length} series</span>
                  </div>
                  <div className="summary-sets-list">
                    {sets.map((set, setIndex) => (
                      <span
                        key={`${setIndex}-${set?.weight}-${set?.reps}`}
                        className={`summary-set-chip ${set?.done ? "summary-set-chip--done" : ""}`}
                      >
                        {set?.reps || "—"}×{set?.weight ? `${set.weight}kg` : "—"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sticky-footer">
        <button type="button" className="cta-button" onClick={onDone}>
          <Home size={18} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
