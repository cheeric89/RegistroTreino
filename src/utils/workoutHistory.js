import {
  choosePreferredExerciseName,
  normalizeExerciseName,
} from "./exerciseNames";

const GROUP_DEFINITIONS = {
  push: {
    id: "push",
    label: "Push",
    subtitle: "Pecho · Hombros · Tríceps",
    muscles: ["pecho", "hombro", "hombros", "triceps", "tríceps"],
  },
  pull: {
    id: "pull",
    label: "Pull",
    subtitle: "Espalda · Bíceps · Antebrazo",
    muscles: ["espalda", "biceps", "bíceps", "antebrazo", "antebrazos"],
  },
  legs: {
    id: "legs",
    label: "Legs",
    subtitle: "Piernas · Glúteos · Gemelos",
    muscles: [
      "pierna",
      "piernas",
      "cuadriceps",
      "cuádriceps",
      "femoral",
      "femorales",
      "gluteo",
      "glúteo",
      "gluteos",
      "glúteos",
      "gemelo",
      "gemelos",
      "pantorrilla",
      "pantorrillas",
    ],
  },
};

export const HISTORY_GROUPS = Object.values(GROUP_DEFINITIONS);

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

const getCategories = (workout) => {
  if (Array.isArray(workout?.categories) && workout.categories.length) {
    return workout.categories;
  }

  return (workout?.exercises || [])
    .map((category) => category?.name)
    .filter(Boolean);
};

export function getWorkoutGroup(workout) {
  const scores = { push: 0, pull: 0, legs: 0 };

  getCategories(workout).forEach((category) => {
    const normalizedCategory = normalize(category);

    Object.values(GROUP_DEFINITIONS).forEach((group) => {
      if (group.muscles.some((muscle) => normalize(muscle) === normalizedCategory)) {
        scores[group.id] += 1;
      }
    });
  });

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!ranked[0] || ranked[0][1] === 0) return "other";

  const bestScore = ranked[0][1];
  const tied = ranked.filter(([, score]) => score === bestScore).map(([id]) => id);
  if (tied.includes("legs")) return "legs";

  return tied[0];
}

export function groupWorkouts(workouts = []) {
  const grouped = { push: [], pull: [], legs: [], other: [] };

  [...workouts]
    .sort((a, b) => (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0))
    .forEach((workout) => {
      grouped[getWorkoutGroup(workout)].push(workout);
    });

  return grouped;
}

export function getWorkoutVolume(workout) {
  if (Number.isFinite(Number(workout?.volume))) return Number(workout.volume);

  return (workout?.exercises || []).reduce(
    (total, category) =>
      total +
      (category?.exercises || []).reduce(
        (categoryTotal, exercise) =>
          categoryTotal +
          (exercise?.sets || []).reduce(
            (setTotal, set) =>
              setTotal + (Number(set?.weight) || 0) * (Number(set?.reps) || 0),
            0
          ),
        0
      ),
    0
  );
}

export function getBestExerciseMarks(workouts = [], limit = 5) {
  const bestByExercise = new Map();

  workouts.forEach((workout) => {
    (workout?.exercises || []).forEach((category) => {
      (category?.exercises || []).forEach((exercise) => {
        const exerciseName = exercise?.name?.trim();
        if (!exerciseName) return;

        const key = normalizeExerciseName(exerciseName);
        if (!key) return;

        (exercise?.sets || []).forEach((set) => {
          const weight = Number(set?.weight) || 0;
          const reps = Number(set?.reps) || 0;
          if (weight <= 0 && reps <= 0) return;

          const current = bestByExercise.get(key);
          const candidate = {
            name: choosePreferredExerciseName(current?.name, exerciseName),
            category: category?.name || "Sin grupo",
            weight,
            reps,
            volume: weight * reps,
            timestamp: Number(workout?.timestamp) || 0,
          };

          const isBetter =
            !current ||
            candidate.weight > current.weight ||
            (candidate.weight === current.weight && candidate.reps > current.reps) ||
            (candidate.weight === current.weight &&
              candidate.reps === current.reps &&
              candidate.timestamp > current.timestamp);

          if (isBetter) {
            bestByExercise.set(key, candidate);
          } else if (current) {
            current.name = choosePreferredExerciseName(current.name, exerciseName);
          }
        });
      });
    });
  });

  return [...bestByExercise.values()]
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps || b.volume - a.volume)
    .slice(0, limit);
}

export function getHistoryGroupMeta(groupId) {
  return GROUP_DEFINITIONS[groupId] || {
    id: "other",
    label: "Otros",
    subtitle: "Rutinas personalizadas",
    muscles: [],
  };
}
