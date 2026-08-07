// utils/storage.js — Capa de persistencia con localStorage
// Para extender:
//   - Reemplazar las funciones aquí por llamadas a una API REST
//     sin tocar ningún componente (solo cambiar este archivo).
//   - Agregar compresión LZ-string para reducir el tamaño guardado.
//   - Exportar / importar datos como JSON para backup del usuario.

const STORAGE_KEY = "treino_workouts";

/** Leer todos los workouts del almacenamiento */
export function getAllWorkouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Guardar un nuevo workout (prepend para tener el más reciente primero) */
export function saveWorkout(workout) {
  try {
    const all = getAllWorkouts();
    const workoutToSave = {
      ...workout,
      timestamp: workout.timestamp || Date.now(),
    };

    const updated = [workoutToSave, ...all];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

/** Obtener los N workouts más recientes para el dashboard */
export function getRecentWorkouts(n = 5) {
  return getAllWorkouts().slice(0, n);
}

/** Eliminar un workout por timestamp */
export function deleteWorkout(timestamp) {
  try {
    const filtered = getAllWorkouts().filter((w) => w.timestamp !== timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/** Devuelve las series de la sesión más reciente de un ejercicio */
export function getLastExercisePerformance(exerciseName) {
  const normalizedName = exerciseName?.trim().toLocaleLowerCase("es");
  if (!normalizedName) return null;

  for (const workout of getAllWorkouts()) {
    for (const category of workout.exercises || []) {
      for (const exercise of category.exercises || []) {
        if (
          exercise.name?.trim().toLocaleLowerCase("es") === normalizedName
        ) {
          return exercise.sets || [];
        }
      }
    }
  }

  return null;
}

// ── Persistencia de BORRADOR (entrenamiento en progreso) ───────────
const DRAFT_KEY = "treino_workout_draft";

/** Guarda (sobrescribe) el borrador actual del formulario */
export function saveDraftWorkout(draft) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
    return true;
  } catch {
    return false;
  }
}

/** Recupera el borrador guardado, o null si no existe / está corrupto */
export function getDraftWorkout() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

/** Elimina el borrador tras guardarlo o descartarlo */
export function clearDraftWorkout() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

// ── Persistencia LOCAL del perfil (fallback sin conexión) ──────────
const PROFILE_KEY = "treino_user_profile";

/** Lee el perfil cacheado localmente, o null si no existe */
export function getLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Sobrescribe el perfil cacheado localmente */
export function saveLocalProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve ejercicios únicos enriquecidos con su grupo muscular y las
 * series de la sesión más reciente. Como los entrenamientos se guardan
 * del más nuevo al más antiguo, conservamos la primera aparición.
 */
export function getExerciseSuggestions() {
  const exercisesMap = new Map();

  getAllWorkouts().forEach((workout) => {
    (workout.exercises || []).forEach((category) => {
      (category.exercises || []).forEach((exercise) => {
        const name = exercise.name?.trim();
        if (!name) return;

        const key = name.toLocaleLowerCase("es");
        if (exercisesMap.has(key)) return;

        exercisesMap.set(key, {
          name,
          category: category.name?.trim() || "Sin grupo muscular",
          lastSets: (exercise.sets || []).map((set) => ({
            weight: set.weight ?? "",
            reps: set.reps ?? "",
          })),
        });
      });
    });
  });

  return [...exercisesMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}
