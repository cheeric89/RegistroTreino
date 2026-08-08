import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cloneDefaultRoutines } from "../data/defaultRoutines";
import {
  clearRoutinePending,
  getLocalRoutines,
  getPendingRoutineTypes,
  markRoutinePending,
  replaceLocalRoutines,
  saveLocalRoutine,
  setActiveRoutineUser,
} from "../utils/routineStorage";

const TABLE = "routines";
const ORDER = ["push", "pull", "legs"];

const normalizeRoutine = (routine = {}) => ({
  type: routine.type,
  name: routine.name || routine.type || "Rutina",
  emoji: routine.emoji || "💪",
  description: routine.description || "Rutina personalizada",
  categories: Array.isArray(routine.categories) ? routine.categories : [],
});

const sortRoutines = (routines = []) =>
  [...routines].map(normalizeRoutine).sort(
    (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type)
  );

const toPayload = (routine, userId) => ({
  user_id: userId,
  type: routine.type,
  name: routine.name,
  emoji: routine.emoji,
  description: routine.description,
  categories: routine.categories,
});

export function useRoutines() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const flushPending = useCallback(async (userId) => {
    const pendingTypes = getPendingRoutineTypes(userId);
    if (!pendingTypes.length) return;

    const local = getLocalRoutines(userId);
    for (const type of pendingTypes) {
      const routine = local.find((item) => item.type === type);
      if (!routine) continue;

      const { error: syncError } = await supabase
        .from(TABLE)
        .upsert(toPayload(routine, userId), { onConflict: "user_id,type" });

      if (!syncError) clearRoutinePending(userId, type);
    }
  }, []);

  const fetchRoutines = useCallback(async () => {
    if (!user) {
      setActiveRoutineUser(null);
      return cloneDefaultRoutines();
    }

    const userId = user.id;
    setActiveRoutineUser(userId);
    setLoading(true);
    setError(null);

    await flushPending(userId);

    const local = getLocalRoutines(userId);
    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select("type,name,emoji,description,categories")
      .eq("user_id", userId);

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return sortRoutines(local);
    }

    if (!data?.length) {
      const seed = sortRoutines(local.length ? local : cloneDefaultRoutines());
      replaceLocalRoutines(seed, userId);

      const { error: seedError } = await supabase
        .from(TABLE)
        .upsert(seed.map((routine) => toPayload(routine, userId)), {
          onConflict: "user_id,type",
        });

      if (seedError) {
        seed.forEach((routine) => markRoutinePending(userId, routine.type));
        setError(seedError.message);
      }

      return seed;
    }

    const remote = sortRoutines(data);
    replaceLocalRoutines(remote, userId);
    setError(null);
    return remote;
  }, [flushPending, user]);

  const saveRoutine = useCallback(async (routine) => {
    const normalized = normalizeRoutine(routine);

    if (!user) {
      saveLocalRoutine(normalized);
      return { error: null, synced: false };
    }

    const userId = user.id;
    setActiveRoutineUser(userId);
    saveLocalRoutine(normalized, userId);

    const { error: saveError } = await supabase
      .from(TABLE)
      .upsert(toPayload(normalized, userId), { onConflict: "user_id,type" });

    if (saveError) {
      markRoutinePending(userId, normalized.type);
      setError(saveError.message);
      return { error: saveError.message, synced: false };
    }

    clearRoutinePending(userId, normalized.type);
    setError(null);
    return { error: null, synced: true };
  }, [user]);

  return { fetchRoutines, saveRoutine, loading, error };
}
