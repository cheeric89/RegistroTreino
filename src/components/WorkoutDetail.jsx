import { ChevronLeft, Clock3, Dumbbell, RotateCcw } from "lucide-react";

const formatDuration = (seconds) => {
  if (!seconds) return "No disponible";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

export default function WorkoutDetail({ workout, onBack, onRepeat }) {
  if (!workout) return null;

  return (
    <div className="screen flow-screen workout-detail-screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Sesión guardada</span>
          <h2>{workout.day || "Entrenamiento"}</h2>
        </div>
      </div>

      <div className="form-scroll workout-detail-content">
        <section className="workout-detail-hero">
          <div className="workout-detail-hero__date">{workout.date || "Fecha no disponible"}</div>
          <div className="workout-detail-stats">
            <div>
              <Clock3 size={20} />
              <strong>{formatDuration(workout.duration)}</strong>
              <span>Duración</span>
            </div>
            <div>
              <Dumbbell size={20} />
              <strong>{Math.round(Number(workout.volume) || 0).toLocaleString("es-CL")} kg</strong>
              <span>Volumen</span>
            </div>
          </div>
        </section>

        <section className="repeat-workout-card">
          <span className="repeat-workout-card__icon"><RotateCcw size={21} /></span>
          <div>
            <span className="card-kicker">Usar como base</span>
            <h2>Repite este entrenamiento</h2>
            <p>Se copiarán los ejercicios y la cantidad de series para empezar una nueva sesión.</p>
          </div>
          <button type="button" className="secondary-action-button" onClick={() => onRepeat(workout)}>
            Repetir rutina
          </button>
        </section>

        <div className="workout-detail-categories">
          {(workout.exercises || []).map((category, categoryIndex) => (
            <section key={`${category.name}-${categoryIndex}`} className="workout-detail-category">
              <header>
                <span>{String(categoryIndex + 1).padStart(2, "0")}</span>
                <h2>{category.name || "Grupo muscular"}</h2>
              </header>

              <div className="workout-detail-exercises">
                {(category.exercises || []).map((exercise, exerciseIndex) => (
                  <article key={`${exercise.name}-${exerciseIndex}`} className="workout-detail-exercise">
                    <h3>{exercise.name || "Ejercicio sin nombre"}</h3>
                    <div className="workout-detail-sets">
                      {(exercise.sets || []).map((set, setIndex) => (
                        <div key={`${setIndex}-${set.weight}-${set.reps}`} className="workout-detail-set-row">
                          <span>Serie {setIndex + 1}</span>
                          <strong>{set.weight || 0} kg</strong>
                          <small>× {set.reps || 0} reps</small>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
