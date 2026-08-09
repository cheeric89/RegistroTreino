import { normalizeExerciseName } from "./exerciseNames";
import { getLocalRoutines } from "./routineStorage";

export const DEFAULT_REP_MIN = 8;
export const DEFAULT_REP_MAX = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

export const normalizeRepRange = (exercise = {}) => {
  const repMin = clamp(exercise.repMin ?? DEFAULT_REP_MIN, 1, 50);
  const repMax = clamp(exercise.repMax ?? DEFAULT_REP_MAX, repMin, 60);
  return { repMin, repMax };
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
      const { repMin, repMax } = normalizeRepRange(exercise);
      return {
        key,
        routineType: routine.type,
        routineName: routine.name || routine.type || "Rutina",
        categoryName: category.name || "Grupo",
        sets: Math.min(8, Math.max(1, Number(exercise.sets) || 1)),
        repMin,
        repMax,
      };
    }
  }

  return null;
};

const completedWorkingSets = (sets = [], plannedSets = 1) =>
  sets
    .filter((set) => set?.done === true && Number(set?.reps) > 0)
    .slice(0, plannedSets)
    .map((set) => ({
      weight: Number(set?.weight) || 0,
      reps: Number(set?.reps) || 0,
    }));

export const getRepRangeProgress = (sets = [], prescription = null) => {
  if (!prescription) return null;

  const plannedSets = Math.max(1, Number(prescription.sets) || 1);
  const repMin = Math.max(1, Number(prescription.repMin) || DEFAULT_REP_MIN);
  const repMax = Math.max(repMin, Number(prescription.repMax) || DEFAULT_REP_MAX);
  const completed = completedWorkingSets(sets, plannedSets);
  const completedCount = completed.length;
  const remainingSets = Math.max(0, plannedSets - completedCount);
  const allPlannedDone = completedCount >= plannedSets;
  const reps = completed.map((set) => set.reps);
  const lowestReps = reps.length ? Math.min(...reps) : 0;
  const highestReps = reps.length ? Math.max(...reps) : 0;
  const belowRange = completed.filter((set) => set.reps < repMin).length;
  const atTop = completed.filter((set) => set.reps >= repMax).length;

  let state = "waiting";
  if (completedCount > 0) state = "active";
  if (belowRange > 0) state = "below_range";
  else if (allPlannedDone && atTop >= plannedSets) state = "ready_to_increase";
  else if (allPlannedDone) state = "progressing";

  return {
    state,
    plannedSets,
    completedCount,
    remainingSets,
    repMin,
    repMax,
    lowestReps,
    highestReps,
    belowRange,
    atTop,
    allPlannedDone,
  };
};
