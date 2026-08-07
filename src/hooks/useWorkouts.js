import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  clearLegacyWorkouts,
  deleteWorkout as localDelete,
  getAllWorkouts as localGetAll,
  getLegacyWorkouts,
  getWorkoutSyncQueue,
  hasMigratedLegacyWorkouts,
  markLegacyWorkoutsMigrated,
  queueWorkoutSyncOperation,
  removeWorkoutSyncOperation,
  replaceAllWorkouts,
  saveWorkout as localSave,
  setActiveWorkoutUser,
} from "../utils/storage";

const TABLE = "workouts";

const normalizeWorkout = (row = {}) => ({
  day: row.day || "Entrenamiento",
  date: row.date || "",
  timestamp: Number(row.timestamp) || Date.now(),
  duration: Number(row.duration) || 0,
  volume: Number(row.volume) || 0,
  exercises: Array.isArray(row.exercises) ? row.exercises : [],
  categories: Array.isArray(row.categories) ? row.categories : [],
});

const toPayload = (workout, userId) => {
  const normalized = normalizeWorkout(workout);
  return {
    user_id: userId,
    day: normalized.day,
    date: normalized.date,
    timestamp: normalized.timestamp,
    duration: normalized.duration,
    volume: normalized.volume,
    exercises: normalized.exercises,
    categories: normalized.categories,
  };
};

const mergeByTimestamp = (...collections) => {
  const map = new Map();
  collections.flat().forEach((workout) => {
    const timestamp = Number(workout?.timestamp);
    if (!Number.isFinite(timestamp)) return;
    map.set(timestamp, normalizeWorkout(workout));
  });
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
};

export function useWorkouts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const flushPendingOperations = useCallback(async (userId) => {
    const queue = getWorkoutSyncQueue(userId);

    for (const operation of queue) {
      let err = null;

      if (operation.type === "delete") {
        const result = await supabase
          .from(TABLE)
          .delete()
          .eq("user_id", userId)
          .eq("timestamp", Number(operation.timestamp));
        err = result.error;
      } else if (operation.type === "upsert" && operation.workout) {
        const result = await supabase
          .from(TABLE)
          .upsert(toPayload(operation.workout, userId), {
            onConflict: "user_id,timestamp",
          });
        err = result.error;
      }

      if (!err) {
        removeWorkoutSyncOperation(userId, operation.timestamp);
      }
    }
  }, []);

  const migrateLegacyWorkouts = useCallback(async (userId) => {
    if (hasMigratedLegacyWorkouts(userId)) return { migrated: true, error: null };

    const legacy = getLegacyWorkouts();
    if (!legacy.length) {
      markLegacyWorkoutsMigrated(userId);
      return { migrated: true, error: null };
    }

    const { error: migrationError } = await supabase
      .from(TABLE)
      .upsert(legacy.map((workout) => toPayload(workout, userId)), {
        onConflict: "user_id,timestamp",
      });

    if (migrationError) {
      return { migrated: false, error: migrationError };
    }

    markLegacyWorkoutsMigrated(userId);
    clearLegacyWorkouts();
    return { migrated: true, error: null };
  }, []);

  const fetchWorkouts = useCallback(async () => {
    if (!user) {
      setActiveWorkoutUser(null);
      return [];
    }

    const userId = user.id;
    setActiveWorkoutUser(userId);
    setLoading(true);
    setError(null);

    const localCache = localGetAll(userId);
    const legacy = hasMigratedLegacyWorkouts(userId) ? [] : getLegacyWorkouts();

    const migration = await migrateLegacyWorkouts(userId);
    if (migration.error) {
      console.warn("[useWorkouts] migracion local pendiente:", migration.error.message);
    }

    await flushPendingOperations(userId);

    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select("day,date,timestamp,duration,volume,exercises,categories")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    setLoading(false);

    if (fetchError) {
      console.warn("[useWorkouts] Supabase no disponible, usando cache:", fetchError.message);
      setError(fetchError.message);
      const fallback = mergeByTimestamp(localCache, legacy);
      replaceAllWorkouts(fallback, userId);
      return fallback;
    }

    const remote = (data || []).map(normalizeWorkout);
    replaceAllWorkouts(remote, userId);
    return remote;
  }, [flushPendingOperations, migrateLegacyWorkouts, user]);

  const saveWorkout = useCallback(async (workout) => {
    const normalized = normalizeWorkout(workout);

    if (!user) {
      localSave(normalized, null, { emit: false });
      return { error: null, synced: false };
    }

    const userId = user.id;
    setActiveWorkoutUser(userId);
    localSave(normalized, userId, { emit: false });

    const { error: saveError } = await supabase
      .from(TABLE)
      .upsert(toPayload(normalized, userId), {
        onConflict: "user_id,timestamp",
      });

    if (saveError) {
      queueWorkoutSyncOperation(userId, {
        type: "upsert",
        timestamp: normalized.timestamp,
        workout: normalized,
      });
      setError(saveError.message);
      console.warn("[useWorkouts] guardado remoto pendiente:", saveError.message);
      return { error: saveError.message, synced: false };
    }

    removeWorkoutSyncOperation(userId, normalized.timestamp);
    return { error: null, synced: true };
  }, [user]);

  const deleteWorkout = useCallback(async (timestamp) => {
    const numericTimestamp = Number(timestamp);

    if (!user) {
      localDelete(numericTimestamp);
      return { error: null, synced: false };
    }

    const userId = user.id;
    localDelete(numericTimestamp, userId);

    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("timestamp", numericTimestamp);

    if (deleteError) {
      queueWorkoutSyncOperation(userId, {
        type: "delete",
        timestamp: numericTimestamp,
      });
      setError(deleteError.message);
      return { error: deleteError.message, synced: false };
    }

    removeWorkoutSyncOperation(userId, numericTimestamp);
    return { error: null, synced: true };
  }, [user]);

  return {
    fetchWorkouts,
    saveWorkout,
    deleteWorkout,
    loading,
    error,
  };
}
