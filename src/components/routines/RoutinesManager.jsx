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
  Star,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRoutineContext } from "../../contexts/RoutineContext";
import { useWorkoutContext } from "../../contexts/WorkoutContext";
import { getDefaultRoutine } from "../../data/defaultRoutines";
import { ROUTINE_PRESETS, createRoutineFromPreset } from "../../data/routinePresets";
import { buildExerciseProgress } from "../../utils/exerciseProgress";
import { normalizeExerciseName } from "../../utils/exerciseNames";
import {
  normalizeExercisePrescription,
  normalizeRepRange,
} from "../../utils/repRangeProgression";
import { getSmartProgressionPlan } from "../../utils/smartProgression";
import {
  countRoutineExercises,
  countRoutineSets,
  isRoutineDeload,
  setRoutineDeload,
} from "../../utils/routines";

const CORE_TYPES = ["push", "pull", "legs"];
const isCoreType = (type) => CORE_TYPES.includes(type);

const cloneRoutine = (routine) => ({
  ...(routine || {}),
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

const formatRest = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remaining = value % 60;
  return minutes ? `${minutes}:${String(remaining).padStart(2, "0")}` : `${remaining}s`;
};

const sanitizeRoutine = (draft, activeType) => ({
  ...draft,
  type: draft.type || activeType,
  name: draft.name?.trim() || "Rutina",
  description: draft.description?.trim() || "Rutina personalizada",
  categories: (draft.categories || [])
    .map((category) => ({
      ...category,
      name: category.name?.trim() || "Grupo muscular",
      exercises: (category.exercises || [])
        .filter((exercise) => exercise.name?.trim())
        .map((exercise) => ({
          ...exercise,
          ...normalizeExercisePrescription(exercise),
          name: exercise.name.trim(),
        })),
    }))
    .filter((category) => category.exercises.length > 0),
});

export default function RoutinesManager({ initialType = "push", onBack, onStartRoutine }) {
  const {
    routines,
    syncing,
    syncError,
    saveRoutine,
    deleteRoutine,
    resetRoutine,
    getRoutine,
  } = useRoutineContext();
  const { workouts } = useWorkoutContext();

  const initialRoutine = getRoutine(initialType) || routines[0] || getDefaultRoutine("push");
  const [activeType, setActiveType] = useState(initialRoutine?.type || "push");
  const [draft, setDraft] = useState(() => cloneRoutine(initialRoutine));
  const [saving, setSaving] = useState(false);
  const [deloadSaving, setDeloadSaving] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  useEffect(() => {
    const next = getRoutine(initialType);
    if (next) setActiveType(next.type);
  }, [getRoutine, initialType]);

  useEffect(() => {
    const next = getRoutine(activeType) || routines[0] || getDefaultRoutine("push");
    if (!next) return;
    if (next.type !== activeType) setActiveType(next.type);
    setDraft(cloneRoutine(next));
  }, [activeType, getRoutine, routines]);

  const progressMap = useMemo(() => {
    const map = new Map();
    buildExerciseProgress(workouts).forEach((exercise) => map.set(exercise.key, exercise));
    return map;
  }, [workouts]);

  const deloadActive = useMemo(
    () => routines.length > 0 && routines.every((routine) => isRoutineDeload(routine)),
    [routines]
  );

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
      exercises: [
        ...category.exercises,
        {
          name: "",
          sets: 3,
          repMin: 8,
          repMax: 12,
          restSeconds: 120,
          warmupSets: 1,
          autoRest: true,
          favorite: false,
          deload: deloadActive,
        },
      ],
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

  const getCleanedRoutine = () => {
    const cleaned = sanitizeRoutine(draft, activeType);
    if (!cleaned.categories.length) {
      toast.error("Agrega al menos un ejercicio antes de continuar");
      return null;
    }
    return cleaned;
  };

  const handleSave = async () => {
    const cleaned = getCleanedRoutine();
    if (!cleaned) return;

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

  const handleStartRoutine = () => {
    const cleaned = getCleanedRoutine();
    if (!cleaned) return;
    setDraft(cloneRoutine(cleaned));
    void saveRoutine(cleaned);
    onStartRoutine?.(cleaned);
  };

  const handleCreatePreset = async (preset) => {
    const routine = createRoutineFromPreset(preset, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const result = await saveRoutine(routine);
    setShowPresetPicker(false);
    setActiveType(routine.type);
    setDraft(cloneRoutine(routine));
    if (result.error) toast.warning("Rutina creada localmente; se sincronizará después");
    else toast.success(`${routine.name} creada`);
  };

  const handleDeleteRoutine = async () => {
    if (isCoreType(activeType)) return;
    const deletedName = draft.name || "Rutina";
    const result = await deleteRoutine(activeType);
    setDeletePending(false);
    setActiveType(routines.find((item) => item.type !== activeType)?.type || "push");
    if (result.error) toast.warning(`${deletedName} eliminada localmente`);
    else toast.success(`${deletedName} eliminada`);
  };

  const handleToggleDeload = async () => {
    const nextActive = !deloadActive;
    setDeloadSaving(true);
    const sourceRoutines = routines.length ? routines : CORE_TYPES.map((type) => getRoutine(type)).filter(Boolean);
    const results = await Promise.all(
      sourceRoutines.map((routine) => saveRoutine(setRoutineDeload(routine, nextActive)))
    );
    setDeloadSaving(false);
    setDraft((current) => setRoutineDeload(current, nextActive));

    if (results.some((result) => result.error)) {
      toast.warning(nextActive ? "Descarga activada localmente" : "Descarga finalizada localmente");
    } else {
      toast.success(nextActive ? "Semana de descarga activada" : "Semana de descarga finalizada", {
        description: nextActive
          ? "Treino reducirá una serie y sugerirá aproximadamente el 90% de tu carga habitual."
          : "Tus rutinas vuelven a su volumen y progresión normales.",
      });
    }
  };

  const handleReset = async () => {
    const result = await resetRoutine(activeType);
    setResetPending(false);
    if (result.error) toast.warning(result.error);
    else toast.success("Rutina restaurada a la base de Treino");
  };

  const exerciseCount = countRoutineExercises(draft);
  const setCount = countRoutineSets(draft);
  const customRoutine = !isCoreType(activeType);

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
          <p>Usa PPL, Upper/Lower, Full Body, Arnold o crea tu propia estructura. Cada ejercicio conserva su progresión, descanso y calentamiento.</p>
        </div>
      </header>

      <section className={`routines-progress-callout ${deloadActive ? "is-deload" : ""}`}>
        <Sparkles size={21} />
        <div>
          <strong>{deloadActive ? "Semana de descarga activa" : "Smart Progression"}</strong>
          <span>
            {deloadActive
              ? "Menos volumen y cargas sugeridas más conservadoras para recuperar margen sin perder tu estructura."
              : "Treino aprende de tus saltos de peso, detecta estancamientos y te propone una meta concreta para cada ejercicio."}
          </span>
        </div>
        <button
          type="button"
          className={`routine-deload-button ${deloadActive ? "is-active" : ""}`}
          onClick={handleToggleDeload}
          disabled={deloadSaving}
        >
          {deloadSaving ? "Guardando…" : deloadActive ? "Terminar descarga" : "Activar descarga"}
        </button>
        <small>{syncing ? "Sincronizando…" : syncError ? "Modo offline" : "Sincronizado"}</small>
      </section>

      <div className="routines-universal-toolbar">
        <div className="routines-tabs" role="tablist" aria-label="Rutinas">
          {(routines.length ? routines : CORE_TYPES.map((type) => getRoutine(type)).filter(Boolean)).map((routine) => (
            <button
              key={routine.type}
              type="button"
              role="tab"
              aria-selected={activeType === routine.type}
              className={activeType === routine.type ? "is-active" : ""}
              onClick={() => setActiveType(routine.type)}
            >
              <span>{routine.emoji || "💪"}</span>
              <strong>{routine.name || "Rutina"}</strong>
              <small>{countRoutineExercises(routine)} ejercicios</small>
            </button>
          ))}
        </div>
        <button type="button" className="routine-create-button" onClick={() => setShowPresetPicker(true)}>
          <Plus size={16} /> Nueva rutina
        </button>
      </div>

      <section className={`routine-editor routine-editor--${isCoreType(activeType) ? activeType : "custom"}`}>
        <div className="routine-editor__hero">
          <div>
            <span className="card-kicker">{customRoutine ? "Rutina personalizada" : "Rutina base"}</span>
            <input
              className="routine-name-input"
              value={draft.name || ""}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              aria-label="Nombre de la rutina"
            />
            <input
              className="routine-description-input"
              value={draft.description || ""}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              aria-label="Descripción de la rutina"
              placeholder="Ej: Torso completo · hipertrofia"
            />
            <p>{exerciseCount} ejercicios · {setCount} series efectivas programadas</p>
          </div>
          <button type="button" className="primary-action-button" onClick={handleStartRoutine}>
            <Play size={17} fill="currentColor" /> Entrenar ahora
          </button>
        </div>

        <div className="routine-category-list">
          {(draft.categories || []).map((category, categoryIndex) => (
            <section key={`routine-category-${categoryIndex}`} className="routine-category-card">
              <header className="routine-category-card__header">
                <input
                  value={category.name}
                  onChange={(event) => setCategory(categoryIndex, (current) => ({ ...current, name: event.target.value }))}
                  aria-label={`Nombre del grupo ${categoryIndex + 1}`}
                />
                <button type="button" onClick={() => removeCategory(categoryIndex)} aria-label="Eliminar grupo"><Trash2 size={16} /></button>
              </header>

              <div className="routine-exercise-list">
                {(category.exercises || []).map((exercise, exerciseIndex) => {
                  const progress = progressMap.get(normalizeExerciseName(exercise.name));
                  const prescription = normalizeExercisePrescription(exercise);
                  const repRange = normalizeRepRange(exercise);
                  const smartPlan = exercise.name?.trim() ? getSmartProgressionPlan(exercise.name, prescription) : null;

                  return (
                    <article key={`routine-exercise-${categoryIndex}-${exerciseIndex}`} className="routine-exercise-row">
                      <div className="routine-exercise-row__order">
                        <button type="button" disabled={exerciseIndex === 0} onClick={() => moveExercise(categoryIndex, exerciseIndex, -1)} aria-label="Subir ejercicio"><ArrowUp size={14} /></button>
                        <button type="button" disabled={exerciseIndex === category.exercises.length - 1} onClick={() => moveExercise(categoryIndex, exerciseIndex, 1)} aria-label="Bajar ejercicio"><ArrowDown size={14} /></button>
                      </div>

                      <div className="routine-exercise-row__main">
                        <div className="routine-exercise-name-line">
                          <input
                            value={exercise.name}
                            onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { name: event.target.value })}
                            placeholder="Nombre del ejercicio"
                            aria-label={`Ejercicio ${exerciseIndex + 1}`}
                          />
                          <button
                            type="button"
                            className={`routine-favorite-button ${exercise.favorite ? "is-favorite" : ""}`}
                            onClick={() => updateExercise(categoryIndex, exerciseIndex, { favorite: !exercise.favorite })}
                            aria-label={exercise.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                          >
                            <Star size={15} fill={exercise.favorite ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <div className="routine-exercise-row__progress">
                          <span className="routine-range-pill"><Target size={13} /> {repRange.repMin}–{repRange.repMax} reps</span>
                          <span>⏱ {formatRest(prescription.restSeconds)}</span>
                          {prescription.warmupSets > 0 && <span>🔥 {prescription.warmupSets} calent.</span>}
                          {exercise.favorite && <span className="routine-favorite-pill">★ Favorito</span>}
                          {progress ? (
                            <>
                              <span><Trophy size={13} /> PR {progress.bestWeight || 0} kg</span>
                              <span>Meta {formatTarget(progress.nextTarget)}</span>
                            </>
                          ) : (
                            <span><Dumbbell size={13} /> Sin historial todavía</span>
                          )}
                        </div>
                        {smartPlan && (
                          <div className={`routine-smart-plan routine-smart-plan--${smartPlan.state}`}>
                            <strong>{smartPlan.title}</strong>
                            <span>{smartPlan.message}</span>
                          </div>
                        )}
                      </div>

                      <div className="routine-prescription-controls">
                        <label className="routine-sets-control">
                          <span>Series</span>
                          <input type="number" min="1" max="8" inputMode="numeric" value={exercise.sets} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { sets: event.target.value })} />
                        </label>
                        <label className="routine-reps-control">
                          <span>Rango reps</span>
                          <div>
                            <input type="number" min="1" max="50" inputMode="numeric" value={exercise.repMin ?? 8} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { repMin: event.target.value })} />
                            <b>–</b>
                            <input type="number" min="1" max="60" inputMode="numeric" value={exercise.repMax ?? 12} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { repMax: event.target.value })} />
                          </div>
                        </label>
                        <label className="routine-rest-control">
                          <span>Descanso</span>
                          <select value={exercise.restSeconds ?? 120} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { restSeconds: Number(event.target.value) })}>
                            <option value="45">0:45</option><option value="60">1:00</option><option value="75">1:15</option><option value="90">1:30</option><option value="120">2:00</option><option value="150">2:30</option><option value="180">3:00</option><option value="210">3:30</option><option value="240">4:00</option>
                          </select>
                        </label>
                        <label className="routine-warmup-control">
                          <span>Calent.</span>
                          <input type="number" min="0" max="4" inputMode="numeric" value={exercise.warmupSets ?? 0} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { warmupSets: event.target.value })} />
                        </label>
                        <label className="routine-auto-rest-control">
                          <input type="checkbox" checked={exercise.autoRest !== false} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, { autoRest: event.target.checked })} />
                          <span>Descanso automático</span>
                        </label>
                      </div>

                      <button type="button" className="routine-row-delete" onClick={() => removeExercise(categoryIndex, exerciseIndex)} aria-label="Eliminar ejercicio"><Trash2 size={15} /></button>
                    </article>
                  );
                })}
              </div>

              <button type="button" className="routine-add-exercise" onClick={() => addExercise(categoryIndex)}><Plus size={16} /> Añadir ejercicio a {category.name || "este grupo"}</button>
            </section>
          ))}
        </div>

        <button type="button" className="routine-add-category" onClick={addCategory}><Plus size={16} /> Añadir grupo muscular</button>

        <div className="routine-editor__footer">
          <div className="routine-editor__footer-secondary">
            {isCoreType(activeType) ? (
              <button type="button" className="routine-reset-button" onClick={() => setResetPending(true)}><RotateCcw size={16} /> Restaurar base</button>
            ) : (
              <button type="button" className="routine-delete-button" onClick={() => setDeletePending(true)}><Trash2 size={16} /> Eliminar rutina</button>
            )}
          </div>
          <button type="button" className="primary-action-button" onClick={handleSave} disabled={saving}><Save size={17} /> {saving ? "Guardando…" : "Guardar rutina"}</button>
        </div>
      </section>

      {showPresetPicker && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowPresetPicker(false)}>
          <div className="routine-preset-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span className="card-kicker">Nueva rutina</span><h2>Elige una base</h2><p>Después podrás cambiar absolutamente todo.</p></div>
              <button type="button" onClick={() => setShowPresetPicker(false)} aria-label="Cerrar"><X size={18} /></button>
            </header>
            <div className="routine-preset-grid">
              {ROUTINE_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => handleCreatePreset(preset)}>
                  <span>{preset.emoji}</span><strong>{preset.name}</strong><small>{preset.description}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {resetPending && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setResetPending(false)}>
          <div className="confirmation-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="confirmation-dialog__icon"><RotateCcw size={21} /></div>
            <h2>¿Restaurar {draft.name}?</h2>
            <p>Solo cambiará esta rutina. Tus entrenamientos y marcas anteriores no se eliminarán.</p>
            <div className="confirmation-dialog__actions"><button type="button" className="dialog-button" onClick={() => setResetPending(false)}>Cancelar</button><button type="button" className="dialog-button dialog-button--danger" onClick={handleReset}>Restaurar</button></div>
          </div>
        </div>
      )}

      {deletePending && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeletePending(false)}>
          <div className="confirmation-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="confirmation-dialog__icon"><Trash2 size={21} /></div>
            <h2>¿Eliminar {draft.name}?</h2>
            <p>La rutina desaparecerá de tus plantillas, pero tu historial de entrenamientos seguirá intacto.</p>
            <div className="confirmation-dialog__actions"><button type="button" className="dialog-button" onClick={() => setDeletePending(false)}>Cancelar</button><button type="button" className="dialog-button dialog-button--danger" onClick={handleDeleteRoutine}>Eliminar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
