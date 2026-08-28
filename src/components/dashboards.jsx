import { useMemo } from "react";
import { ArrowRight, BarChart3, Dumbbell, Scale, Utensils } from "lucide-react";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { useBodyNutrition } from "../hooks/useBodyNutrition";
import {
  getNutritionTargets,
  getTodayNutrition,
  getWeightAnalytics,
} from "../utils/nutritionBodyAnalytics";

const DAY_MS = 24 * 60 * 60 * 1000;

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

  const training = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a));
    const sevenDaysAgo = Date.now() - 7 * DAY_MS;
    const week = sorted.filter((workout) => getWorkoutTimestamp(workout) >= sevenDaysAgo);
    const todayWorkout = sorted.find((workout) => isToday(getWorkoutTimestamp(workout))) || null;
    return { week, todayWorkout };
  }, [workouts]);

  const todayNutrition = getTodayNutrition(nutritionEntries);
  const targets = getNutritionTargets(profile);
  const weight = getWeightAnalytics(bodyEntries, profile?.target_weight_kg);
  const currentWeight = weight.latest?.weight_kg ?? profile?.weight_kg ?? null;
  const weeklyGoal = Math.max(0, Number(profile?.weekly_training_goal) || 0);
  const weeklyPercent = weeklyGoal > 0 ? Math.min(100, Math.round((training.week.length / weeklyGoal) * 100)) : 0;
  const syncBusy = syncing || bodyLoading;
  const offline = Boolean(syncError || bodySyncError);

  return (
    <div className="page-shell simplified-dashboard">
      <header className="today-header">
        <div>
          <span>{getGreeting()}</span>
          <h1>{getDisplayName(profile, user)}</h1>
          <p>Esto es lo importante de hoy.</p>
        </div>
        <small className={offline ? "is-offline" : ""}>
          {syncBusy ? "Sincronizando…" : offline ? "Offline · guardaremos tus cambios" : "Al día"}
        </small>
      </header>

      <section className="today-stack" aria-label="Resumen de hoy">
        <article className="today-action today-action--training">
          <div className="today-action__icon"><Dumbbell size={21} /></div>
          <div className="today-action__body">
            <span>Entrenamiento</span>
            <strong>{training.todayWorkout ? "Entrenamiento completado" : "¿Entrenamos hoy?"}</strong>
            <small>{training.todayWorkout ? training.todayWorkout.day || "Sesión registrada" : `${training.week.length}${weeklyGoal ? ` / ${weeklyGoal}` : ""} sesiones esta semana`}</small>
          </div>
          <button type="button" onClick={onStart}>{training.todayWorkout ? "Otra sesión" : "Empezar"}<ArrowRight size={16} /></button>
        </article>

        <article className="today-action today-action--nutrition">
          <div className="today-action__icon"><Utensils size={21} /></div>
          <div className="today-action__body">
            <span>Nutrición</span>
            <strong>{Number(todayNutrition.calories || 0).toLocaleString("es-CL")} {targets.calories ? `/ ${targets.calories.toLocaleString("es-CL")} kcal` : "kcal"}</strong>
            <small>{Number(todayNutrition.protein_g || 0).toLocaleString("es-CL")} {targets.protein ? `/ ${targets.protein.toLocaleString("es-CL")}` : ""} g proteína</small>
          </div>
          <button type="button" onClick={onQuickNutrition}>+ Comida</button>
        </article>

        <article className="today-action today-action--body">
          <div className="today-action__icon"><Scale size={21} /></div>
          <div className="today-action__body">
            <span>Peso</span>
            <strong>{currentWeight != null ? `${Number(currentWeight).toLocaleString("es-CL")} kg` : "Sin registro"}</strong>
            <small>{weight.delta30 == null ? "Registra tu peso cuando quieras" : `30 días: ${weight.delta30 > 0 ? "+" : ""}${weight.delta30.toLocaleString("es-CL")} kg`}</small>
          </div>
          <button type="button" onClick={onQuickBody}>Registrar</button>
        </article>
      </section>

      <section className="today-week">
        <div className="today-week__top">
          <div>
            <span>Esta semana</span>
            <strong>{training.week.length}{weeklyGoal ? ` / ${weeklyGoal}` : ""} entrenamientos</strong>
          </div>
          <button type="button" onClick={onOpenProgress}>Ver progreso <BarChart3 size={16} /></button>
        </div>
        {weeklyGoal > 0 && <div className="today-week__track"><i style={{ width: `${weeklyPercent}%` }} /></div>}
      </section>
    </div>
  );
}
