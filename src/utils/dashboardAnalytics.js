import { buildExerciseProgress } from "./exerciseProgress";
import { getWorkoutGroup } from "./workoutHistory";
import { estimateOneRepMax, getSmartProgressionPlan } from "./smartProgression";
import { normalizeExercisePrescription } from "./repRangeProgression";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const MUSCLE_ALIASES = {
  pecho: "Pecho",
  pectoral: "Pecho",
  hombro: "Hombros",
  hombros: "Hombros",
  deltoides: "Hombros",
  triceps: "Tríceps",
  espalda: "Espalda",
  dorsales: "Espalda",
  biceps: "Bíceps",
  antebrazo: "Antebrazo",
  antebrazos: "Antebrazo",
  piernas: "Piernas",
  pierna: "Piernas",
  cuadriceps: "Cuádriceps",
  femoral: "Isquios",
  femorales: "Isquios",
  isquios: "Isquios",
  gluteo: "Glúteos",
  gluteos: "Glúteos",
  gemelo: "Gemelos",
  gemelos: "Gemelos",
  pantorrilla: "Gemelos",
  pantorrillas: "Gemelos",
};

export const canonicalMuscleName = (name = "") => {
  const normalized = normalizeText(name);
  return MUSCLE_ALIASES[normalized] || String(name || "Otros").trim() || "Otros";
};

const startOfDay = (timestamp) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const buildWorkoutHeatmap = (workouts = [], days = 364) => {
  const countByDay = new Map();
  workouts.forEach((workout) => {
    const timestamp = Number(workout?.timestamp) || 0;
    if (!timestamp) return;
    const day = startOfDay(timestamp);
    countByDay.set(day, (countByDay.get(day) || 0) + 1);
  });

  const today = startOfDay(Date.now());
  const start = today - (days - 1) * DAY_MS;
  return Array.from({ length: days }, (_, index) => {
    const timestamp = start + index * DAY_MS;
    return {
      timestamp,
      date: new Date(timestamp),
      count: countByDay.get(timestamp) || 0,
    };
  });
};

const validSet = (set) =>
  set?.done !== false &&
  ((Number(set?.weight) || 0) > 0 || (Number(set?.reps) || 0) > 0);

export const buildWeeklyMuscleStats = (workouts = [], days = 7) => {
  const cutoff = Date.now() - days * DAY_MS;
  const map = new Map();

  workouts.forEach((workout) => {
    const timestamp = Number(workout?.timestamp) || 0;
    if (!timestamp || timestamp < cutoff) return;

    (workout?.exercises || []).forEach((category) => {
      const muscle = canonicalMuscleName(category?.name);
      const current = map.get(muscle) || { muscle, sets: 0, volume: 0, sessions: new Set() };

      (category?.exercises || []).forEach((exercise) => {
        (exercise?.sets || []).filter(validSet).forEach((set) => {
          current.sets += 1;
          current.volume += (Number(set?.weight) || 0) * (Number(set?.reps) || 0);
        });
      });

      current.sessions.add(timestamp);
      map.set(muscle, current);
    });
  });

  return [...map.values()]
    .map((entry) => ({
      muscle: entry.muscle,
      sets: entry.sets,
      volume: Math.round(entry.volume),
      sessions: entry.sessions.size,
    }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle, "es"));
};

export const buildMuscleRecovery = (workouts = []) => {
  const lastByMuscle = new Map();

  workouts.forEach((workout) => {
    const timestamp = Number(workout?.timestamp) || 0;
    if (!timestamp) return;
    (workout?.exercises || []).forEach((category) => {
      const muscle = canonicalMuscleName(category?.name);
      lastByMuscle.set(muscle, Math.max(lastByMuscle.get(muscle) || 0, timestamp));
    });
  });

  return [...lastByMuscle.entries()]
    .map(([muscle, timestamp]) => {
      const hours = Math.max(0, (Date.now() - timestamp) / HOUR_MS);
      let state = "ready";
      let label = "Listo";
      if (hours < 24) {
        state = "recovering";
        label = "Recuperando";
      } else if (hours < 48) {
        state = "partial";
        label = "Casi listo";
      }

      return {
        muscle,
        timestamp,
        hours: Math.round(hours),
        state,
        label,
      };
    })
    .sort((a, b) => a.hours - b.hours);
};

export const estimateRoutineMinutes = (routine) => {
  if (!routine) return 0;

  let seconds = 5 * 60;
  let exercises = 0;

  (routine.categories || []).forEach((category) => {
    (category.exercises || []).forEach((exercise) => {
      exercises += 1;
      const prescription = normalizeExercisePrescription(exercise);
      const workingSets = prescription.deload
        ? Math.max(1, prescription.sets - 1)
        : prescription.sets;
      seconds += prescription.warmupSets * 55;
      seconds += workingSets * 40;
      seconds += Math.max(0, workingSets - 1) * prescription.restSeconds;
      seconds += prescription.warmupSets * Math.min(90, prescription.restSeconds);
    });
  });

  seconds += Math.max(0, exercises - 1) * 60;
  return Math.max(1, Math.round(seconds / 60));
};

const NEXT_GROUP = { push: "pull", pull: "legs", legs: "push" };

export const getTodayRoutine = (routines = [], workouts = []) => {
  const latest = [...workouts]
    .sort((a, b) => (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0))[0] || null;
  const latestGroup = latest ? getWorkoutGroup(latest) : null;
  const suggestedType = NEXT_GROUP[latestGroup] || "push";
  const routine = routines.find((item) => item.type === suggestedType) || routines[0] || null;

  if (!routine) return null;

  let progressionOpportunities = 0;
  let plateauCount = 0;
  (routine.categories || []).forEach((category) => {
    (category.exercises || []).forEach((exercise) => {
      const plan = getSmartProgressionPlan(exercise.name, normalizeExercisePrescription(exercise));
      if (plan?.state === "increase_weight") progressionOpportunities += 1;
      if (plan?.state === "plateau") plateauCount += 1;
    });
  });

  return {
    routine,
    type: routine.type,
    estimatedMinutes: estimateRoutineMinutes(routine),
    progressionOpportunities,
    plateauCount,
    basedOn: latestGroup,
  };
};

export const buildPRDashboard = (workouts = []) =>
  buildExerciseProgress(workouts)
    .map((exercise) => ({
      key: exercise.key,
      name: exercise.name,
      bestWeight: Number(exercise.bestWeight) || 0,
      bestReps: Number(exercise.bestWeightReps) || 0,
      estimated1RM: estimateOneRepMax(exercise.bestWeight, exercise.bestWeightReps),
      sessions: exercise.sessions,
      prCount: exercise.prCount,
      latestTimestamp: exercise.latestTimestamp,
    }))
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp || b.estimated1RM - a.estimated1RM);

export const getPRofMonth = (workouts = []) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const candidates = [];

  buildExerciseProgress(workouts).forEach((exercise) => {
    exercise.points.forEach((point) => {
      if ((Number(point.timestamp) || 0) < monthStart || !point.prs?.any) return;
      candidates.push({
        exercise: exercise.name,
        timestamp: point.timestamp,
        dateLabel: point.dateLabel,
        weight: Number(point.weight) || 0,
        reps: Number(point.bestSetReps || point.reps) || 0,
        volume: Number(point.volume) || 0,
        estimated1RM: estimateOneRepMax(point.weight, point.bestSetReps || point.reps),
        weightDelta: Number(point.comparison?.weightDelta) || 0,
        repsDelta: Number(point.comparison?.repsDelta) || 0,
        volumeDelta: Number(point.comparison?.volumeDelta) || 0,
      });
    });
  });

  return candidates.sort(
    (a, b) =>
      b.weightDelta - a.weightDelta ||
      b.estimated1RM - a.estimated1RM ||
      b.volumeDelta - a.volumeDelta ||
      b.timestamp - a.timestamp
  )[0] || null;
};

export const getRoutineRecovery = (routine, recovery = []) => {
  if (!routine) return { state: "unknown", label: "Sin datos", muscles: [] };
  const recoveryMap = new Map(recovery.map((item) => [item.muscle, item]));
  const muscles = [...new Set((routine.categories || []).map((category) => canonicalMuscleName(category.name)))]
    .map((muscle) => recoveryMap.get(muscle) || { muscle, state: "ready", label: "Sin registro", hours: null });

  if (muscles.some((item) => item.state === "recovering")) {
    return { state: "recovering", label: "Recuperación reciente", muscles };
  }
  if (muscles.some((item) => item.state === "partial")) {
    return { state: "partial", label: "Casi listo", muscles };
  }
  return { state: "ready", label: "Listo para entrenar", muscles };
};
