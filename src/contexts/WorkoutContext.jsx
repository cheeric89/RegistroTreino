import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { WORKOUT_SAVED_EVENT } from "../utils/storage";

const WorkoutContext = createContext(null);

const sortAndDedupe = (workouts = []) => {
  const map = new Map();
  workouts.forEach((workout) => {
    const timestamp = Number(workout?.timestamp);
    if (!Number.isFinite(timestamp)) return;
    map.set(timestamp, { ...workout, timestamp });
  });
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
};

export function WorkoutProvider({ children }) {
  const { user } = useAuth();
  const {
    fetchWorkouts,
    saveWorkout: persistWorkout,
    deleteWorkout: persistDelete,
    error: dataError,
  } = useWorkouts();

  const [workouts, setWorkouts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    setSyncError(dataError || null);
  }, [dataError]);

  const refreshWorkouts = useCallback(async () => {
    if (!user) {
      setWorkouts([]);
      setSyncError(null);
      return [];
    }

    setSyncing(true);
    try {
      const next = await fetchWorkouts();
      setWorkouts(sortAndDedupe(next));
      return next;
    } finally {
      setSyncing(false);
    }
  }, [fetchWorkouts, user]);

  useEffect(() => {
    refreshWorkouts();
  }, [refreshWorkouts]);

  const saveWorkout = useCallback(async (workout) => {
    const timestamp = Number(workout?.timestamp) || Date.now();
    const normalized = { ...workout, timestamp };

    setWorkouts((current) =>
      sortAndDedupe([normalized, ...current.filter((item) => Number(item.timestamp) !== timestamp)])
    );

    const result = await persistWorkout(normalized);
    setSyncError(result.error || null);
    return result;
  }, [persistWorkout]);

  const deleteWorkout = useCallback(async (timestamp) => {
    const numericTimestamp = Number(timestamp);
    setWorkouts((current) =>
      current.filter((workout) => Number(workout.timestamp) !== numericTimestamp)
    );

    const result = await persistDelete(numericTimestamp);
    setSyncError(result.error || null);
    return result;
  }, [persistDelete]);

  useEffect(() => {
    const handleLocalWorkoutSaved = (event) => {
      const workout = event?.detail?.workout;
      if (workout) saveWorkout(workout);
    };

    window.addEventListener(WORKOUT_SAVED_EVENT, handleLocalWorkoutSaved);
    return () => window.removeEventListener(WORKOUT_SAVED_EVENT, handleLocalWorkoutSaved);
  }, [saveWorkout]);

  const value = useMemo(() => ({
    workouts,
    syncing,
    syncError,
    refreshWorkouts,
    saveWorkout,
    deleteWorkout,
  }), [deleteWorkout, refreshWorkouts, saveWorkout, syncError, syncing, workouts]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutContext() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkoutContext debe usarse dentro de WorkoutProvider");
  }
  return context;
}
