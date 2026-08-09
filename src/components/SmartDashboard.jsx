import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useRoutineContext } from "../contexts/RoutineContext";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { useProfile } from "../hooks/useProfile";
import {
  buildMuscleRecovery,
  buildPRDashboard,
  buildWeeklyMuscleStats,
  buildWorkoutHeatmap,
  canonicalMuscleName,
  getPRofMonth,
  getRoutineRecovery,
  getTodayRoutine,
} from "../utils/dashboardAnalytics";
import WeeklyPlanner from "./WeeklyPlanner";

const targetsKey = (userId) => `treino_muscle_targets:${userId || "guest"}`;

const readTargets = (userId) => {
  try {
    const raw = localStorage.getItem(targetsKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const heatLevel = (count) => {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
};

const formatHours = (hours) => {
  if (hours == null) return "sin registro";
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

const getTarget = (targets, muscle) => {
  const value = Number(targets[muscle]);
  return Number.isFinite(value) && value > 0 ? value : 10;
};

export default function SmartDashboard({
  userId,
  onStartRoutine,
  onManageRoutines,
}) {
  const { workouts } = useWorkoutContext();
  const { routines } = useRoutineContext();
  const { profile, saving: profileSaving, saveProfile } = useProfile();
  const [targets, setTargets] = useState(() => readTargets(userId));

  useEffect(() => {
    setTargets(readTargets(userId));
  }, [userId]);

  const analytics = useMemo(() => {
    const heatmap = buildWorkoutHeatmap(workouts);
    const weekly = buildWeeklyMuscleStats(workouts);
    const recovery = buildMuscleRecovery(workouts);
    const today = getTodayRoutine(routines, workouts, profile?.weekly_plan || {});
    const todayRecovery = getRoutineRecovery(today?.routine, recovery);
    const prs = buildPRDashboard(workouts);
    const prOfMonth = getPRofMonth(workouts);

    const routineMuscles = [...new Set(
      routines.flatMap((routine) =>
        (routine.categories || []).map((category) => canonicalMuscleName(category.name))
      )
    )];
    const weeklyMap = new Map(weekly.map((item) => [item.muscle, item]));
    const muscleRows = [...new Set([...routineMuscles, ...weekly.map((item) => item.muscle)])]
      .map((muscle) => weeklyMap.get(muscle) || { muscle, sets: 0, volume: 0, sessions: 0 })
      .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle, "es"));

    return { heatmap, weekly, recovery, today, todayRecovery, prs, prOfMonth, muscleRows };
  }, [profile?.weekly_plan, routines, workouts]);

  const updateTarget = (muscle, value) => {
    const target = Math.min(40, Math.max(1, Number(value) || 1));
    setTargets((current) => {
      const next = { ...current, [muscle]: target };
      try {
        localStorage.setItem(targetsKey(userId), JSON.stringify(next));
      } catch {
        // Preferencia local opcional.
      }
      return next;
    });
  };

  if (!workouts.length && !routines.length) return null;

  return (
    <section className="smart-dashboard" aria-label="Treino Smart Dashboard">
      <WeeklyPlanner
        profile={profile}
        saving={profileSaving}
        saveProfile={saveProfile}
        onStartRoutine={onStartRoutine}
      />

      {analytics.today && (
        <article className={`today-training-card today-training-card--${analytics.todayRecovery.state}`}>
          <div className="today-training-card__main">
            <div className="today-training-card__eyebrow">
              <Sparkles size={14} />
              <span>{analytics.today.scheduled ? "PROGRAMADO PARA HOY" : "SUGERENCIA DE HOY"}</span>
            </div>
            <div className="today-training-card__title">
              <span aria-hidden="true">{analytics.today.routine.emoji || "💪"}</span>
              <div>
                <h2>{analytics.today.routine.name}</h2>
                <p>{analytics.today.routine.description || "Tu próxima sesión sugerida"}</p>
              </div>
            </div>

            <div className="today-training-card__metrics">
              <span><Clock3 size={15} /><strong>~{analytics.today.estimatedMinutes} min</strong><small>estimados</small></span>
              <span><TrendingUp size={15} /><strong>{analytics.today.progressionOpportunities}</strong><small>subidas de peso</small></span>
              <span><Target size={15} /><strong>{analytics.today.plateauCount}</strong><small>estancamientos</small></span>
              <span className={`is-${analytics.todayRecovery.state}`}><Flame size={15} /><strong>{analytics.todayRecovery.label}</strong><small>recuperación estimada</small></span>
            </div>
          </div>

          <div className="today-training-card__actions">
            <button
              type="button"
              className="primary-action-button"
              onClick={() => onStartRoutine?.(analytics.today.routine)}
            >
              <Dumbbell size={17} /> Empezar {analytics.today.routine.name} <ArrowRight size={17} />
            </button>
            <button type="button" className="secondary-action-button" onClick={() => onManageRoutines?.(analytics.today.type)}>
              Ver {analytics.today.routine.name}
            </button>
          </div>
        </article>
      )}

      <div className="smart-dashboard__two-column">
        <article className="training-heatmap-card">
          <header className="smart-card-heading">
            <div>
              <span className="card-kicker">Constancia</span>
              <h2>Tu año entrenando</h2>
            </div>
            <CalendarDays size={19} />
          </header>
          <div className="training-heatmap-scroll" aria-label="Mapa anual de entrenamientos">
            <div className="training-heatmap">
              {analytics.heatmap.map((day) => (
                <span
                  key={day.timestamp}
                  className={`training-heatmap__day level-${heatLevel(day.count)}`}
                  title={`${day.date.toLocaleDateString("es-CL")}: ${day.count} ${day.count === 1 ? "sesión" : "sesiones"}`}
                  aria-label={`${day.date.toLocaleDateString("es-CL")}: ${day.count} sesiones`}
                />
              ))}
            </div>
          </div>
          <footer className="training-heatmap-legend">
            <span>Menos</span>
            {[0, 1, 2, 3].map((level) => <i key={level} className={`level-${level}`} />)}
            <span>Más</span>
          </footer>
        </article>

        <article className="recovery-card">
          <header className="smart-card-heading">
            <div>
              <span className="card-kicker">Tiempo desde la última sesión</span>
              <h2>Recuperación muscular</h2>
            </div>
            <Flame size={19} />
          </header>
          <p className="recovery-card__note">Estimación simple por tiempo transcurrido; no reemplaza cómo te sientes ni tu recuperación real.</p>
          <div className="recovery-list">
            {analytics.recovery.slice(0, 8).map((item) => (
              <div key={item.muscle} className={`recovery-item recovery-item--${item.state}`}>
                <div><strong>{item.muscle}</strong><span>{formatHours(item.hours)} desde la última vez</span></div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="muscle-balance-card">
        <header className="smart-card-heading">
          <div>
            <span className="card-kicker">Últimos 7 días</span>
            <h2>Volumen y series por músculo</h2>
          </div>
          <Target size={19} />
        </header>
        <div className="muscle-balance-table">
          {analytics.muscleRows.map((item) => {
            const target = getTarget(targets, item.muscle);
            const percentage = Math.min(100, Math.round((item.sets / target) * 100));
            return (
              <div key={item.muscle} className="muscle-balance-row">
                <div className="muscle-balance-row__name">
                  <strong>{item.muscle}</strong>
                  <span>{item.sessions} {item.sessions === 1 ? "sesión" : "sesiones"}</span>
                </div>
                <div className="muscle-balance-row__bar">
                  <div><i style={{ width: `${percentage}%` }} /></div>
                  <small>{item.sets} / {target} series</small>
                </div>
                <div className="muscle-balance-row__volume">
                  <strong>{item.volume.toLocaleString("es-CL")} kg</strong>
                  <span>volumen</span>
                </div>
                <label className="muscle-target-input">
                  <span>Meta</span>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={target}
                    onChange={(event) => updateTarget(item.muscle, event.target.value)}
                    aria-label={`Meta semanal de series para ${item.muscle}`}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </article>

      <div className="smart-dashboard__records-grid">
        <article className="pr-month-card">
          <header className="smart-card-heading">
            <div>
              <span className="card-kicker">Récord destacado</span>
              <h2>PR del mes</h2>
            </div>
            <Trophy size={20} />
          </header>
          {analytics.prOfMonth ? (
            <div className="pr-month-card__content">
              <div className="pr-month-card__icon"><Trophy size={24} /></div>
              <div>
                <strong>{analytics.prOfMonth.exercise}</strong>
                <span>{analytics.prOfMonth.weight.toLocaleString("es-CL")} kg × {analytics.prOfMonth.reps}</span>
                <small>1RM estimado: {analytics.prOfMonth.estimated1RM.toLocaleString("es-CL")} kg · {analytics.prOfMonth.dateLabel}</small>
              </div>
            </div>
          ) : (
            <div className="smart-empty-mini">Todavía no hay un nuevo PR este mes.</div>
          )}
        </article>

        <article className="pr-dashboard-card">
          <header className="smart-card-heading">
            <div>
              <span className="card-kicker">Tus marcas</span>
              <h2>PRs + 1RM estimado</h2>
            </div>
            <TrendingUp size={20} />
          </header>
          <div className="pr-dashboard-list">
            {analytics.prs.slice(0, 6).map((record) => (
              <div key={record.key} className="pr-dashboard-item">
                <div>
                  <strong>{record.name}</strong>
                  <span>{record.sessions} sesiones · {record.prCount} PRs</span>
                </div>
                <div>
                  <strong>{record.bestWeight.toLocaleString("es-CL")} kg × {record.bestReps}</strong>
                  <span>1RM est. {record.estimated1RM.toLocaleString("es-CL")} kg</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
