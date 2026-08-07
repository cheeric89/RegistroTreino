import { useMemo } from "react";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { getAllPRs } from "../utils/progressionEngine";

/**
 * Los PR se calculan desde el historial ya sincronizado con Supabase.
 * Así PC y móvil muestran exactamente las mismas marcas sin mantener
 * una segunda tabla derivada que pueda quedar desactualizada.
 */
export function usePRs() {
  const { workouts, syncing, syncError, refreshWorkouts } = useWorkoutContext();

  const prs = useMemo(() => getAllPRs(workouts), [workouts]);

  return {
    prs,
    loading: syncing,
    error: syncError,
    fetchPRs: refreshWorkouts,
  };
}
