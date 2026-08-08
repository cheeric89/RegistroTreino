export const routineToTemplateCategories = (routine) =>
  (routine?.categories || []).map((category) => ({
    name: category.name,
    exercises: (category.exercises || []).map((exercise) => ({
      name: exercise.name,
      sets: Array.from({ length: Math.max(1, Number(exercise.sets) || 1) }, () => ({})),
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
