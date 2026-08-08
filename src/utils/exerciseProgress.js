const normalize = (value = "") =>
  value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const getValidSets = (sets = []) =>
  sets.filter((set) => {
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

export function buildExerciseProgress(workouts = []) {
  const byExercise = new Map();

  [...workouts]
    .sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0))
    .forEach((workout) => {
      const workoutTimestamp = Number(workout?.timestamp) || 0;

      (workout?.exercises || []).forEach((category) => {
        (category?.exercises || []).forEach((exercise) => {
          const name = exercise?.name?.trim();
          if (!name || normalize(name).startsWith("ejercicio ")) return;

          const sets = getValidSets(exercise?.sets || []);
          if (!sets.length) return;

          const key = normalize(name);
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
      const points = entry.points.sort((a, b) => a.timestamp - b.timestamp);
      const first = points[0] || null;
      const latest = points.at(-1) || null;
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

      return {
        key: entry.key,
        name: entry.name,
        categories: [...entry.categories],
        points,
        sessions: points.length,
        first,
        latest,
        bestWeight: bestWeightPoint?.weight || 0,
        bestWeightReps: bestWeightPoint?.bestSetReps || 0,
        bestVolume: bestVolumePoint?.volume || 0,
        weightDelta:
          first && latest ? Number((latest.weight - first.weight).toFixed(2)) : 0,
        latestTimestamp: latest?.timestamp || 0,
      };
    })
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp || a.name.localeCompare(b.name, "es"));
}

export function getExerciseProgressByKey(workouts = [], exerciseKey) {
  return buildExerciseProgress(workouts).find((exercise) => exercise.key === exerciseKey) || null;
}

export function normalizeExerciseName(value = "") {
  return normalize(value);
}
