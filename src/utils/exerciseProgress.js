import {
  choosePreferredExerciseName,
  normalizeExerciseName,
} from "./exerciseNames";

const getValidSets = (sets = []) =>
  sets.filter((set) => {
    if (set?.done === false) return false;

    const weight = Number(set?.weight);
    const reps = Number(set?.reps);
    return (Number.isFinite(weight) && weight > 0) || (Number.isFinite(reps) && reps > 0);
  });

const getBestSet = (sets = []) => {
  if (!sets.length) return null;

  return sets.reduce((best, set) => {
    const weight = Number(set?.weight) || 0;
    const reps = Number(set?.reps) || 0;
    const volume = weight * reps;

    if (!best) return { weight, reps, volume };
    if (weight > best.weight) return { weight, reps, volume };
    if (weight === best.weight && reps > best.reps) return { weight, reps, volume };
    if (weight === best.weight && reps === best.reps && volume > best.volume) {
      return { weight, reps, volume };
    }
    return best;
  }, null);
};

const formatDateLabel = (workout) => {
  const timestamp = Number(workout?.timestamp);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
    })
      .format(new Date(timestamp))
      .replace(".", "");
  }

  return workout?.date || "Sin fecha";
};

const percentDelta = (current, previous) => {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  if (previousValue <= 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const buildPointComparisons = (points = []) =>
  points.map((point, index) => {
    const previous = points[index - 1] || null;
    if (!previous) {
      return {
        ...point,
        comparison: null,
      };
    }

    return {
      ...point,
      comparison: {
        previousTimestamp: previous.timestamp,
        weightDelta: Number((point.weight - previous.weight).toFixed(2)),
        repsDelta: point.reps - previous.reps,
        volumeDelta: Number((point.volume - previous.volume).toFixed(2)),
        weightPercent: percentDelta(point.weight, previous.weight),
        repsPercent: percentDelta(point.reps, previous.reps),
        volumePercent: percentDelta(point.volume, previous.volume),
      },
    };
  });

const markPersonalRecords = (points = []) => {
  let bestWeight = 0;
  let bestRepsAtBestWeight = 0;
  let bestReps = 0;
  let bestVolume = 0;

  return points.map((point, index) => {
    const firstReference = index === 0;

    const weightPR =
      !firstReference &&
      (point.weight > bestWeight ||
        (point.weight > 0 &&
          point.weight === bestWeight &&
          point.bestSetReps > bestRepsAtBestWeight));
    const repsPR = !firstReference && point.reps > bestReps;
    const volumePR = !firstReference && point.volume > bestVolume;

    if (point.weight > bestWeight) {
      bestWeight = point.weight;
      bestRepsAtBestWeight = point.bestSetReps;
    } else if (point.weight === bestWeight) {
      bestRepsAtBestWeight = Math.max(bestRepsAtBestWeight, point.bestSetReps);
    }

    bestReps = Math.max(bestReps, point.reps);
    bestVolume = Math.max(bestVolume, point.volume);

    return {
      ...point,
      prs: {
        weight: weightPR,
        reps: repsPR,
        volume: volumePR,
        any: weightPR || repsPR || volumePR,
      },
    };
  });
};

const roundWeight = (value) => Math.round(Number(value) * 2) / 2;

const buildNextTarget = ({ latest, bestWeight, bestWeightReps }) => {
  if (!latest) return null;

  const latestWeight = Number(latest.weight) || 0;
  const latestReps = Number(latest.bestSetReps || latest.reps) || 0;

  if (latestWeight > 0) {
    if (bestWeight > latestWeight) {
      return {
        type: "recover",
        weight: bestWeight,
        reps: bestWeightReps || latestReps,
        title: "Recupera tu mejor marca",
        message: `Tu mejor registro es ${bestWeight} kg${bestWeightReps ? ` × ${bestWeightReps}` : ""}. Intenta volver a ese nivel antes de subir el peso.`,
      };
    }

    if (latestWeight === bestWeight && bestWeightReps > latestReps) {
      return {
        type: "recover_reps",
        weight: bestWeight,
        reps: bestWeightReps,
        title: "Iguala tus mejores reps",
        message: `Mantén ${bestWeight} kg e intenta volver a ${bestWeightReps} reps antes de aumentar la carga.`,
      };
    }

    const targetWeight = roundWeight(bestWeight + 2.5);
    return {
      type: "progress",
      weight: targetWeight,
      reps: latestReps,
      title: "Próxima meta sugerida",
      message: `Si la técnica se mantiene sólida, prueba ${targetWeight} kg${latestReps ? ` × ${latestReps}` : ""} en tu próxima sesión.`,
    };
  }

  if (latest.reps > 0) {
    return {
      type: "reps",
      weight: 0,
      reps: latest.reps + 1,
      title: "Próxima meta sugerida",
      message: `Intenta sumar 1 repetición y llegar a ${latest.reps + 1} reps en tu próxima sesión.`,
    };
  }

  return null;
};

export function buildExerciseProgress(workouts = []) {
  const byExercise = new Map();

  [...workouts]
    .sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0))
    .forEach((workout) => {
      const workoutTimestamp = Number(workout?.timestamp) || 0;

      (workout?.exercises || []).forEach((category) => {
        (category?.exercises || []).forEach((exercise) => {
          const name = exercise?.name?.trim();
          if (!name || normalizeExerciseName(name).startsWith("ejercicio ")) return;

          const sets = getValidSets(exercise?.sets || []);
          if (!sets.length) return;

          const key = normalizeExerciseName(name);
          if (!key) return;

          const bestSet = getBestSet(sets);
          const maxReps = Math.max(...sets.map((set) => Number(set?.reps) || 0), 0);
          const totalVolume = sets.reduce(
            (total, set) => total + (Number(set?.weight) || 0) * (Number(set?.reps) || 0),
            0
          );

          const point = {
            timestamp: workoutTimestamp,
            date: workout?.date || "",
            dateLabel: formatDateLabel(workout),
            day: workout?.day || "Entrenamiento",
            category: category?.name || "Sin grupo",
            weight: bestSet?.weight || 0,
            reps: maxReps,
            bestSetReps: bestSet?.reps || 0,
            volume: totalVolume,
            sets: sets.length,
          };

          if (!byExercise.has(key)) {
            byExercise.set(key, {
              key,
              name,
              categories: new Set(),
              points: [],
            });
          }

          const entry = byExercise.get(key);
          entry.name = choosePreferredExerciseName(entry.name, name);
          entry.categories.add(category?.name || "Sin grupo");

          const existingPointIndex = entry.points.findIndex(
            (existing) => existing.timestamp === workoutTimestamp
          );

          if (existingPointIndex >= 0) {
            const existing = entry.points[existingPointIndex];
            entry.points[existingPointIndex] = {
              ...existing,
              weight: Math.max(existing.weight, point.weight),
              reps: Math.max(existing.reps, point.reps),
              bestSetReps:
                point.weight > existing.weight
                  ? point.bestSetReps
                  : point.weight === existing.weight
                    ? Math.max(existing.bestSetReps, point.bestSetReps)
                    : existing.bestSetReps,
              volume: existing.volume + point.volume,
              sets: existing.sets + point.sets,
            };
          } else {
            entry.points.push(point);
          }
        });
      });
    });

  return [...byExercise.values()]
    .map((entry) => {
      const sortedPoints = entry.points.sort((a, b) => a.timestamp - b.timestamp);
      const comparedPoints = buildPointComparisons(sortedPoints);
      const points = markPersonalRecords(comparedPoints);
      const first = points[0] || null;
      const latest = points.at(-1) || null;
      const previous = points.at(-2) || null;

      const bestWeightPoint = points.reduce(
        (best, point) => {
          if (!best || point.weight > best.weight) return point;
          if (point.weight === best.weight && point.bestSetReps > best.bestSetReps) return point;
          return best;
        },
        null
      );

      const bestVolumePoint = points.reduce(
        (best, point) => (!best || point.volume > best.volume ? point : best),
        null
      );

      const bestWeight = bestWeightPoint?.weight || 0;
      const bestWeightReps = bestWeightPoint?.bestSetReps || 0;
      const prCount = points.filter((point) => point.prs?.any).length;

      return {
        key: entry.key,
        name: entry.name,
        categories: [...entry.categories],
        points,
        sessions: points.length,
        first,
        latest,
        previous,
        bestWeight,
        bestWeightReps,
        bestVolume: bestVolumePoint?.volume || 0,
        weightDelta:
          first && latest ? Number((latest.weight - first.weight).toFixed(2)) : 0,
        latestComparison: latest?.comparison || null,
        prCount,
        nextTarget: buildNextTarget({ latest, bestWeight, bestWeightReps }),
        latestTimestamp: latest?.timestamp || 0,
      };
    })
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp || a.name.localeCompare(b.name, "es"));
}

export function getExerciseProgressByKey(workouts = [], exerciseKey) {
  return buildExerciseProgress(workouts).find((exercise) => exercise.key === exerciseKey) || null;
}

export { normalizeExerciseName };
