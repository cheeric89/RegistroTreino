import { useMemo } from "react";
import {
  BarChart3,
  Calendar,
  Dumbbell,
  Flame,
  LineChart,
  TrendingUp,
} from "lucide-react";
import { useWorkoutContext } from "../../contexts/WorkoutContext";
import {
  getCurrentStreak,
  getSessionsInLastDays,
  getTotalSessions,
  getTotalVolume,
} from "../../utils/workoutStats";

const DAY_MS = 24 * 60 * 60 * 1000;

const getWorkoutVolume = (workout) => {
  const storedVolume = Number(workout?.volume);
  if (Number.isFinite(storedVolume) && storedVolume > 0) return storedVolume;

  return (workout?.exercises || []).reduce(
    (workoutTotal, category) =>
      workoutTotal +
      (category?.exercises || []).reduce(
        (categoryTotal, exercise) =>
          categoryTotal +
          (exercise?.sets || []).reduce((setTotal, set) => {
            const weight = Number(set?.weight);
            const reps = Number(set?.reps);
            return setTotal + (Number.isFinite(weight) && Number.isFinite(reps) ? weight * reps : 0);
          }, 0),
        0
      ),
    0
  );
};

const formatVolume = (value) => Math.round(value).toLocaleString("es-CL");

export default function ProgressView() {
  const { workouts } = useWorkoutContext();
  const totalSessions = getTotalSessions(workouts);
  const totalVolume = getTotalVolume(workouts);
  const streak = getCurrentStreak(workouts);
  const weekCount = getSessionsInLastDays(workouts, 7);

  const weeklyVolume = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(today.getTime() - (6 - index) * DAY_MS);
      const nextDay = new Date(dayStart.getTime() + DAY_MS);
      const volume = workouts.reduce((sum, workout) => {
        const timestamp = Number(workout?.timestamp);
        if (!Number.isFinite(timestamp) || timestamp < dayStart.getTime() || timestamp >= nextDay.getTime()) {
          return sum;
        }
        return sum + getWorkoutVolume(workout);
      }, 0);

      return {
        key: dayStart.toISOString(),
        label: new Intl.DateTimeFormat("es-CL", { weekday: "short" })
          .format(dayStart)
          .replace(".", "")
          .toUpperCase(),
        volume,
      };
    });
  }, [workouts]);

  const muscleDistribution = useMemo(() => {
    const totals = new Map();

    workouts.forEach((workout) => {
      (workout?.exercises || []).forEach((category) => {
        const categoryName = category?.name?.trim() || "Sin categoría";
        const categoryVolume = (category?.exercises || []).reduce(
          (categoryTotal, exercise) =>
            categoryTotal +
            (exercise?.sets || []).reduce((setTotal, set) => {
              const weight = Number(set?.weight);
              const reps = Number(set?.reps);
              return setTotal + (Number.isFinite(weight) && Number.isFinite(reps) ? weight * reps : 0);
            }, 0),
          0
        );

        totals.set(categoryName, (totals.get(categoryName) || 0) + categoryVolume);
      });
    });

    return [...totals.entries()]
      .map(([name, volume]) => ({ name, volume }))
      .filter((item) => item.volume > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [workouts]);

  const weeklyMax = Math.max(...weeklyVolume.map((item) => item.volume), 1);
  const muscleMax = Math.max(...muscleDistribution.map((item) => item.volume), 1);

  return (
    <div className="progress-view">
      <section className="progress-stats-grid" aria-label="Resumen de progreso">
        <article className="progress-stat-card">
          <span className="progress-stat-card__icon"><Flame size={21} /></span>
          <div className="progress-stat-card__content">
            <span>Racha actual</span>
            <strong>{streak}</strong>
            <small>{streak === 1 ? "día consecutivo" : "días consecutivos"}</small>
          </div>
        </article>

        <article className="progress-stat-card">
          <span className="progress-stat-card__icon"><Dumbbell size={21} /></span>
          <div className="progress-stat-card__content">
            <span>Sesiones totales</span>
            <strong>{totalSessions}</strong>
            <small>entrenamientos guardados</small>
          </div>
        </article>

        <article className="progress-stat-card">
          <span className="progress-stat-card__icon"><Calendar size={21} /></span>
          <div className="progress-stat-card__content">
            <span>Esta semana</span>
            <strong>{weekCount}</strong>
            <small>{weekCount === 1 ? "sesión completada" : "sesiones completadas"}</small>
          </div>
        </article>

        <article className="progress-stat-card">
          <span className="progress-stat-card__icon"><TrendingUp size={21} /></span>
          <div className="progress-stat-card__content">
            <span>Volumen acumulado</span>
            <strong>{totalVolume > 0 ? formatVolume(totalVolume) : "—"}</strong>
            <small>kilogramos movidos</small>
          </div>
        </article>
      </section>

      <div className="progress-analytics-grid">
        <section className="progress-panel">
          <header className="progress-panel__header">
            <div>
              <span className="card-kicker">Últimos 7 días</span>
              <h2>Volumen semanal</h2>
              <p>Cuánto peso acumulaste en cada jornada.</p>
            </div>
            <span className="progress-panel__icon"><LineChart size={21} /></span>
          </header>

          <div className="progress-bars-list">
            {weeklyVolume.map((item) => (
              <div key={item.key} className="progress-bar-row">
                <span>{item.label}</span>
                <progress value={item.volume} max={weeklyMax} aria-label={`${item.label}: ${formatVolume(item.volume)} kg`} />
                <strong>{formatVolume(item.volume)} kg</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="progress-panel">
          <header className="progress-panel__header">
            <div>
              <span className="card-kicker">Distribución</span>
              <h2>Grupos musculares</h2>
              <p>Dónde se concentra tu volumen registrado.</p>
            </div>
            <span className="progress-panel__icon"><BarChart3 size={21} /></span>
          </header>

          {muscleDistribution.length > 0 ? (
            <div className="progress-bars-list">
              {muscleDistribution.map((item) => (
                <div key={item.name} className="progress-bar-row progress-bar-row--muscle">
                  <span>{item.name}</span>
                  <progress value={item.volume} max={muscleMax} aria-label={`${item.name}: ${formatVolume(item.volume)} kg`} />
                  <strong>{formatVolume(item.volume)} kg</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="progress-empty-state">
              <Dumbbell size={24} />
              <strong>Aún no hay volumen suficiente</strong>
              <p>Registra pesos y repeticiones para visualizar tu distribución.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
