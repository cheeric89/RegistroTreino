// src/utils/storage.js — persistencia local y cache offline-first

import {
  choosePreferredExerciseName,
  normalizeExerciseName,
} from "./exerciseNames";

const LEGACY_WORKOUTS_KEY = "treino_workouts";
const ACTIVE_USER_KEY = "treino_active_workout_user";
const DRAFT_KEY = "treino_workout_draft";
const PROFILE_KEY = "treino_user_profile";
export const WORKOUT_SAVED_EVENT = "treino:workout-saved";

const userWorkoutsKey = (userId) => `treino_workouts:${userId}`;
const syncQueueKey = (userId) => `treino_workout_sync_queue:${userId}`;
const migrationKey = (userId) => `treino_workout_legacy_migrated:${userId}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const emitWorkoutSaved = (workout) => {
  try {
    window.dispatchEvent(new CustomEvent(WORKOUT_SAVED_EVENT, { detail: { workout } }));
  } catch {
    // Entornos sin window (tests/build) simplemente omiten la notificacion.
  }
};

const getActiveUserId = () => {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || null;
  } catch {
    return null;
  }
};

const resolveWorkoutKey = (userId) => {
  const resolvedUser = userId || getActiveUserId();
  return resolvedUser ? userWorkoutsKey(resolvedUser) : LEGACY_WORKOUTS_KEY;
};

const sortAndDedupeWorkouts = (workouts = []) => {
  const byTimestamp = new Map();

  workouts.forEach((workout) => {
    const timestamp = Number(workout?.timestamp);
    if (!Number.isFinite(timestamp)) return;
    byTimestamp.set(timestamp, { ...workout, timestamp });
  });

  return [...byTimestamp.values()].sort((a, b) => b.timestamp - a.timestamp);
};

export function setActiveWorkoutUser(userId) {
  try {
    if (userId) localStorage.setItem(ACTIVE_USER_KEY, userId);
    else localStorage.removeItem(ACTIVE_USER_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getAllWorkouts(userId = null) {
  return sortAndDedupeWorkouts(readJSON(resolveWorkoutKey(userId), []));
}

export function getLegacyWorkouts() {
  return sortAndDedupeWorkouts(readJSON(LEGACY_WORKOUTS_KEY, []));
}

export function clearLegacyWorkouts() {
  try {
    localStorage.removeItem(LEGACY_WORKOUTS_KEY);
    return true;
  } catch {
    return false;
  }
}

export function replaceAllWorkouts(workouts, userId = null) {
  return writeJSON(resolveWorkoutKey(userId), sortAndDedupeWorkouts(workouts));
}

/** Guardar o actualizar un workout por timestamp. */
export function saveWorkout(workout, userId = null, options = {}) {
  try {
    const timestamp = Number(workout?.timestamp) || Date.now();
    const current = getAllWorkouts(userId);
    const updatedWorkout = { ...workout, timestamp };
    const withoutSameTimestamp = current.filter((item) => item.timestamp !== timestamp);
    const saved = replaceAllWorkouts([updatedWorkout, ...withoutSameTimestamp], userId);

    if (saved && options.emit !== false) emitWorkoutSaved(updatedWorkout);
    return saved;
  } catch {
    return false;
  }
}

export function getRecentWorkouts(n = 5, userId = null) {
  return getAllWorkouts(userId).slice(0, n);
}

export function deleteWorkout(timestamp, userId = null) {
  try {
    const numericTimestamp = Number(timestamp);
    return replaceAllWorkouts(
      getAllWorkouts(userId).filter((workout) => workout.timestamp !== numericTimestamp),
      userId
    );
  } catch {
    return false;
  }
}

export function getWorkoutSyncQueue(userId) {
  if (!userId) return [];
  return readJSON(syncQueueKey(userId), []);
}

export function queueWorkoutSyncOperation(userId, operation) {
  if (!userId || !operation?.type || !Number.isFinite(Number(operation?.timestamp))) {
    return false;
  }

  const timestamp = Number(operation.timestamp);
  const queue = getWorkoutSyncQueue(userId).filter(
    (item) => Number(item.timestamp) !== timestamp
  );

  queue.push({
    ...operation,
    timestamp,
    queuedAt: Date.now(),
  });

  return writeJSON(syncQueueKey(userId), queue);
}

export function removeWorkoutSyncOperation(userId, timestamp) {
  if (!userId) return false;
  const numericTimestamp = Number(timestamp);
  const queue = getWorkoutSyncQueue(userId).filter(
    (item) => Number(item.timestamp) !== numericTimestamp
  );
  return writeJSON(syncQueueKey(userId), queue);
}

export function hasMigratedLegacyWorkouts(userId) {
  if (!userId) return false;
  try {
    return localStorage.getItem(migrationKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markLegacyWorkoutsMigrated(userId) {
  if (!userId) return false;
  try {
    localStorage.setItem(migrationKey(userId), "1");
    return true;
  } catch {
    return false;
  }
}

export function getLastExercisePerformance(exerciseName) {
  const normalizedName = normalizeExerciseName(exerciseName);
  if (!normalizedName) return null;

  for (const workout of getAllWorkouts()) {
    for (const category of workout.exercises || []) {
      for (const exercise of category.exercises || []) {
        if (normalizeExerciseName(exercise.name) === normalizedName) {
          return exercise.sets || [];
        }
      }
    }
  }

  return null;
}

// ── Persistencia de BORRADOR (entrenamiento en progreso) ───────────
export function saveDraftWorkout(draft) {
  return writeJSON(DRAFT_KEY, { ...draft, savedAt: Date.now() });
}

export function getDraftWorkout() {
  return readJSON(DRAFT_KEY, null);
}

export function clearDraftWorkout() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

// ── Persistencia LOCAL del perfil (fallback sin conexion) ──────────
export function getLocalProfile() {
  return readJSON(PROFILE_KEY, null);
}

export function saveLocalProfile(profile) {
  return writeJSON(PROFILE_KEY, profile || {});
}

export function getExerciseSuggestions() {
  const exercisesMap = new Map();

  // getAllWorkouts() viene ordenado desde la sesión más reciente. Conservamos
  // sus series como referencia, pero podemos mejorar el nombre visible si una
  // variante histórica está mejor formateada.
  getAllWorkouts().forEach((workout) => {
    (workout.exercises || []).forEach((category) => {
      (category.exercises || []).forEach((exercise) => {
        const name = exercise.name?.trim();
        if (!name) return;

        const key = normalizeExerciseName(name);
        if (!key) return;

        const existing = exercisesMap.get(key);
        if (existing) {
          existing.name = choosePreferredExerciseName(existing.name, name);
          return;
        }

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
