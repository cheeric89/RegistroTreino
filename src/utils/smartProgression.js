import { getAllWorkouts } from "./storage";
import { normalizeExerciseName } from "./exerciseNames";

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));
const roundToHalf = (value) => Math.round((Number(value) || 0) * 2) / 2;

export const isWarmupSet = (set) =>
  set?.setType === "warmup" || set?.type === "warmup" || set?.warmup === true;

export const estimateOneRepMax = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return roundToHalf(w);
  return roundToHalf(w * (1 + Math.min(r, 30) / 30));
};

const validWorkingSets = (sets = []) => {
  const candidates = sets.filter(
    (set) => !isWarmupSet(set) && set?.done !== false &&
      ((Number(set?.weight) || 0) > 0 || (Number(set?.reps) || 0) > 0)
  );

  // Historial antiguo puede no haber guardado `done`. Si todos quedaron en false,
  // usamos los sets con datos para no perder retrocompatibilidad.
  if (candidates.length) return candidates;

  return sets.filter(
    (set) => !isWarmupSet(set) &&
      ((Number(set?.weight) || 0) > 0 || (Number(set?.reps) || 0) > 0)
  );
};

const summarizeSets = (sets = []) => {
  const working = validWorkingSets(sets).map((set) => ({
    weight: Number(set?.weight) || 0,
    reps: Number(set?.reps) || 0,
  }));

  if (!working.length) {
    return {
      workingSets: [],
      setCount: 0,
      maxWeight: 0,
      bestRepsAtMaxWeight: 0,
      maxReps: 0,
      volume: 0,
      estimated1RM: 0,
    };
  }

  const maxWeight = Math.max(...working.map((set) => set.weight));
  const bestRepsAtMaxWeight = Math.max(
    ...working.filter((set) => set.weight === maxWeight).map((set) => set.reps),
    0
  );
  const maxReps = Math.max(...working.map((set) => set.reps), 0);
  const volume = working.reduce((total, set) => total + set.weight * set.reps, 0);
  const estimated1RM = Math.max(
    ...working.map((set) => estimateOneRepMax(set.weight, set.reps)),
    0
  );

  return {
    workingSets: working,
    setCount: working.length,
    maxWeight,
    bestRepsAtMaxWeight,
    maxReps,
    volume: roundToHalf(volume),
    estimated1RM,
  };
};

export const getExerciseSessions = (exerciseName, workouts = getAllWorkouts()) => {
  const key = normalizeExerciseName(exerciseName);
  if (!key || key.startsWith("ejercicio")) return [];

  const sessions = [];

  [...(workouts || [])]
    .sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0))
    .forEach((workout) => {
      let aggregate = null;

      (workout?.exercises || workout?.categories || []).forEach((category) => {
        (category?.exercises || []).forEach((exercise) => {
          if (normalizeExerciseName(exercise?.name) !== key) return;
          const summary = summarizeSets(exercise?.sets || []);
          if (!summary.setCount) return;

          if (!aggregate) {
            aggregate = {
              ...summary,
              timestamp: Number(workout?.timestamp) || 0,
              date: workout?.date || "",
              day: workout?.day || "Entrenamiento",
            };
            return;
          }

          aggregate.workingSets.push(...summary.workingSets);
          aggregate.setCount += summary.setCount;
          aggregate.maxWeight = Math.max(aggregate.maxWeight, summary.maxWeight);
          aggregate.maxReps = Math.max(aggregate.maxReps, summary.maxReps);
          aggregate.volume = roundToHalf(aggregate.volume + summary.volume);
          aggregate.estimated1RM = Math.max(aggregate.estimated1RM, summary.estimated1RM);
          if (summary.maxWeight > aggregate.maxWeight) {
            aggregate.bestRepsAtMaxWeight = summary.bestRepsAtMaxWeight;
          } else if (summary.maxWeight === aggregate.maxWeight) {
            aggregate.bestRepsAtMaxWeight = Math.max(
              aggregate.bestRepsAtMaxWeight,
              summary.bestRepsAtMaxWeight
            );
          }
        });
      });

      if (aggregate) sessions.push(aggregate);
    });

  return sessions;
};

const median = (values = []) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const fallbackIncrement = (weight) => {
  const current = Number(weight) || 0;
  if (current <= 20) return 1;
  if (current <= 60) return 2.5;
  return 5;
};

export const inferWeightIncrement = (sessions = [], currentWeight = 0) => {
  const recent = sessions.slice(-8);
  const positiveJumps = [];
  const failedJumps = [];

  for (let index = 1; index < recent.length; index += 1) {
    const previous = Number(recent[index - 1]?.maxWeight) || 0;
    const current = Number(recent[index]?.maxWeight) || 0;
    const delta = roundToHalf(current - previous);
    if (delta > 0 && delta <= 15) positiveJumps.push(delta);

    const following = recent[index + 1];
    if (delta >= 2.5 && following && Number(following.maxWeight) < current) {
      failedJumps.push(delta);
    }
  }

  if (failedJumps.length) {
    const learned = Math.max(0.5, roundToHalf(Math.min(...failedJumps) / 2));
    return { increment: learned, source: "learned_smaller_jump" };
  }

  if (positiveJumps.length >= 2) {
    return {
      increment: Math.max(0.5, roundToHalf(median(positiveJumps))),
      source: "history",
    };
  }

  return { increment: fallbackIncrement(currentWeight), source: "default" };
};

export const getPlateauStatus = (sessions = []) => {
  const recent = sessions.slice(-5);
  if (recent.length < 4) {
    return { plateau: false, sessions: recent.length, improvementPercent: null };
  }

  const first = Number(recent[0]?.estimated1RM) || 0;
  const latest = Number(recent.at(-1)?.estimated1RM) || 0;
  const bestBeforeLatest = Math.max(...recent.slice(0, -1).map((session) => Number(session.estimated1RM) || 0));
  const improvementPercent = first > 0 ? ((latest - first) / first) * 100 : 0;
  const noRecentPR = latest <= bestBeforeLatest * 1.005;
  const plateau = improvementPercent < 1.5 && noRecentPR;

  return {
    plateau,
    sessions: recent.length,
    improvementPercent: Number(improvementPercent.toFixed(1)),
  };
};

export const getSessionComparison = (exerciseName, currentSets = []) => {
  const current = summarizeSets(currentSets);
  if (!current.setCount) return null;

  const history = getExerciseSessions(exerciseName);
  const previous = history.at(-1) || null;
  const best = history.reduce(
    (winner, session) => !winner || session.estimated1RM > winner.estimated1RM ? session : winner,
    null
  );

  const delta = (value, reference) => Number(((Number(value) || 0) - (Number(reference) || 0)).toFixed(1));

  return {
    current,
    previous,
    best,
    versusPrevious: previous ? {
      weight: delta(current.maxWeight, previous.maxWeight),
      reps: delta(current.bestRepsAtMaxWeight, previous.bestRepsAtMaxWeight),
      volume: delta(current.volume, previous.volume),
      estimated1RM: delta(current.estimated1RM, previous.estimated1RM),
    } : null,
    beatsBest: Boolean(best && current.estimated1RM > best.estimated1RM),
  };
};

const roundRecommendedWeight = (weight, increment = 0.5) => {
  const step = Math.max(0.5, Number(increment) || 0.5);
  return Number((Math.round((Number(weight) || 0) / step) * step).toFixed(1));
};

export const getSmartProgressionPlan = (exerciseName, prescription = null) => {
  if (!prescription) return null;

  const sessions = getExerciseSessions(exerciseName);
  const latest = sessions.at(-1) || null;
  const plateau = getPlateauStatus(sessions);
  const repMin = clamp(prescription.repMin, 1, 50);
  const repMax = clamp(prescription.repMax, repMin, 60);
  const plannedSets = clamp(prescription.sets, 1, 8);

  if (!latest) {
    return {
      state: "first_session",
      title: "Crea tu primera referencia",
      message: `Busca ${plannedSets} ${plannedSets === 1 ? "serie" : "series"} de ${repMin}–${repMax} reps con una carga que controles bien.`,
      weight: 0,
      reps: repMin,
      increment: null,
      plateau,
    };
  }

  const currentWeight = Number(latest.maxWeight) || 0;
  const learned = inferWeightIncrement(sessions, currentWeight);
  const latestSets = latest.workingSets.slice(0, plannedSets);
  const enoughSets = latestSets.length >= plannedSets;
  const allAtTop = enoughSets && latestSets.every((set) => set.reps >= repMax);
  const anyBelow = latestSets.some((set) => set.reps > 0 && set.reps < repMin);
  const bestReps = Number(latest.bestRepsAtMaxWeight) || 0;

  if (prescription.deload) {
    const reduced = currentWeight > 0
      ? roundRecommendedWeight(currentWeight * 0.9, 0.5)
      : 0;
    return {
      state: "deload",
      title: "Descarga activa",
      message: `Esta sesión prioriza recuperación: menos volumen y cerca de 90% de tu carga habitual. Mantén la técnica limpia y evita perseguir PRs.`,
      weight: reduced,
      reps: repMin,
      increment: learned.increment,
      incrementSource: learned.source,
      plateau,
    };
  }

  if (allAtTop && currentWeight > 0) {
    const nextWeight = roundRecommendedWeight(currentWeight + learned.increment, learned.increment);
    return {
      state: "increase_weight",
      title: `Prueba ${nextWeight.toLocaleString("es-CL")} kg`,
      message: `Ya dominaste ${currentWeight.toLocaleString("es-CL")} kg en el tope del rango. Sube ${learned.increment.toLocaleString("es-CL")} kg y vuelve cerca de ${repMin} reps.`,
      weight: nextWeight,
      reps: repMin,
      increment: learned.increment,
      incrementSource: learned.source,
      plateau,
    };
  }

  if (anyBelow) {
    return {
      state: "recover_range",
      title: `Mantén ${currentWeight.toLocaleString("es-CL")} kg`,
      message: `Primero recupera al menos ${repMin} reps en todas las series antes de aumentar carga.`,
      weight: currentWeight,
      reps: repMin,
      increment: learned.increment,
      incrementSource: learned.source,
      plateau,
    };
  }

  if (plateau.plateau) {
    return {
      state: "plateau",
      title: "Estancamiento detectado",
      message: `Llevas varias sesiones sin una mejora clara. Mantén ${currentWeight.toLocaleString("es-CL")} kg y busca +1 rep; si vuelve a estancarse, una descarga puede ayudarte a recuperar margen.`,
      weight: currentWeight,
      reps: Math.min(repMax, Math.max(repMin, bestReps + 1)),
      increment: learned.increment,
      incrementSource: learned.source,
      plateau,
    };
  }

  return {
    state: "add_reps",
    title: `Hoy: ${currentWeight.toLocaleString("es-CL")} kg`,
    message: `Mantén la carga y busca ${Math.min(repMax, Math.max(repMin, bestReps + 1))} reps en tu mejor serie. Cuando todas lleguen a ${repMax}, Treino te propondrá subir peso.`,
    weight: currentWeight,
    reps: Math.min(repMax, Math.max(repMin, bestReps + 1)),
    increment: learned.increment,
    incrementSource: learned.source,
    plateau,
  };
};
