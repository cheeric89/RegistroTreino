import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useWorkouts } from "../hooks/useWorkouts";

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
  const dataLayer = useWorkouts();
  const [workouts, setWorkouts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const refreshWorkouts = useCallback(async () => {
    if (!user) {
      setWorkouts([]);
      setSyncError(null);
      return [];
    }

    setSyncing(true);
    const next = await dataLayer.fetchWorkouts();
    setWorkouts(sortAndDedupe(next));
    setSyncError(dataLayer.error || null);
    setSyncing(false);
    return next;
  }, [dataLayer, user]);

  useEffect(() => {
    refreshWorkouts();
  }, [refreshWorkouts]);

  const saveWorkout = useCallback(async (workout) => {
    const timestamp = Number(workout?.timestamp) || Date.now();
    const normalized = { ...workout, timestamp };

    setWorkouts((current) =>
      sortAndDedupe([normalized, ...current.filter((item) => Number(item.timestamp) !== timestamp)])
    );

    const result = await dataLayer.saveWorkout(normalized);
    setSyncError(result.error || null);
    return result;
  }, [dataLayer]);

  const deleteWorkout = useCallback(async (timestamp) => {
    const numericTimestamp = Number(timestamp);
    setWorkouts((current) =>
      current.filter((workout) => Number(workout.timestamp) !== numericTimestamp)
    );

    const result = await dataLayer.deleteWorkout(numericTimestamp);
    setSyncError(result.error || null);
    return result;
  }, [dataLayer]);

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
