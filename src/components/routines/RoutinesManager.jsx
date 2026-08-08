import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Dumbbell,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useRoutineContext } from "../../contexts/RoutineContext";
import { useWorkoutContext } from "../../contexts/WorkoutContext";
import { buildExerciseProgress } from "../../utils/exerciseProgress";
import { normalizeExerciseName } from "../../utils/exerciseNames";
import { countRoutineExercises, countRoutineSets } from "../../utils/routines";

const TYPES = ["push", "pull", "legs"];

const cloneRoutine = (routine) => ({
  ...routine,
  categories: (routine?.categories || []).map((category) => ({
    ...category,
    exercises: (category.exercises || []).map((exercise) => ({ ...exercise })),
  })),
});

const moveItem = (items, from, to) => {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const formatTarget = (target) => {
  if (!target) return "Sin meta aún";
  const weight = Number(target.weight) || 0;
  const reps = Number(target.reps) || 0;
  if (weight > 0 && reps > 0) return `${weight.toLocaleString("es-CL")} kg × ${reps}`;
  if (weight > 0) return `${weight.toLocaleString("es-CL")} kg`;
  return reps > 0 ? `${reps} reps` : "Sin meta aún";
};

export default function RoutinesManager({ initialType = "push", onBack, onStartRoutine }) {
  const { routines, syncing, syncError, saveRoutine, resetRoutine, getRoutine } = useRoutineContext();
  const { workouts } = useWorkoutContext();
  const safeInitialType = TYPES.includes(initialType) ? initialType : "push";
  const [activeType, setActiveType] = useState(safeInitialType);
  const [draft, setDraft] = useState(() => cloneRoutine(getRoutine(safeInitialType)));
  const [saving, setSaving] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  useEffect(() => {
    if (TYPES.includes(initialType)) setActiveType(initialType);
  }, [initialType]);

  useEffect(() => {
    setDraft(cloneRoutine(getRoutine(activeType)));
  }, [activeType, getRoutine, routines]);

  const progressMap = useMemo(() => {
    const map = new Map();
    buildExerciseProgress(workouts).forEach((exercise) => map.set(exercise.key, exercise));
    return map;
  }, [workouts]);

  const setCategory = (categoryIndex, updater) => {
    setDraft((current) => ({
      ...current,
      categories: current.categories.map((category, index) =>
        index === categoryIndex ? updater(category) : category
      ),
    }));
  };

  const updateExercise = (categoryIndex, exerciseIndex, patch) => {
    setCategory(categoryIndex, (category) => ({
      ...category,
      exercises: category.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise
      ),
    }));
  };

  const addExercise = (categoryIndex) => {
    setCategory(categoryIndex, (category) => ({
      ...category,
      exercises: [...category.exercises, { name: "", sets: 3 }],
    }));
  };

  const removeExercise = (categoryIndex, exerciseIndex) => {
    setCategory(categoryIndex, (category) => ({
      ...category,
      exercises: category.exercises.filter((_, index) => index !== exerciseIndex),
    }));
  };

  const moveExercise = (categoryIndex, exerciseIndex, direction) => {
    setCategory(categoryIndex, (category) => ({
      ...category,
      exercises: moveItem(category.exercises, exerciseIndex, exerciseIndex + direction),
    }));
  };

  const addCategory = () => {
    setDraft((current) => ({
      ...current,
      categories: [...current.categories, { name: "Nuevo grupo", exercises: [] }],
    }));
  };

  const removeCategory = (categoryIndex) => {
    setDraft((current) => ({
      ...current,
      categories: current.categories.filter((_, index) => index !== categoryIndex),
    }));
  };

  const handleSave = async () => {
    const cleaned = {
      ...draft,
      name: draft.name.trim() || activeType[0].toUpperCase() + activeType.slice(1),
      categories: draft.categories
        .map((category) => ({
          ...category,
          name: category.name.trim() || "Grupo muscular",
          exercises: category.exercises
            .filter((exercise) => exercise.name.trim())
            .map((exercise) => ({
              name: exercise.name.trim(),
              sets: Math.min(8, Math.max(1, Number(exercise.sets) || 1)),
            })),
        }))
        .filter((category) => category.exercises.length > 0),
    };

    if (!cleaned.categories.length) {
      toast.error("Agrega al menos un ejercicio antes de guardar");
      return;
    }

    setSaving(true);
    const result = await saveRoutine(cleaned);
    setSaving(false);
    setDraft(cloneRoutine(cleaned));

    if (result.error) {
      toast.warning("Rutina guardada en este dispositivo", {
        description: "Se sincronizará automáticamente cuando Supabase esté disponible.",
      });
    } else {
      toast.success(`${cleaned.name} guardada y sincronizada`);
    }
  };

  const handleReset = async () => {
    const result = await resetRoutine(activeType);
    setResetPending(false);
    if (result.error) toast.warning("Rutina restaurada localmente");
    else toast.success("Rutina restaurada a la base de Treino");
  };

  const exerciseCount = countRoutineExercises(draft);
  const setCount = countRoutineSets(draft);

  return (
    <div className="page-shell routines-page">
      <header className="routines-heading">
        <button type="button" className="history-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <div>
          <span className="page-eyebrow">Tu sistema de entrenamiento</span>
          <h1>Mis rutinas</h1>
          <p>Define los ejercicios que quieres repetir y deja que Treino se encargue de mostrarte PRs, referencias y próximas metas.</p>
        </div>
      </header>

      <section className="routines-progress-callout">
        <Sparkles size={21} />
        <div>
          <strong>Diseñadas para progresar</strong>
          <span>Los cambios aquí solo afectan tus próximas sesiones. Tu historial anterior permanece intacto.</span>
        </div>
        <small>{syncing ? "Sincronizando…" : syncError ? "Modo offline" : "Sincronizado"}</small>
      </section>

      <div className="routines-tabs" role="tablist" aria-label="Rutinas">
        {TYPES.map((type) => {
          const routine = getRoutine(type);
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={activeType === type}
              className={activeType === type ? "is-active" : ""}
              onClick={() => setActiveType(type)}
            >
              <span>{routine?.emoji || "💪"}</span>
              <strong>{routine?.name || type}</strong>
              <small>{countRoutineExercises(routine)} ejercicios</small>
            </button>
          );
        })}
      </div>

      <section className={`routine-editor routine-editor--${activeType}`}>
        <div className="routine-editor__hero">
          <div>
            <span className="card-kicker">Rutina por defecto</span>
            <input
              className="routine-name-input"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              aria-label="Nombre de la rutina"
            />
            <p>{exerciseCount} ejercicios · {setCount} series programadas</p>
          </div>
          <button type="button" className="primary-action-button" onClick={() => onStartRoutine?.(draft)}>
            <Play size={17} fill="currentColor" />
            Entrenar ahora
          </button>
        </div>

        <div className="routine-category-list">
          {draft.categories.map((category, categoryIndex) => (
            <section key={`routine-category-${categoryIndex}`} className="routine-category-card">
              <header className="routine-category-card__header">
                <input
                  value={category.name}
                  onChange={(event) => setCategory(categoryIndex, (current) => ({ ...current, name: event.target.value }))}
                  aria-label={`Nombre del grupo ${categoryIndex + 1}`}
                />
                <button type="button" onClick={() => removeCategory(categoryIndex)} aria-label="Eliminar grupo">
                  <Trash2 size={16} />
                </button>
              </header>

              <div className="routine-exercise-list">
                {category.exercises.map((exercise, exerciseIndex) => {
                  const progress = progressMap.get(normalizeExerciseName(exercise.name));
                  return (
                    <article key={`routine-exercise-${categoryIndex}-${exerciseIndex}`} className="routine-exercise-row">
                      <div className="routine-exercise-row__order">
                        <button type="button" disabled={exerciseIndex === 0} onClick={() => moveExercise(categoryIndex, exerciseIndex, -1)} aria-label="Subir ejercicio">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" disabled={exerciseIndex === category.exercises.length - 1} onClick={() => moveExercise(categoryIndex, exerciseIndex, 1)} aria-label="Bajar ejercicio">
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      <div className="routine-exercise-row__main">
                        <input
                          value={exercise.name}
                          onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { name: event.target.value })}
                          placeholder="Nombre del ejercicio"
                          aria-label={`Ejercicio ${exerciseIndex + 1}`}
                        />
                        <div className="routine-exercise-row__progress">
                          {progress ? (
                            <>
                              <span><Trophy size={13} /> PR {progress.bestWeight || 0} kg</span>
                              <span>Meta {formatTarget(progress.nextTarget)}</span>
                            </>
                          ) : (
                            <span><Dumbbell size={13} /> Sin historial todavía</span>
                          )}
                        </div>
                      </div>

                      <label className="routine-sets-control">
                        <span>Series</span>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          inputMode="numeric"
                          value={exercise.sets}
                          onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { sets: event.target.value })}
                        />
                      </label>

                      <button type="button" className="routine-row-delete" onClick={() => removeExercise(categoryIndex, exerciseIndex)} aria-label="Eliminar ejercicio">
                        <Trash2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>

              <button type="button" className="routine-add-exercise" onClick={() => addExercise(categoryIndex)}>
                <Plus size={16} />
                Añadir ejercicio a {category.name || "este grupo"}
              </button>
            </section>
          ))}
        </div>

        <button type="button" className="routine-add-category" onClick={addCategory}>
          <Plus size={16} /> Añadir grupo muscular
        </button>

        <div className="routine-editor__footer">
          <button type="button" className="routine-reset-button" onClick={() => setResetPending(true)}>
            <RotateCcw size={16} /> Restaurar base
          </button>
          <button type="button" className="primary-action-button" onClick={handleSave} disabled={saving}>
            <Save size={17} />
            {saving ? "Guardando…" : "Guardar rutina"}
          </button>
        </div>
      </section>

      {resetPending && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setResetPending(false)}>
          <div className="confirmation-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="confirmation-dialog__icon"><RotateCcw size={21} /></div>
            <h2>¿Restaurar {draft.name}?</h2>
            <p>Solo cambiará tu rutina por defecto. Tus entrenamientos y marcas anteriores no se eliminarán.</p>
            <div className="confirmation-dialog__actions">
              <button type="button" className="dialog-button" onClick={() => setResetPending(false)}>Cancelar</button>
              <button type="button" className="dialog-button dialog-button--danger" onClick={handleReset}>Restaurar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
