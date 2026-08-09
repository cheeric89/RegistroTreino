import { normalizeExerciseName } from "./exerciseNames";
import { getLocalRoutines } from "./routineStorage";
import { isWarmupSet } from "./smartProgression";

export const DEFAULT_REP_MIN = 8;
export const DEFAULT_REP_MAX = 12;
export const DEFAULT_REST_SECONDS = 120;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

export const normalizeRepRange = (exercise = {}) => {
  const repMin = clamp(exercise.repMin ?? DEFAULT_REP_MIN, 1, 50);
  const repMax = clamp(exercise.repMax ?? DEFAULT_REP_MAX, repMin, 60);
  return { repMin, repMax };
};

export const normalizeExercisePrescription = (exercise = {}) => {
  const { repMin, repMax } = normalizeRepRange(exercise);
  return {
    repMin,
    repMax,
    sets: clamp(exercise.sets ?? 3, 1, 8),
    restSeconds: clamp(exercise.restSeconds ?? DEFAULT_REST_SECONDS, 30, 600),
    warmupSets: Math.min(4, Math.max(0, Number(exercise.warmupSets) || 0)),
    autoRest: exercise.autoRest !== false,
    favorite: exercise.favorite === true,
    deload: exercise.deload === true,
    notes: typeof exercise.notes === "string" ? exercise.notes : "",
    supersetGroup: typeof exercise.supersetGroup === "string" ? exercise.supersetGroup : "",
  };
};

export const getExercisePrescription = (exerciseName) => {
  const key = normalizeExerciseName(exerciseName);
  if (!key || key.startsWith("ejercicio")) return null;

  const routines = getLocalRoutines();
  for (const routine of routines) {
    for (const category of routine?.categories || []) {
      const exercise = (category?.exercises || []).find(
        (item) => normalizeExerciseName(item?.name) === key
      );

      if (!exercise) continue;
      return {
        key,
        routineType: routine.type,
        routineName: routine.name || routine.type || "Rutina",
        categoryName: category.name || "Grupo",
        ...normalizeExercisePrescription(exercise),
      };
    }
  }

  return null;
};

const completedWorkingSets = (sets = [], plannedSets = 1) =>
  sets
    .filter((set) => !isWarmupSet(set) && set?.done === true && Number(set?.reps) > 0)
    .slice(0, plannedSets)
    .map((set) => ({
      weight: Number(set?.weight) || 0,
      reps: Number(set?.reps) || 0,
      rir: set?.rir === "" || set?.rir == null ? null : Number(set.rir),
    }));

export const getRepRangeProgress = (sets = [], prescription = null) => {
  if (!prescription) return null;

  const plannedSets = Math.max(1, Number(prescription.sets) || 1);
  const effectivePlannedSets = prescription.deload
    ? Math.max(1, plannedSets - 1)
    : plannedSets;
  const repMin = Math.max(1, Number(prescription.repMin) || DEFAULT_REP_MIN);
  const repMax = Math.max(repMin, Number(prescription.repMax) || DEFAULT_REP_MAX);
  const completed = completedWorkingSets(sets, effectivePlannedSets);
  const completedCount = completed.length;
  const remainingSets = Math.max(0, effectivePlannedSets - completedCount);
  const allPlannedDone = completedCount >= effectivePlannedSets;
  const reps = completed.map((set) => set.reps);
  const rirValues = completed.map((set) => set.rir).filter((value) => Number.isFinite(value));
  const averageRir = rirValues.length
    ? Number((rirValues.reduce((total, value) => total + value, 0) / rirValues.length).toFixed(1))
    : null;
  const lowestReps = reps.length ? Math.min(...reps) : 0;
  const highestReps = reps.length ? Math.max(...reps) : 0;
  const belowRange = completed.filter((set) => set.reps < repMin).length;
  const atTop = completed.filter((set) => set.reps >= repMax).length;

  let state = "waiting";
  if (prescription.deload) state = completedCount > 0 ? "deload_active" : "deload_waiting";
  else if (completedCount > 0) state = "active";

  if (!prescription.deload) {
    if (belowRange > 0) state = "below_range";
    else if (allPlannedDone && atTop >= effectivePlannedSets) state = "ready_to_increase";
    else if (allPlannedDone) state = "progressing";
  }

  return {
    state,
    plannedSets: effectivePlannedSets,
    originalPlannedSets: plannedSets,
    completedCount,
    remainingSets,
    repMin,
    repMax,
    lowestReps,
    highestReps,
    belowRange,
    atTop,
    allPlannedDone,
    deload: prescription.deload === true,
    averageRir,
    rirSamples: rirValues.length,
  };
};
