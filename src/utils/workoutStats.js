// src/utils/workoutStats.js
// Estadísticas agregadas del historial de entrenamientos.
//
// DISEÑO: funciones puras que reciben el array de workouts ya cargado
// (sea desde localStorage o desde Supabase) en vez de leer storage
// directamente. Así se pueden reusar tanto en ProgressView como en
// Dashboard o en reportes futuros sin acoplarse a una fuente de datos.

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Total de sesiones registradas */
export function getTotalSessions(workouts = []) {
  return workouts.length;
}

/** Volumen total histórico: suma de (peso × reps) de todas las series */
export function getTotalVolume(workouts = []) {
  return workouts.reduce((total, w) => {
    const cats = w?.exercises ?? w?.categories ?? [];
    if (!Array.isArray(cats)) return total;

    const workoutVol = cats.reduce((catAcc, cat) => {
      const exVol = (cat?.exercises ?? []).reduce((exAcc, ex) => {
        const setsVol = (ex?.sets ?? []).reduce((s, set) => {
          const weight = parseFloat(set?.weight) || 0;
          const reps = parseInt(set?.reps, 10) || 0;
          return s + weight * reps;
        }, 0);
        return exAcc + setsVol;
      }, 0);
      return catAcc + exVol;
    }, 0);

    return total + workoutVol;
  }, 0);
}

/** Cantidad de sesiones en los últimos N días (por defecto 7) */
export function getSessionsInLastDays(workouts = [], days = 7) {
  const threshold = Date.now() - days * DAY_MS;
  return workouts.filter((w) => (w?.timestamp || 0) >= threshold).length;
}

/**
 * Racha actual de días consecutivos con al menos un entrenamiento.
 * Cuenta hacia atrás desde hoy (o desde ayer, si hoy todavía no se
 * entrenó pero ayer sí) hasta encontrar el primer día sin sesión.
 */
export function getCurrentStreak(workouts = []) {
  if (!workouts.length) return 0;

  const trainedDays = new Set(
    workouts.filter((w) => w?.timestamp).map((w) => startOfDay(w.timestamp))
  );

  let cursor = startOfDay(Date.now());

  if (!trainedDays.has(cursor)) {
    cursor -= DAY_MS;
    if (!trainedDays.has(cursor)) return 0; // ni hoy ni ayer → racha rota
  }

  let streak = 0;
  while (trainedDays.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }

  return streak;
}