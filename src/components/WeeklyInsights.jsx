import {
  CalendarDays,
  Check,
  Dumbbell,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { useBodyNutrition } from "../hooks/useBodyNutrition";
import { useProfile } from "../hooks/useProfile";
import { buildWeeklyInsights } from "../utils/weeklyInsights";
import { PageLoading } from "./ui/PageBoundary";
import SyncStatus from "./ui/SyncStatus";

const formatVolume = (value) => Number(value || 0).toLocaleString("es-CL");
const formatSigned = (value, suffix = "") => {
  if (value == null) return "Sin comparación";
  return `${value > 0 ? "+" : ""}${Number(value).toLocaleString("es-CL")}${suffix}`;
};

function Trend({ value, suffix = "%", positiveLabel, negativeLabel, neutralLabel = "Igual que la semana pasada" }) {
  if (value == null) return <span className="week-metric__trend is-muted"><Minus size={13} /> Sin datos para comparar</span>;
  if (value > 0) return <span className="week-metric__trend is-up"><TrendingUp size={13} /> {positiveLabel || formatSigned(value, suffix)}</span>;
  if (value < 0) return <span className="week-metric__trend is-down"><TrendingDown size={13} /> {negativeLabel || formatSigned(value, suffix)}</span>;
  return <span className="week-metric__trend is-muted"><Minus size={13} /> {neutralLabel}</span>;
}

export default function WeeklyInsights() {
  const { workouts, loading: workoutsLoading, syncError: workoutError, pendingCount: workoutPending } = useWorkoutContext();
  const { bodyEntries, nutritionEntries, loading, syncError, pendingCount } = useBodyNutrition();
  const { profile } = useProfile();
  const week = buildWeeklyInsights({ workouts, bodyEntries, nutritionEntries, profile });
  if ((workoutsLoading || loading) && !workouts.length && !bodyEntries.length && !nutritionEntries.length) return <PageLoading label="Cargando tu semana…" />;

  const nutritionSubtitle = week.nutritionLoggedDays
    ? `${week.avgProtein ?? 0} g proteína promedio`
    : "Aún sin comidas registradas";
  const weightValue = week.latestWeight != null
    ? `${Number(week.latestWeight).toLocaleString("es-CL")} kg`
    : "—";

  return (
    <div className="weekly-insights">
      <section className="week-hero">
        <div>
          <span className="card-kicker">Tu semana · {week.rangeLabel}</span>
          <h2>{week.goalReached ? "Objetivo cumplido" : "Así vas esta semana"}</h2>
          <p>{week.quickRead}</p>
        </div>
        <div className="week-hero__score" aria-label={`${week.sessions} entrenamientos esta semana`}>
          <strong>{week.sessions}{week.goal ? `/${week.goal}` : ""}</strong>
          <span>entrenamientos</span>
        </div>
      </section>

      {week.goal > 0 && (
        <div className="week-goal-track" aria-label={`Progreso semanal ${week.goalPercent}%`}>
          <i style={{ width: `${week.goalPercent}%` }} />
        </div>
      )}

      <section className="week-metrics" aria-label="Resumen semanal">
        <article className="week-metric">
          <span className="week-metric__icon"><Dumbbell size={19} /></span>
          <div>
            <span>Entrenamientos</span>
            <strong>{week.sessions}{week.goal ? ` / ${week.goal}` : ""}</strong>
            <Trend
              value={week.sessionDelta}
              suffix=""
              positiveLabel={`+${week.sessionDelta} vs semana pasada`}
              negativeLabel={`${week.sessionDelta} vs semana pasada`}
            />
          </div>
        </article>

        <article className="week-metric">
          <span className="week-metric__icon"><TrendingUp size={19} /></span>
          <div>
            <span>Volumen</span>
            <strong>{week.currentVolume > 0 ? `${formatVolume(week.currentVolume)} kg` : "—"}</strong>
            <Trend value={week.volumeDeltaPercent} />
          </div>
        </article>

        <article className="week-metric">
          <span className="week-metric__icon"><Utensils size={19} /></span>
          <div>
            <span>Nutrición</span>
            <strong>{week.avgCalories != null ? `${week.avgCalories.toLocaleString("es-CL")} kcal` : "—"}</strong>
            <small>{nutritionSubtitle}</small>
          </div>
        </article>

        <article className="week-metric">
          <span className="week-metric__icon"><Scale size={19} /></span>
          <div>
            <span>Peso</span>
            <strong>{weightValue}</strong>
            <small>{week.weightDelta == null ? "Sin tendencia semanal todavía" : `${formatSigned(week.weightDelta, " kg")} esta semana`}</small>
          </div>
        </article>
      </section>

      <section className="week-days-panel">
        <header>
          <div>
            <span className="card-kicker">Consistencia</span>
            <h3>Día a día</h3>
          </div>
          {week.hasNutritionTargets && week.nutritionLoggedDays > 0 && (
            <span>{week.nutritionGoalDays}/{week.nutritionLoggedDays} días en objetivo</span>
          )}
        </header>

        <div className="week-days" role="list" aria-label="Estado de los días de esta semana">
          {week.days.map((day) => (
            <div key={day.key} className={`week-day ${day.isFuture ? "is-future" : ""}`} role="listitem" aria-label={`${day.label}: ${day.isFuture ? "día pendiente" : `${day.trained ? "entrenamiento registrado" : "sin entrenamiento"}; ${day.nutritionLogged ? "nutrición registrada" : "sin nutrición"}`}`}>
              <strong>{day.label}</strong>
              <div className="week-day__signals">
                <span className={day.trained ? "is-done" : ""} title="Entrenamiento"><Dumbbell size={13} />{day.trained && <Check size={10} />}</span>
                <span className={day.nutritionLogged ? (day.nutritionOnTarget ? "is-done" : "has-data") : ""} title="Nutrición"><Utensils size={13} />{day.nutritionOnTarget && <Check size={10} />}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="week-days-legend">
          <span><i className="is-done" /> objetivo / sesión lista</span>
          <span><i className="has-data" /> datos registrados</span>
        </div>
      </section>

      {loading && <div className="week-sync-note"><CalendarDays size={14} /> Actualizando datos de la semana…</div>}
      {(syncError || workoutError || pendingCount || workoutPending) ? <SyncStatus error={syncError || workoutError} pending={pendingCount + workoutPending} /> : null}
    </div>
  );
}
