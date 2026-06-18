// utils/storage.js — Capa de persistencia con localStorage
// Para extender:
//   - Reemplazar las funciones aquí por llamadas a una API REST
//     sin tocar ningún componente (solo cambiar este archivo).
//   - Agregar compresión LZ-string para reducir el tamaño guardado.
//   - Exportar / importar datos como JSON para backup del usuario.

const STORAGE_KEY = "treino_workouts";

/** Leer todos los workouts del almacenamiento */
export function getAllWorkouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Guardar un nuevo workout (prepend para tener el más reciente primero) */
/** Guardar un nuevo workout */
export function saveWorkout(workout) {
  try {
    const all = getAllWorkouts();
    // AQUÍ ESTÁ EL CAMBIO: Añadimos el timestamp si no lo tiene
    const workoutToSave = { 
      ...workout, 
      timestamp: workout.timestamp || Date.now() 
    };
    
    const updated = [workoutToSave, ...all];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

/** Obtener los N workouts más recientes para el dashboard */
export function getRecentWorkouts(n = 5) {
  return getAllWorkouts().slice(0, n);
}

/** Eliminar un workout por timestamp (para historial futuro) */
export function deleteWorkout(timestamp) {
  try {
    const filtered = getAllWorkouts().filter((w) => w.timestamp !== timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

// ── Persistencia de BORRADOR (entrenamiento en progreso) ───────────
// A diferencia de getAllWorkouts/saveWorkout (que guardan sesiones YA
// finalizadas), esto guarda el estado EN VIVO del formulario para que
// no se pierda si el navegador se cierra o recarga sin querer.
const DRAFT_KEY = "treino_workout_draft";

/** Guarda (sobrescribe) el borrador actual del formulario */
export function saveDraftWorkout(draft) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
    return true;
  } catch {
    return false; // localStorage lleno, modo incógnito, etc.
  }
}

/** Recupera el borrador guardado, o null si no existe / está corrupto */
export function getDraftWorkout() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // JSON corrupto: lo eliminamos para que no vuelva a fallar siempre
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

/** Elimina el borrador (tras guardar con éxito o al descartarlo) */
export function clearDraftWorkout() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

// ── Persistencia LOCAL del perfil (fallback sin conexión) ──────────
// Cuando hay sesión activa, useProfile.js prioriza la tabla `user_stats`
// de Supabase. Esto solo se usa si esa consulta falla (sin red, RLS mal
// configurado, etc.) o todavía no hay usuario — mismo patrón de
// fallback que ya usa useWorkouts.js para los entrenamientos.

const PROFILE_KEY = "treino_user_profile";

/** Lee el perfil cacheado localmente, o null si no existe */
export function getLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Sobrescribe el perfil cacheado localmente */
export function saveLocalProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
    return true;
  } catch {
    return false;
  }
}