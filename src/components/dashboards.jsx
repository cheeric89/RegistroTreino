import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  MoreVertical,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { deleteWorkout, getAllWorkouts } from "../utils/storage";

const DAY_MS = 24 * 60 * 60 * 1000;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
};

const getDisplayName = (profile, user) =>
  profile?.alias?.trim() || user?.email?.split("@")[0] || "Atleta";

const getWorkoutTimestamp = (workout) => {
  if (Number.isFinite(workout?.timestamp)) return workout.timestamp;
  return 0;
};

const getWorkoutVolume = (workout) => {
  if (Number.isFinite(Number(workout?.volume))) return Number(workout.volume);

  return (workout?.exercises || []).reduce(
    (total, category) =>
      total +
      (category?.exercises || []).reduce(
        (categoryTotal, exercise) =>
          categoryTotal +
          (exercise?.sets || []).reduce(
            (setTotal, set) =>
              setTotal + (Number(set?.weight) || 0) * (Number(set?.reps) || 0),
            0
          ),
        0
      ),
    0
  );
};

const getWorkoutDuration = (workout) => Number(workout?.duration) || 0;

const formatDuration = (seconds) => {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

const getCategories = (workout) => {
  if (Array.isArray(workout?.categories) && workout.categories.length) {
    return workout.categories;
  }
  return (workout?.exercises || []).map((category) => category?.name).filter(Boolean);
};

const startOfLocalDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const calculateStreak = (workouts) => {
  const days = new Set(
    workouts
      .map(getWorkoutTimestamp)
      .filter(Boolean)
      .map(startOfLocalDay)
  );

  if (!days.size) return 0;

  const today = startOfLocalDay(Date.now());
  let cursor = days.has(today) ? today : today - DAY_MS;
  let streak = 0;

  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }

  return streak;
};

export default function Dashboard({ user, profile, onStart, onOpenWorkout, onRepeatWorkout }) {
  const [workouts, setWorkouts] = useState(() => getAllWorkouts());
  const [pendingDelete, setPendingDelete] = useState(null);

  const dashboardData = useMemo(() => {
    const sorted = [...workouts].sort(
      (a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a)
    );
    const sevenDaysAgo = Date.now() - 7 * DAY_MS;
    const week = sorted.filter((workout) => getWorkoutTimestamp(workout) >= sevenDaysAgo);

    return {
      recent: sorted.slice(0, 4),
      latest: sorted[0] || null,
      sessions: week.length,
      volume: week.reduce((total, workout) => total + getWorkoutVolume(workout), 0),
      duration: week.reduce((total, workout) => total + getWorkoutDuration(workout), 0),
      streak: calculateStreak(sorted),
    };
  }, [workouts]);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const deleted = deleteWorkout(pendingDelete.timestamp);
    if (deleted) {
      setWorkouts((current) =>
        current.filter((workout) => workout.timestamp !== pendingDelete.timestamp)
      );
      toast.success("Sesión eliminada");
    } else {
      toast.error("No se pudo eliminar la sesión");
    }
    setPendingDelete(null);
  };

  const displayName = getDisplayName(profile, user);
  const latestCategories = getCategories(dashboardData.latest);

  return (
    <div className="dashboard-screen page-shell">
      <section className="dashboard-intro">
        <div>
          <p className="dashboard-greeting">
            {getGreeting()}, <strong>{displayName}</strong>
          </p>
          <h1>Haz que cada sesión sume.</h1>
          <p className="dashboard-intro__copy">
            Registra lo que levantas, recupera tus marcas anteriores y mantén visible tu progreso.
          </p>
        </div>
        <div className="dashboard-streak" aria-label={`${dashboardData.streak} días de racha`}>
          <Flame size={18} />
          <span>{dashboardData.streak}</span>
          <small>días</small>
        </div>
      </section>

      <section className="dashboard-primary-grid" aria-label="Acciones principales">
        <article className="start-workout-card">
          <div className="start-workout-card__glow" />
          <div className="start-workout-card__icon" aria-hidden="true">
            <Dumbbell size={26} />
          </div>
          <div className="start-workout-card__content">
            <span className="card-kicker">Entrenamiento de hoy</span>
            <h2>Empieza una nueva sesión</h2>
            <p>Elige una plantilla o arma tu rutina desde cero.</p>
          </div>
          <button type="button" className="primary-action-button" onClick={onStart}>
            <Play size={18} fill="currentColor" />
            Iniciar entrenamiento
            <ArrowRight size={18} />
          </button>
        </article>

        <aside className="week-summary-card">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="card-kicker">Últimos 7 días</span>
              <h2>Tu semana</h2>
            </div>
            <TrendingUp size={20} />
          </div>

          <div className="week-summary-grid">
            <div className="metric-tile">
              <CalendarDays size={17} />
              <strong>{dashboardData.sessions}</strong>
              <span>sesiones</span>
            </div>
            <div className="metric-tile">
              <Dumbbell size={17} />
              <strong>{Math.round(dashboardData.volume).toLocaleString("es-CL")}</strong>
              <span>kg de volumen</span>
            </div>
            <div className="metric-tile metric-tile--wide">
              <Clock3 size={17} />
              <strong>{formatDuration(dashboardData.duration)}</strong>
              <span>tiempo entrenado</span>
            </div>
          </div>
        </aside>
      </section>

      {dashboardData.latest && (
        <section className="continue-card">
          <div className="continue-card__icon" aria-hidden="true">
            <RotateCcw size={21} />
          </div>
          <div className="continue-card__body">
            <span className="card-kicker">Continúa progresando</span>
            <h2>Repite tu última sesión: {dashboardData.latest.day || "Entrenamiento"}</h2>
            <div className="continue-card__meta">
              <span>{dashboardData.latest.date || "Fecha no disponible"}</span>
              {latestCategories.length > 0 && (
                <span>{latestCategories.slice(0, 3).join(" · ")}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="secondary-action-button"
            onClick={() => onRepeatWorkout(dashboardData.latest)}
          >
            Repetir
            <ArrowRight size={17} />
          </button>
        </section>
      )}

      <section className="recent-workouts-section">
        <div className="section-heading">
          <div>
            <span className="card-kicker">Historial reciente</span>
            <h2>Últimas sesiones</h2>
          </div>
          <Sparkles size={20} />
        </div>

        {dashboardData.recent.length > 0 ? (
          <div className="recent-workouts-grid">
            {dashboardData.recent.map((workout, index) => {
              const categories = getCategories(workout);
              return (
                <article
                  key={workout.timestamp || `${workout.day}-${index}`}
                  className="recent-workout-card"
                >
                  <button
                    type="button"
                    className="recent-workout-card__main"
                    onClick={() => onOpenWorkout(workout)}
                  >
                    <div className="recent-workout-card__topline">
                      <span className="recent-workout-card__day">
                        {workout.day || "Entrenamiento"}
                      </span>
                      <span className="recent-workout-card__date">
                        {workout.date || "Sin fecha"}
                      </span>
                    </div>
                    <div className="recent-workout-card__categories">
                      {categories.length > 0 ? (
                        categories.slice(0, 3).map((category) => (
                          <span key={category}>{category}</span>
                        ))
                      ) : (
                        <span>Rutina personalizada</span>
                      )}
                    </div>
                    <div className="recent-workout-card__stats">
                      <span>
                        <Clock3 size={14} />
                        {formatDuration(getWorkoutDuration(workout))}
                      </span>
                      <span>
                        <Dumbbell size={14} />
                        {Math.round(getWorkoutVolume(workout)).toLocaleString("es-CL")} kg
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="recent-workout-card__menu"
                    onClick={() => setPendingDelete(workout)}
                    aria-label={`Eliminar sesión ${workout.day || "guardada"}`}
                  >
                    <MoreVertical size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-state__icon">
              <Dumbbell size={24} />
            </div>
            <h3>Tu historial empieza aquí</h3>
            <p>Completa tu primera sesión para ver estadísticas y recuperar tus marcas.</p>
            <button type="button" className="secondary-action-button" onClick={onStart}>
              Crear primera sesión
            </button>
          </div>
        )}
      </section>

      {pendingDelete && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirmation-dialog__icon confirmation-dialog__icon--danger">
              <Trash2 size={22} />
            </div>
            <h2 id="delete-workout-title">¿Eliminar esta sesión?</h2>
            <p>
              Se eliminará “{pendingDelete.day || "Entrenamiento"}” del {pendingDelete.date || "historial"}.
              Esta acción no se puede deshacer.
            </p>
            <div className="confirmation-dialog__actions">
              <button type="button" className="dialog-button" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
              <button type="button" className="dialog-button dialog-button--danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
