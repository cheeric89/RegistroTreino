import { useMemo } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  RotateCcw,
  Scale,
  Settings2,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import {
  HISTORY_GROUPS,
  getBestExerciseMarks,
  groupWorkouts,
} from "../utils/workoutHistory";
import NutritionBodyDashboard from "./NutritionBodyDashboard";
import SmartDashboard from "./SmartDashboard";

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
  if (Number.isFinite(Number(workout?.timestamp))) return Number(workout.timestamp);
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
  if (Array.isArray(workout?.categories) && workout.categories.length) return workout.categories;
  return (workout?.exercises || []).map((category) => category?.name).filter(Boolean);
};

const startOfLocalDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const calculateStreak = (workouts) => {
  const days = new Set(
    workouts.map(getWorkoutTimestamp).filter(Boolean).map(startOfLocalDay)
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

export default function Dashboard({
  user,
  profile,
  onStart,
  onStartRoutine,
  onManageRoutines,
  onOpenHistory,
  onRepeatWorkout,
  onQuickNutrition,
  onQuickBody,
}) {
  const { workouts, syncing, syncError } = useWorkoutContext();

  const dashboardData = useMemo(() => {
    const sorted = [...workouts].sort(
      (a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a)
    );
    const sevenDaysAgo = Date.now() - 7 * DAY_MS;
    const week = sorted.filter((workout) => getWorkoutTimestamp(workout) >= sevenDaysAgo);
    const grouped = groupWorkouts(sorted);

    const historyGroups = HISTORY_GROUPS.map((group) => {
      const sessions = grouped[group.id] || [];
      const bestMark = getBestExerciseMarks(sessions, 1)[0] || null;
      return {
        ...group,
        count: sessions.length,
        latest: sessions[0] || null,
        bestMark,
      };
    });

    return {
      latest: sorted[0] || null,
      sessions: week.length,
      volume: week.reduce((total, workout) => total + getWorkoutVolume(workout), 0),
      duration: week.reduce((total, workout) => total + getWorkoutDuration(workout), 0),
      streak: calculateStreak(sorted),
      historyGroups,
      totalWorkouts: sorted.length,
    };
  }, [workouts]);

  const displayName = getDisplayName(profile, user);
  const latestCategories = getCategories(dashboardData.latest);

  return (
    <div className="dashboard-screen page-shell">
      <section className="dashboard-intro">
        <div>
          <p className="dashboard-greeting">{getGreeting()}, <strong>{displayName}</strong></p>
          <h1>Haz que cada sesión sume.</h1>
          <p className="dashboard-intro__copy">
            Registra lo que levantas, recupera tus marcas anteriores y mantén visible tu progreso.
          </p>
          <p className="dashboard-sync-state" role="status">
            {syncing
              ? "Sincronizando entrenamientos…"
              : syncError
                ? "Modo offline · tus cambios se sincronizarán al reconectar"
                : "Historial sincronizado entre tus dispositivos"}
          </p>
        </div>
        <div className="dashboard-streak" aria-label={`${dashboardData.streak} días de racha`}>
          <Flame size={18} />
          <span>{dashboardData.streak}</span>
          <small>días</small>
        </div>
      </section>

      <section className="daily-quick-actions" aria-label="Acciones rápidas de hoy">
        <div className="daily-quick-actions__heading">
          <div><span className="card-kicker">Treino 1.5</span><h2>Hazlo en un toque</h2></div>
          <span>Daily Experience</span>
        </div>
        <div className="daily-quick-actions__grid">
          <button type="button" onClick={onStart}>
            <span><Dumbbell size={19} /></span>
            <div><strong>Entrenar</strong><small>Iniciar sesión</small></div>
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={onQuickNutrition}>
            <span><Utensils size={19} /></span>
            <div><strong>Comida</strong><small>Registrar rápido</small></div>
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={onQuickBody}>
            <span><Scale size={19} /></span>
            <div><strong>Peso</strong><small>Actualizar cuerpo</small></div>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="dashboard-primary-grid" aria-label="Acciones principales">
        <article className="start-workout-card">
          <div className="start-workout-card__glow" />
          <div className="start-workout-card__icon" aria-hidden="true"><Dumbbell size={26} /></div>
          <div className="start-workout-card__content">
            <span className="card-kicker">Entrenamiento</span>
            <h2>Empieza una nueva sesión</h2>
            <p>Abre cualquiera de tus rutinas guardadas o crea una sesión libre.</p>
          </div>
          <button type="button" className="primary-action-button" onClick={onStart}>
            <Play size={18} fill="currentColor" />
            Iniciar entrenamiento
            <ArrowRight size={18} />
          </button>
          <button type="button" className="secondary-action-button dashboard-routines-button" onClick={() => onManageRoutines?.("push")}>
            <Settings2 size={16} />
            Editar mis rutinas
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

      <SmartDashboard
        userId={user?.id}
        profile={profile}
        onStart={onStart}
        onStartRoutine={onStartRoutine}
        onManageRoutines={onManageRoutines}
      />

      <NutritionBodyDashboard profile={profile} />

      {dashboardData.latest && (
        <section className="continue-card">
          <div className="continue-card__icon" aria-hidden="true"><RotateCcw size={21} /></div>
          <div className="continue-card__body">
            <span className="card-kicker">Continúa progresando</span>
            <h2>Repite tu última sesión: {dashboardData.latest.day || "Entrenamiento"}</h2>
            <div className="continue-card__meta">
              <span>{dashboardData.latest.date || "Fecha no disponible"}</span>
              {latestCategories.length > 0 && <span>{latestCategories.slice(0, 3).join(" · ")}</span>}
            </div>
          </div>
          <button type="button" className="secondary-action-button" onClick={() => onRepeatWorkout(dashboardData.latest)}>
            Repetir
            <ArrowRight size={17} />
          </button>
        </section>
      )}

      <section className="history-overview-section">
        <div className="section-heading">
          <div>
            <span className="card-kicker">Tu historial</span>
            <h2>Push / Pull / Legs</h2>
          </div>
          <Sparkles size={20} />
        </div>

        {dashboardData.totalWorkouts > 0 ? (
          <div className="history-overview-grid">
            {dashboardData.historyGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`history-overview-card history-overview-card--${group.id}`}
                onClick={() => onOpenHistory?.(group.id)}
              >
                <div className="history-overview-card__topline">
                  <span>{group.label}</span>
                  <strong>{group.count}</strong>
                </div>
                <p>{group.subtitle}</p>
                <div className="history-overview-card__footer">
                  <div>
                    <small>Última sesión</small>
                    <span>{group.latest?.date || "Sin registros"}</span>
                  </div>
                  <div>
                    <small>Marca destacada</small>
                    <span>{group.bestMark ? `${group.bestMark.weight || 0} kg × ${group.bestMark.reps || 0}` : "—"}</span>
                  </div>
                  <ArrowRight size={17} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-state__icon"><Dumbbell size={24} /></div>
            <h3>Tu historial empieza aquí</h3>
            <p>Completa tu primera sesión para organizarla automáticamente y recuperar tus marcas.</p>
            <button type="button" className="secondary-action-button" onClick={onStart}>Crear primera sesión</button>
          </div>
        )}
      </section>
    </div>
  );
}
