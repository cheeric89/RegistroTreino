import { useMemo } from "react";
import { ArrowRight, BarChart3, Check, Dumbbell, Scale, Utensils } from "lucide-react";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { useBodyNutrition } from "../hooks/useBodyNutrition";
import {
  getLocalDateKey,
  getNutritionTargets,
  getTodayNutrition,
  getWeightAnalytics,
} from "../utils/nutritionBodyAnalytics";
import { buildWeeklyInsights } from "../utils/weeklyInsights";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
};

const getDisplayName = (profile, user) =>
  profile?.alias?.trim() || user?.email?.split("@")[0] || "Atleta";

const getWorkoutTimestamp = (workout) => Number(workout?.timestamp) || 0;

const isToday = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
};

const formatVolume = (value) => Math.round(Number(value) || 0).toLocaleString("es-CL");

export default function Dashboard({
  user,
  profile,
  onStart,
  onQuickNutrition,
  onQuickBody,
  onOpenProgress,
}) {
  const { workouts, syncing, syncError } = useWorkoutContext();
  const { bodyEntries, nutritionEntries, loading: bodyLoading, syncError: bodySyncError } = useBodyNutrition();

  const todayWorkout = useMemo(() => [...workouts]
    .sort((a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a))
    .find((workout) => isToday(getWorkoutTimestamp(workout))) || null, [workouts]);

  const week = useMemo(() => buildWeeklyInsights({
    workouts,
    bodyEntries,
    nutritionEntries,
    profile,
  }), [workouts, bodyEntries, nutritionEntries, profile]);

  const todayNutrition = getTodayNutrition(nutritionEntries);
  const targets = getNutritionTargets(profile);
  const weight = getWeightAnalytics(bodyEntries, profile?.target_weight_kg);
  const currentWeight = weight.latest?.weight_kg ?? profile?.weight_kg ?? null;
  const todayBody = bodyEntries.find((entry) => entry?.entry_date === getLocalDateKey()) || null;
  const hasNutritionToday = Number(todayNutrition.calories || 0) > 0
    || Number(todayNutrition.protein_g || 0) > 0
    || (Array.isArray(todayNutrition.meals) && todayNutrition.meals.some((meal) => meal?.items?.length));
  const hasWeightToday = Number(todayBody?.weight_kg) > 0;
  const syncBusy = syncing || bodyLoading;
  const offline = Boolean(syncError || bodySyncError);

  return (
    <div className="page-shell simplified-dashboard treino-home-v17 treino-home-v17--approved">
      <header className="today-header today-header--v17">
        <div>
          <span>{getGreeting()}</span>
          <h1>{getDisplayName(profile, user)}</h1>
        </div>
        <small className={offline ? "is-offline" : ""}>
          {syncBusy ? "Sincronizando…" : offline ? "Offline" : "Al día"}
        </small>
      </header>

      <div className="home-today-label home-today-label--clean">
        <span>Hoy</span>
      </div>

      <section className="today-stack" aria-label="Resumen de hoy">
        <article className={`today-action today-action--training ${todayWorkout ? "is-done" : ""}`}>
          <div className="today-action__icon">{todayWorkout ? <Check size={21} /> : <Dumbbell size={21} />}</div>
          <div className="today-action__body">
            <span>Entrenamiento</span>
            <strong>{todayWorkout ? (todayWorkout.day || "Sesión completada") : "Tu próxima sesión"}</strong>
            <small>{week.sessions}{week.goal ? ` / ${week.goal}` : ""} esta semana</small>
          </div>
          <button type="button" onClick={todayWorkout ? onOpenProgress : onStart}>
            {todayWorkout ? "Progreso" : "Empezar"}<ArrowRight size={16} />
          </button>
        </article>

        <article className={`today-action today-action--nutrition ${hasNutritionToday ? "has-data" : ""}`}>
          <div className="today-action__icon"><Utensils size={21} /></div>
          <div className="today-action__body">
            <span>Nutrición</span>
            <strong>{hasNutritionToday
              ? `${Number(todayNutrition.calories || 0).toLocaleString("es-CL")}${targets.calories ? ` / ${targets.calories.toLocaleString("es-CL")}` : ""} kcal`
              : "Sin comidas registradas"}</strong>
            <small>{hasNutritionToday
              ? `${Number(todayNutrition.protein_g || 0).toLocaleString("es-CL")}${targets.protein ? ` / ${targets.protein.toLocaleString("es-CL")}` : ""} g proteína`
              : "Añade tu primera comida"}</small>
          </div>
          <button type="button" onClick={onQuickNutrition}>{hasNutritionToday ? "+ Comida" : "Registrar"}</button>
        </article>

        <article className={`today-action today-action--body ${hasWeightToday ? "is-done" : ""}`}>
          <div className="today-action__icon">{hasWeightToday ? <Check size={21} /> : <Scale size={21} />}</div>
          <div className="today-action__body">
            <span>Peso</span>
            <strong>{currentWeight != null ? `${Number(currentWeight).toLocaleString("es-CL")} kg` : "Sin registro"}</strong>
            <small>{hasWeightToday
              ? "Registrado hoy"
              : weight.delta30 == null
                ? "Regístralo para crear tu tendencia"
                : `30 días: ${weight.delta30 > 0 ? "+" : ""}${weight.delta30.toLocaleString("es-CL")} kg`}</small>
          </div>
          <button type="button" onClick={onQuickBody}>{hasWeightToday ? "Cuerpo" : currentWeight != null ? "Actualizar" : "Añadir"}</button>
        </article>
      </section>

      <section className="home-week-card" aria-label="Resumen de la semana">
        <header className="home-week-card__header">
          <div>
            <span>Tu semana</span>
            <small>{week.rangeLabel}</small>
          </div>
          <button type="button" onClick={onOpenProgress}>Ver semana <ArrowRight size={15} /></button>
        </header>

        <div className="home-week-card__metrics">
          <div className="home-week-metric">
            <span className="home-week-metric__icon"><BarChart3 size={17} /></span>
            <strong>{week.sessions}{week.goal ? <small>/{week.goal}</small> : null}</strong>
            <span>Entrenamientos</span>
          </div>
          <div className="home-week-metric">
            <span className="home-week-metric__icon"><Dumbbell size={17} /></span>
            <strong>{formatVolume(week.currentVolume)} <small>kg</small></strong>
            <span>Volumen</span>
          </div>
          <div className="home-week-metric">
            <span className="home-week-metric__icon"><Utensils size={17} /></span>
            <strong>{week.nutritionLoggedDays}</strong>
            <span>Nutrición</span>
          </div>
        </div>

        {week.goal > 0 && (
          <div className="home-week-card__track" aria-label={`${week.goalPercent}% del objetivo semanal`}>
            <i style={{ width: `${week.goalPercent}%` }} />
          </div>
        )}
      </section>
    </div>
  );
}
