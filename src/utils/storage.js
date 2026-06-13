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