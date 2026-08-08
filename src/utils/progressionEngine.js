// utils/progressionEngine.js
// Motor de Sobrecarga Progresiva — lógica pura, sin dependencias de UI
//
// DISEÑO:
//   - Todas las funciones son puras (no tienen side effects)
//   - Separadas del storage para poder testearse de forma aislada
//   - El componente WorkoutForm llama a getProgressionHint() y getPRStatus()
//   - Si en el futuro hay backend, solo se cambia `getAllWorkouts()` en storage.js

import { getAllWorkouts } from "../utils/storage";
import {
  choosePreferredExerciseName,
  normalizeExerciseName,
} from "./exerciseNames";

// ── Constantes de progresión ───────────────────────────────
// Incremento estándar sugerido en kg
const WEIGHT_INCREMENT = 2.5;
// Incremento sugerido en reps cuando el peso es bajo (<20kg)
const REPS_INCREMENT = 1;

// ── Búsqueda en historial ──────────────────────────────────
/**
 * Busca la última sesión que contenga un ejercicio equivalente a ese nombre.
 * Devuelve null si no hay historial.
 *
 * @param {string} exerciseName - Nombre del ejercicio a buscar
 * @returns {{ weight: number, reps: number, sets: number } | null}
 */
export function getLastSession(exerciseName) {
  if (!exerciseName?.trim()) return null;

  const normalized = normalizeExerciseName(exerciseName);
  const allWorkouts = getAllWorkouts();

  for (const workout of allWorkouts) {
    // Soporta tanto workout.exercises como workout.categories (retrocompat)
    const cats = workout?.exercises ?? workout?.categories ?? [];
    if (!Array.isArray(cats)) continue;

    for (const cat of cats) {
      const exercises = Array.isArray(cat?.exercises) ? cat.exercises : [];
      for (const ex of exercises) {
        if (normalizeExerciseName(ex?.name) !== normalized) continue;

        // Encontramos el ejercicio — extraemos el mejor set (máx volumen)
        const sets = Array.isArray(ex?.sets) ? ex.sets : [];
        if (sets.length === 0) continue;

        // Filtramos sets que tienen datos reales
        const validSets = sets.filter(
          (s) => parseFloat(s?.weight) > 0 || parseInt(s?.reps, 10) > 0
        );
        if (validSets.length === 0) continue;

        // Tomamos el set con mayor volumen (peso × reps) como referencia
        const bestSet = validSets.reduce((best, s) => {
          const vol = (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0);
          const bestVol = (parseFloat(best?.weight) || 0) * (parseInt(best?.reps, 10) || 0);
          return vol >= bestVol ? s : best;
        }, validSets[0]);

        return {
          weight: parseFloat(bestSet?.weight) || 0,
          reps: parseInt(bestSet?.reps, 10) || 0,
          sets: validSets.length,
          date: workout?.date ?? null,
        };
      }
    }
  }

  return null; // Sin historial para este ejercicio
}

// ── Sugerencia de progresión ───────────────────────────────
/**
 * Genera un hint de progresión para mostrar bajo el nombre del ejercicio.
 */
export function getProgressionHint(exerciseName) {
  const EMPTY = { type: null, last: null, suggested: null, message: "" };

  if (!exerciseName?.trim() || normalizeExerciseName(exerciseName).startsWith("ejercicio")) {
    return EMPTY;
  }

  const last = getLastSession(exerciseName);

  if (!last) {
    return {
      type: "first_time",
      last: null,
      suggested: null,
      message: "Primera vez · ¡Registra esta marca y supérala la próxima!",
    };
  }

  const suggestedWeight =
    last.weight > 0 ? last.weight + WEIGHT_INCREMENT : 0;
  const suggestedReps =
    last.weight === 0 && last.reps > 0
      ? last.reps + REPS_INCREMENT
      : last.reps;

  const weightLabel = last.weight > 0 ? `${last.weight}kg` : "—";
  const suggestLabel =
    suggestedWeight > 0
      ? `${suggestedWeight}kg × ${last.reps} reps`
      : `${last.weight > 0 ? last.weight + "kg × " : ""}${suggestedReps} reps`;

  return {
    type: "suggestion",
    last,
    suggested: { weight: suggestedWeight || last.weight, reps: suggestedReps },
    message: `Marca anterior: ${weightLabel} × ${last.reps} reps · Hoy apunta a ${suggestLabel}`,
  };
}

// ── Detección de PR al guardar ─────────────────────────────
export function getPRStatus(exerciseName, currentSets = []) {
  const NO_COMPARISON = { isPR: false, isRegression: false, isEqual: false, volumeDelta: 0 };

  const last = getLastSession(exerciseName);
  if (!last) return NO_COMPARISON;

  const validCurrent = currentSets.filter(
    (s) => parseFloat(s?.weight) > 0 || parseInt(s?.reps, 10) > 0
  );
  if (validCurrent.length === 0) return NO_COMPARISON;

  const bestCurrent = validCurrent.reduce((best, s) => {
    const vol = (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0);
    const bestVol = (parseFloat(best?.weight) || 0) * (parseInt(best?.reps, 10) || 0);
    return vol >= bestVol ? s : best;
  }, validCurrent[0]);

  const currentVol =
    (parseFloat(bestCurrent?.weight) || 0) * (parseInt(bestCurrent?.reps, 10) || 0);
  const lastVol = last.weight * last.reps;
  const delta = currentVol - lastVol;

  const currentMaxWeight = Math.max(
    ...validCurrent.map((s) => parseFloat(s?.weight) || 0)
  );
  const weightPR = currentMaxWeight > last.weight;

  return {
    isPR: delta > 0 || weightPR,
    isRegression: delta < 0 && !weightPR,
    isEqual: delta === 0 && !weightPR,
    volumeDelta: Math.round(delta),
  };
}

export function getAllPRs(workouts = []) {
  const map = new Map();

  for (const workout of workouts) {
    const cats = workout?.exercises ?? workout?.categories ?? [];
    if (!Array.isArray(cats)) continue;

    for (const cat of cats) {
      const exercises = Array.isArray(cat?.exercises) ? cat.exercises : [];
      for (const ex of exercises) {
        if (!ex?.name?.trim()) continue;
        const key = normalizeExerciseName(ex.name);
        if (!key) continue;

        const sets = Array.isArray(ex.sets) ? ex.sets : [];

        for (const s of sets) {
          const weight = parseFloat(s?.weight) || 0;
          const reps = parseInt(s?.reps, 10) || 0;
          if (weight <= 0 && reps <= 0) continue;

          const volume = weight * reps;
          const current = map.get(key);

          const isBetter =
            !current ||
            weight > current.best_weight ||
            (weight === current.best_weight && volume > current.best_volume);

          const preferredName = choosePreferredExerciseName(
            current?.exercise_name,
            ex.name
          );

          if (isBetter) {
            map.set(key, {
              exercise_name: preferredName,
              exercise_key: key,
              best_weight: weight,
              best_reps: reps,
              best_volume: volume,
              achieved_at: workout?.date ?? null,
              workout_timestamp: workout?.timestamp ?? null,
            });
          } else if (current && preferredName !== current.exercise_name) {
            current.exercise_name = preferredName;
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.best_volume - a.best_volume);
}
