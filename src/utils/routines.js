import { normalizeExercisePrescription } from "./repRangeProgression";

const buildTemplateSets = (exercise = {}) => {
  const prescription = normalizeExercisePrescription(exercise);
  const workingSetCount = prescription.deload
    ? Math.max(1, prescription.sets - 1)
    : prescription.sets;

  return [
    ...Array.from({ length: prescription.warmupSets }, () => ({ setType: "warmup" })),
    ...Array.from({ length: workingSetCount }, () => ({ setType: "working" })),
  ];
};

export const routineToTemplateCategories = (routine) =>
  (routine?.categories || []).map((category) => ({
    name: category.name,
    exercises: (category.exercises || []).map((exercise) => ({
      name: exercise.name,
      ...normalizeExercisePrescription(exercise),
      sets: buildTemplateSets(exercise),
    })),
  }));

export const countRoutineExercises = (routine) =>
  (routine?.categories || []).reduce(
    (total, category) => total + (category.exercises || []).length,
    0
  );

export const countRoutineSets = (routine) =>
  (routine?.categories || []).reduce(
    (total, category) =>
      total +
      (category.exercises || []).reduce(
        (sum, exercise) => sum + Math.max(1, Number(exercise.sets) || 1),
        0
      ),
    0
  );

export const countRoutineWarmupSets = (routine) =>
  (routine?.categories || []).reduce(
    (total, category) =>
      total +
      (category.exercises || []).reduce(
        (sum, exercise) => sum + Math.max(0, Number(exercise.warmupSets) || 0),
        0
      ),
    0
  );

export const isRoutineDeload = (routine) =>
  (routine?.categories || []).some((category) =>
    (category.exercises || []).some((exercise) => exercise.deload === true)
  );

export const setRoutineDeload = (routine, active) => ({
  ...routine,
  categories: (routine?.categories || []).map((category) => ({
    ...category,
    exercises: (category.exercises || []).map((exercise) => ({
      ...exercise,
      deload: Boolean(active),
    })),
  })),
});
