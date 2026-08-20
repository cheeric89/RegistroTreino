import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  getBodyNutritionQueue,
  getLocalBodyEntries,
  getLocalNutritionEntries,
  mergeBodyNutritionEntries,
  queueBodyNutritionOperation,
  removeBodyNutritionOperation,
  replaceLocalBodyEntries,
  replaceLocalNutritionEntries,
  upsertLocalBodyEntry,
  upsertLocalNutritionEntry,
} from "../utils/bodyNutritionStorage";
import { getLocalDateKey } from "../utils/nutritionBodyAnalytics";

const BODY_TABLE = "body_entries";
const NUTRITION_TABLE = "nutrition_entries";

const nullableNumber = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegative = (value) => Math.max(0, Number(value) || 0);

const normalizeBodyEntry = (entry = {}) => ({
  entry_date: String(entry.entry_date || getLocalDateKey()),
  weight_kg: nullableNumber(entry.weight_kg),
  waist_cm: nullableNumber(entry.waist_cm),
  chest_cm: nullableNumber(entry.chest_cm),
  arm_cm: nullableNumber(entry.arm_cm),
  thigh_cm: nullableNumber(entry.thigh_cm),
  hip_cm: nullableNumber(entry.hip_cm),
});

const normalizeNutritionEntry = (entry = {}) => ({
  entry_date: String(entry.entry_date || getLocalDateKey()),
  calories: Math.round(nonNegative(entry.calories)),
  protein_g: Math.round(nonNegative(entry.protein_g) * 10) / 10,
  carbs_g: Math.round(nonNegative(entry.carbs_g) * 10) / 10,
  fat_g: Math.round(nonNegative(entry.fat_g) * 10) / 10,
});

const toRemotePayload = (entry, userId) => ({
  user_id: userId,
  ...entry,
  updated_at: new Date().toISOString(),
});

export function useBodyNutrition() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [bodyEntries, setBodyEntries] = useState(() => getLocalBodyEntries(userId));
  const [nutritionEntries, setNutritionEntries] = useState(() => getLocalNutritionEntries(userId));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const flushQueue = useCallback(async () => {
    if (!userId) return;
    const queue = getBodyNutritionQueue(userId);

    for (const operation of queue) {
      const table = operation.kind === "body" ? BODY_TABLE : NUTRITION_TABLE;
      const normalizer = operation.kind === "body" ? normalizeBodyEntry : normalizeNutritionEntry;
      const entry = normalizer(operation.entry);
      const { error } = await supabase
        .from(table)
        .upsert(toRemotePayload(entry, userId), { onConflict: "user_id,entry_date" });

      if (!error) removeBodyNutritionOperation(userId, operation.kind, entry.entry_date);
    }
  }, [userId]);

  const fetchEntries = useCallback(async () => {
    const localBody = getLocalBodyEntries(userId);
    const localNutrition = getLocalNutritionEntries(userId);
    setBodyEntries(localBody);
    setNutritionEntries(localNutrition);

    if (!userId) return;

    setLoading(true);
    setSyncError(null);
    await flushQueue();
    const pending = getBodyNutritionQueue(userId);

    const [bodyResult, nutritionResult] = await Promise.all([
      supabase
        .from(BODY_TABLE)
        .select("entry_date,weight_kg,waist_cm,chest_cm,arm_cm,thigh_cm,hip_cm,updated_at")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false }),
      supabase
        .from(NUTRITION_TABLE)
        .select("entry_date,calories,protein_g,carbs_g,fat_g,updated_at")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false }),
    ]);

    setLoading(false);

    if (bodyResult.error || nutritionResult.error) {
      const message = bodyResult.error?.message || nutritionResult.error?.message || "Sin conexion";
      setSyncError(message);
      return;
    }

    const pendingBody = pending.filter((item) => item.kind === "body").map((item) => item.entry);
    const pendingNutrition = pending.filter((item) => item.kind === "nutrition").map((item) => item.entry);
    const nextBody = mergeBodyNutritionEntries(bodyResult.data || [], pendingBody);
    const nextNutrition = mergeBodyNutritionEntries(nutritionResult.data || [], pendingNutrition);

    replaceLocalBodyEntries(userId, nextBody);
    replaceLocalNutritionEntries(userId, nextNutrition);
    setBodyEntries(nextBody);
    setNutritionEntries(nextNutrition);
    setSyncError(null);
  }, [flushQueue, userId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const saveBodyEntry = useCallback(async (rawEntry) => {
    const entry = normalizeBodyEntry(rawEntry);
    setSaving(true);
    const next = upsertLocalBodyEntry(userId, entry);
    setBodyEntries(next);

    if (!userId) {
      setSaving(false);
      return { error: null, synced: false, entry };
    }

    const { error } = await supabase
      .from(BODY_TABLE)
      .upsert(toRemotePayload(entry, userId), { onConflict: "user_id,entry_date" });

    setSaving(false);
    if (error) {
      queueBodyNutritionOperation(userId, { kind: "body", entry });
      setSyncError(error.message);
      return { error: error.message, synced: false, entry };
    }

    removeBodyNutritionOperation(userId, "body", entry.entry_date);
    setSyncError(null);
    return { error: null, synced: true, entry };
  }, [userId]);

  const saveNutritionEntry = useCallback(async (rawEntry) => {
    const entry = normalizeNutritionEntry(rawEntry);
    setSaving(true);
    const next = upsertLocalNutritionEntry(userId, entry);
    setNutritionEntries(next);

    if (!userId) {
      setSaving(false);
      return { error: null, synced: false, entry };
    }

    const { error } = await supabase
      .from(NUTRITION_TABLE)
      .upsert(toRemotePayload(entry, userId), { onConflict: "user_id,entry_date" });

    setSaving(false);
    if (error) {
      queueBodyNutritionOperation(userId, { kind: "nutrition", entry });
      setSyncError(error.message);
      return { error: error.message, synced: false, entry };
    }

    removeBodyNutritionOperation(userId, "nutrition", entry.entry_date);
    setSyncError(null);
    return { error: null, synced: true, entry };
  }, [userId]);

  return {
    bodyEntries,
    nutritionEntries,
    loading,
    saving,
    syncError,
    fetchEntries,
    saveBodyEntry,
    saveNutritionEntry,
  };
}
