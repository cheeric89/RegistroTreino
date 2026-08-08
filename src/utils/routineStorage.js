import { cloneDefaultRoutines } from "../data/defaultRoutines";

const ACTIVE_USER_KEY = "treino_active_routine_user";
const routinesKey = (userId) => `treino_routines:${userId || "guest"}`;
const pendingKey = (userId) => `treino_routines_pending:${userId || "guest"}`;

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

export const setActiveRoutineUser = (userId) => {
  try {
    if (userId) localStorage.setItem(ACTIVE_USER_KEY, userId);
    else localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    // Cache opcional.
  }
};

const getActiveUser = () => {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || "guest";
  } catch {
    return "guest";
  }
};

export const getLocalRoutines = (userId = null) => {
  const resolved = userId || getActiveUser();
  const saved = readJSON(routinesKey(resolved), []);
  return Array.isArray(saved) && saved.length ? saved : cloneDefaultRoutines();
};

export const replaceLocalRoutines = (routines, userId = null) => {
  const resolved = userId || getActiveUser();
  return writeJSON(routinesKey(resolved), Array.isArray(routines) ? routines : []);
};

export const saveLocalRoutine = (routine, userId = null) => {
  const resolved = userId || getActiveUser();
  const current = getLocalRoutines(resolved);
  const next = [
    ...current.filter((item) => item.type !== routine.type),
    routine,
  ].sort((a, b) => ["push", "pull", "legs"].indexOf(a.type) - ["push", "pull", "legs"].indexOf(b.type));
  replaceLocalRoutines(next, resolved);
  return next;
};

export const getPendingRoutineTypes = (userId) =>
  readJSON(pendingKey(userId), []);

export const markRoutinePending = (userId, type) => {
  const pending = new Set(getPendingRoutineTypes(userId));
  pending.add(type);
  writeJSON(pendingKey(userId), [...pending]);
};

export const clearRoutinePending = (userId, type) => {
  const next = getPendingRoutineTypes(userId).filter((item) => item !== type);
  writeJSON(pendingKey(userId), next);
};
