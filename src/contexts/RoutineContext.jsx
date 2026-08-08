import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRoutines } from "../hooks/useRoutines";
import { getDefaultRoutine } from "../data/defaultRoutines";

const RoutineContext = createContext(null);

export function RoutineProvider({ children }) {
  const { user } = useAuth();
  const { fetchRoutines, saveRoutine: persistRoutine, error: dataError } = useRoutines();
  const [routines, setRoutines] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => setSyncError(dataError || null), [dataError]);

  const refreshRoutines = useCallback(async () => {
    if (!user) {
      setRoutines([]);
      return [];
    }

    setSyncing(true);
    try {
      const next = await fetchRoutines();
      setRoutines(next);
      return next;
    } finally {
      setSyncing(false);
    }
  }, [fetchRoutines, user]);

  useEffect(() => {
    refreshRoutines();
  }, [refreshRoutines]);

  const saveRoutine = useCallback(async (routine) => {
    setRoutines((current) => [
      ...current.filter((item) => item.type !== routine.type),
      routine,
    ].sort((a, b) => ["push", "pull", "legs"].indexOf(a.type) - ["push", "pull", "legs"].indexOf(b.type)));

    const result = await persistRoutine(routine);
    setSyncError(result.error || null);
    return result;
  }, [persistRoutine]);

  const resetRoutine = useCallback(async (type) => {
    const fallback = getDefaultRoutine(type);
    if (!fallback) return { error: "Rutina no encontrada" };
    return saveRoutine(fallback);
  }, [saveRoutine]);

  const getRoutine = useCallback(
    (type) => routines.find((routine) => routine.type === type) || getDefaultRoutine(type),
    [routines]
  );

  const value = useMemo(() => ({
    routines,
    syncing,
    syncError,
    refreshRoutines,
    saveRoutine,
    resetRoutine,
    getRoutine,
  }), [getRoutine, refreshRoutines, resetRoutine, routines, saveRoutine, syncError, syncing]);

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>;
}

export function useRoutineContext() {
  const context = useContext(RoutineContext);
  if (!context) throw new Error("useRoutineContext debe usarse dentro de RoutineProvider");
  return context;
}
