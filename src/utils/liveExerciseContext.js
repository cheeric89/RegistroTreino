import { getAllWorkouts } from "./storage";
import { getExerciseProgressByKey } from "./exerciseProgress";
import { normalizeExerciseName } from "./exerciseNames";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getCompletedSets = (sets = []) =>
  sets
    .filter((set) => set?.done === true)
    .map((set) => ({
      weight: toNumber(set?.weight),
      reps: toNumber(set?.reps),
    }))
    .filter((set) => set.weight > 0 || set.reps > 0);

const getBestStrengthSet = (sets = []) => {
  if (!sets.length) return null;

  return sets.reduce((best, set) => {
    if (!best) return set;
    if (set.weight > best.weight) return set;
    if (set.weight === best.weight && set.reps > best.reps) return set;
    return best;
  }, null);
};

const isBetterMark = (candidate, reference) => {
  if (!candidate || !reference) return false;

  if (candidate.weight > reference.weight) return true;
  if (candidate.weight === reference.weight && candidate.reps > reference.reps) return true;
  return false;
};

const reachesTarget = (candidate, target) => {
  if (!candidate || !target) return false;

  const targetWeight = toNumber(target.weight);
  const targetReps = toNumber(target.reps);

  if (targetWeight > 0) {
    return candidate.weight >= targetWeight &&
      (targetReps <= 0 || candidate.reps >= targetReps);
  }

  return targetReps > 0 && candidate.reps >= targetReps;
};

export function getLiveExerciseContext(exerciseName, currentSets = []) {
  const key = normalizeExerciseName(exerciseName);
  if (!key || key.startsWith("ejercicio")) return null;

  const workouts = getAllWorkouts();
  const progress = getExerciseProgressByKey(workouts, key);
  const completedSets = getCompletedSets(currentSets);
  const currentBest = getBestStrengthSet(completedSets);

  if (!progress) {
    return {
      key,
      firstTime: true,
      completedSets: completedSets.length,
      currentBest,
      last: null,
      record: null,
      target: null,
      isLivePR: false,
      targetReached: false,
      state: currentBest ? "first_mark" : "waiting",
    };
  }

  const latest = progress.latest || null;
  const record = {
    weight: toNumber(progress.bestWeight),
    reps: toNumber(progress.bestWeightReps),
  };
  const last = latest
    ? {
        weight: toNumber(latest.weight),
        reps: toNumber(latest.bestSetReps || latest.reps),
        dateLabel: latest.dateLabel || latest.date || "Última sesión",
      }
    : null;

  const isLivePR = Boolean(currentBest && isBetterMark(currentBest, record));
  const targetReached = Boolean(
    currentBest && progress.nextTarget && reachesTarget(currentBest, progress.nextTarget)
  );

  let state = "waiting";
  if (isLivePR) state = "new_pr";
  else if (targetReached) state = "target_reached";
  else if (currentBest) state = "active";

  return {
    key,
    firstTime: false,
    completedSets: completedSets.length,
    currentBest,
    last,
    record,
    target: progress.nextTarget || null,
    isLivePR,
    targetReached,
    state,
  };
}
