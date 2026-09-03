import { getLocalDateKey, getNutritionTargets } from "./nutritionBodyAnalytics";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getWeekStart = (value = new Date()) => {
  const date = startOfDay(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const dateFromKey = (key) => new Date(`${key}T12:00:00`);

const isBetween = (timestamp, start, end) =>
  Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();

const getWorkoutTimestamp = (workout) => {
  const timestamp = Number(workout?.timestamp);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getWorkoutVolume = (workout) => {
  const stored = Number(workout?.volume);
  if (Number.isFinite(stored) && stored > 0) return stored;

  return (workout?.exercises || []).reduce(
    (workoutTotal, category) => workoutTotal + (category?.exercises || []).reduce(
      (categoryTotal, exercise) => categoryTotal + (exercise?.sets || []).reduce((setTotal, set) => {
        const weight = Number(set?.weight);
        const reps = Number(set?.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps)) return setTotal;
        return setTotal + weight * reps;
      }, 0),
      0
    ),
    0
  );
};

const hasNutritionData = (entry) => Number(entry?.calories || 0) > 0
  || Number(entry?.protein_g || 0) > 0
  || (Array.isArray(entry?.meals) && entry.meals.some((meal) => meal?.items?.length));

const isNutritionOnTarget = (entry, targets) => {
  if (!hasNutritionData(entry)) return false;
  const checks = [];

  if (targets.calories > 0) {
    const calories = Number(entry?.calories || 0);
    checks.push(calories >= targets.calories * 0.85 && calories <= targets.calories * 1.15);
  }

  if (targets.protein > 0) {
    checks.push(Number(entry?.protein_g || 0) >= targets.protein * 0.9);
  }

  return checks.length > 0 && checks.every(Boolean);
};

const percentDelta = (current, previous) => {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

const getWeightEntries = (entries = []) => entries
  .filter((entry) => Number(entry?.weight_kg) > 0 && entry?.entry_date)
  .map((entry) => ({ ...entry, weight_kg: Number(entry.weight_kg), date: dateFromKey(entry.entry_date) }))
  .filter((entry) => Number.isFinite(entry.date.getTime()))
  .sort((a, b) => a.date - b.date);

const makeQuickRead = ({ sessions, goal, volumeDeltaPercent, nutritionGoalDays, nutritionLoggedDays, weightDelta }) => {
  if (goal > 0 && sessions >= goal) return "Objetivo de entrenamientos cumplido esta semana.";
  if (volumeDeltaPercent != null && volumeDeltaPercent >= 5) return `Tu volumen subió ${volumeDeltaPercent}% frente a la semana pasada.`;
  if (nutritionLoggedDays >= 3 && nutritionGoalDays >= Math.ceil(nutritionLoggedDays * 0.6)) {
    return `${nutritionGoalDays} de ${nutritionLoggedDays} días registrados estuvieron alineados con tus objetivos.`;
  }
  if (weightDelta != null && Math.abs(weightDelta) >= 0.2) {
    return `Tu peso cambió ${weightDelta > 0 ? "+" : ""}${weightDelta.toLocaleString("es-CL")} kg dentro de la semana.`;
  }
  if (sessions > 0) return `${sessions} ${sessions === 1 ? "sesión registrada" : "sesiones registradas"} esta semana. Sigue acumulando datos para ver tendencias.`;
  return "Aún faltan datos esta semana. Registra tus sesiones y comidas para construir el resumen.";
};

export const buildWeeklyInsights = ({
  workouts = [],
  nutritionEntries = [],
  bodyEntries = [],
  profile = {},
  now = new Date(),
} = {}) => {
  const weekStart = getWeekStart(now);
  const weekEnd = addDays(weekStart, 7);
  const previousStart = addDays(weekStart, -7);
  const today = startOfDay(now);
  const targets = getNutritionTargets(profile);

  const currentWorkouts = workouts.filter((workout) => isBetween(getWorkoutTimestamp(workout), weekStart, weekEnd));
  const previousWorkouts = workouts.filter((workout) => isBetween(getWorkoutTimestamp(workout), previousStart, weekStart));
  const currentVolume = currentWorkouts.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0);
  const previousVolume = previousWorkouts.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0);

  const nutritionByDate = new Map(nutritionEntries.map((entry) => [entry?.entry_date, entry]));
  const workoutDates = new Set(currentWorkouts.map((workout) => getLocalDateKey(new Date(getWorkoutTimestamp(workout)))));

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = getLocalDateKey(date);
    const nutrition = nutritionByDate.get(key) || null;
    return {
      key,
      date,
      label: new Intl.DateTimeFormat("es-CL", { weekday: "short" }).format(date).replace(".", "").toUpperCase(),
      isFuture: date.getTime() > today.getTime(),
      trained: workoutDates.has(key),
      nutritionLogged: hasNutritionData(nutrition),
      nutritionOnTarget: isNutritionOnTarget(nutrition, targets),
    };
  });

  const elapsedKeys = new Set(days.filter((day) => !day.isFuture).map((day) => day.key));
  const currentNutrition = nutritionEntries.filter((entry) => elapsedKeys.has(entry?.entry_date) && hasNutritionData(entry));
  const nutritionLoggedDays = currentNutrition.length;
  const avgCalories = nutritionLoggedDays
    ? Math.round(currentNutrition.reduce((sum, entry) => sum + Number(entry?.calories || 0), 0) / nutritionLoggedDays)
    : null;
  const avgProtein = nutritionLoggedDays
    ? Math.round(currentNutrition.reduce((sum, entry) => sum + Number(entry?.protein_g || 0), 0) / nutritionLoggedDays)
    : null;
  const nutritionGoalDays = currentNutrition.filter((entry) => isNutritionOnTarget(entry, targets)).length;

  const weights = getWeightEntries(bodyEntries);
  const weekWeights = weights.filter((entry) => entry.date >= weekStart && entry.date < weekEnd);
  const latestWeight = weights.at(-1) || null;
  const weightStart = weekWeights[0] || null;
  const weightEnd = weekWeights.at(-1) || null;
  const weightDelta = weekWeights.length >= 2
    ? round1(weightEnd.weight_kg - weightStart.weight_kg)
    : null;

  const goal = Math.max(0, Number(profile?.weekly_training_goal) || 0);
  const sessions = currentWorkouts.length;
  const previousSessions = previousWorkouts.length;
  const volumeDeltaPercent = percentDelta(currentVolume, previousVolume);
  const goalPercent = goal > 0 ? Math.min(100, Math.round((sessions / goal) * 100)) : null;

  return {
    weekStart,
    weekEnd,
    rangeLabel: `${new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(weekStart)} — ${new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(addDays(weekEnd, -1))}`,
    sessions,
    previousSessions,
    sessionDelta: sessions - previousSessions,
    goal,
    goalPercent,
    goalReached: goal > 0 && sessions >= goal,
    currentVolume: Math.round(currentVolume),
    previousVolume: Math.round(previousVolume),
    volumeDeltaPercent,
    avgCalories,
    avgProtein,
    nutritionLoggedDays,
    nutritionGoalDays,
    latestWeight: latestWeight?.weight_kg ?? null,
    weightDelta,
    days,
    targets,
    quickRead: makeQuickRead({
      sessions,
      goal,
      volumeDeltaPercent,
      nutritionGoalDays,
      nutritionLoggedDays,
      weightDelta,
    }),
  };
};
