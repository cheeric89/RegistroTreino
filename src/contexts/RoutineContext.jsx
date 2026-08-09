import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRoutines } from "../hooks/useRoutines";
import { getDefaultRoutine } from "../data/defaultRoutines";
import { sortRoutines } from "../utils/routineStorage";

const RoutineContext = createContext(null);

export function RoutineProvider({ children }) {
  const { user } = useAuth();
  const {
    fetchRoutines,
    saveRoutine: persistRoutine,
    deleteRoutine: persistDeleteRoutine,
    error: dataError,
  } = useRoutines();
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
    setRoutines((current) => sortRoutines([
      ...current.filter((item) => item.type !== routine.type),
      routine,
    ]));

    const result = await persistRoutine(routine);
    setSyncError(result.error || null);
    return result;
  }, [persistRoutine]);

  const deleteRoutine = useCallback(async (type) => {
    setRoutines((current) => current.filter((routine) => routine.type !== type));
    const result = await persistDeleteRoutine(type);
    setSyncError(result.error || null);
    return result;
  }, [persistDeleteRoutine]);

  const resetRoutine = useCallback(async (type) => {
    const fallback = getDefaultRoutine(type);
    if (!fallback) return { error: "Esta rutina no tiene una base de Treino" };
    return saveRoutine(fallback);
  }, [saveRoutine]);

  const getRoutine = useCallback(
    (type) => routines.find((routine) => routine.type === type) || getDefaultRoutine(type) || null,
    [routines]
  );

  const value = useMemo(() => ({
    routines,
    syncing,
    syncError,
    refreshRoutines,
    saveRoutine,
    deleteRoutine,
    resetRoutine,
    getRoutine,
  }), [deleteRoutine, getRoutine, refreshRoutines, resetRoutine, routines, saveRoutine, syncError, syncing]);

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>;
}

export function useRoutineContext() {
  const context = useContext(RoutineContext);
  if (!context) throw new Error("useRoutineContext debe usarse dentro de RoutineProvider");
  return context;
}
