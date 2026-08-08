import { useMemo, useState } from "react";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkoutContext } from "../contexts/WorkoutContext";

const normalizeWeightInput = (value = "") => {
  let normalized = String(value)
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  const firstDot = normalized.indexOf(".");
  if (firstDot >= 0) {
    normalized = normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, "");
  }
  return normalized;
};

const displayWeight = (value) => String(value ?? "").replace(".", ",");

const cloneWorkout = (workout) => ({
  ...workout,
  exercises: (workout?.exercises || []).map((category) => ({
    ...category,
    exercises: (category.exercises || []).map((exercise) => ({
      ...exercise,
      sets: (exercise.sets || []).map((set) => ({ ...set })),
    })),
  })),
});

const calculateVolume = (categories) =>
  categories.reduce(
    (total, category) =>
      total + category.exercises.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal + exercise.sets.reduce(
            (setTotal, set) => setTotal + (Number(set.weight) || 0) * (Number(set.reps) || 0),
            0
          ),
        0
      ),
    0
  );

export default function WorkoutEditor({ workout, onBack, onSaved }) {
  const { saveWorkout } = useWorkoutContext();
  const [draft, setDraft] = useState(() => cloneWorkout(workout));
  const [saving, setSaving] = useState(false);

  const volume = useMemo(() => calculateVolume(draft.exercises || []), [draft.exercises]);

  if (!workout) return null;

  const updateCategory = (categoryIndex, updater) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((category, index) =>
        index === categoryIndex ? updater(category) : category
      ),
    }));
  };

  const updateExercise = (categoryIndex, exerciseIndex, updater) => {
    updateCategory(categoryIndex, (category) => ({
      ...category,
      exercises: category.exercises.map((exercise, index) =>
        index === exerciseIndex ? updater(exercise) : exercise
      ),
    }));
  };

  const updateSet = (categoryIndex, exerciseIndex, setIndex, field, value) => {
    const nextValue = field === "weight" ? normalizeWeightInput(value) : String(value).replace(/[^0-9]/g, "");
    updateExercise(categoryIndex, exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...set, [field]: nextValue } : set
      ),
    }));
  };

  const addSet = (categoryIndex, exerciseIndex) => {
    updateExercise(categoryIndex, exerciseIndex, (exercise) => ({
      ...exercise,
      sets: [...exercise.sets, { weight: "", reps: "", done: true }],
    }));
  };

  const removeSet = (categoryIndex, exerciseIndex, setIndex) => {
    updateExercise(categoryIndex, exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((_, index) => index !== setIndex),
    }));
  };

  const addExercise = (categoryIndex) => {
    updateCategory(categoryIndex, (category) => ({
      ...category,
      exercises: [...category.exercises, { name: "", sets: [{ weight: "", reps: "", done: true }] }],
    }));
  };

  const removeExercise = (categoryIndex, exerciseIndex) => {
    updateCategory(categoryIndex, (category) => ({
      ...category,
      exercises: category.exercises.filter((_, index) => index !== exerciseIndex),
    }));
  };

  const addCategory = () => {
    setDraft((current) => ({
      ...current,
      exercises: [...current.exercises, { name: "Nuevo grupo", exercises: [] }],
    }));
  };

  const removeCategory = (categoryIndex) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== categoryIndex),
    }));
  };

  const handleSave = async () => {
    const cleanedExercises = (draft.exercises || [])
      .map((category) => ({
        ...category,
        name: category.name?.trim() || "Grupo muscular",
        exercises: (category.exercises || [])
          .filter((exercise) => exercise.name?.trim())
          .map((exercise) => ({
            ...exercise,
            name: exercise.name.trim(),
            sets: (exercise.sets || []).filter(
              (set) => String(set.weight ?? "").trim() || String(set.reps ?? "").trim()
            ),
          }))
          .filter((exercise) => exercise.sets.length > 0),
      }))
      .filter((category) => category.exercises.length > 0);

    if (!cleanedExercises.length) {
      toast.error("La sesión debe conservar al menos un ejercicio con datos");
      return;
    }

    const updated = {
      ...draft,
      day: draft.day?.trim() || "Entrenamiento",
      timestamp: Number(workout.timestamp),
      exercises: cleanedExercises,
      categories: cleanedExercises.map((category) => category.name),
      volume: calculateVolume(cleanedExercises),
    };

    setSaving(true);
    const result = await saveWorkout(updated);
    setSaving(false);

    if (result.error) {
      toast.warning("Cambios guardados en este dispositivo", {
        description: "La actualización remota se reintentará cuando vuelva la conexión.",
      });
    } else {
      toast.success("Sesión corregida y sincronizada");
    }
    onSaved?.(updated);
  };

  return (
    <div className="screen flow-screen workout-editor-screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="topbar-title">
          <span className="step-label">Editar sesión</span>
          <h2>Corrige tu entrenamiento</h2>
        </div>
        <button type="button" className="wf-save-btn" onClick={handleSave} disabled={saving} aria-label="Guardar cambios">
          <Save size={20} />
        </button>
      </div>

      <div className="form-scroll workout-editor-content">
        <section className="workout-editor-meta">
          <label>
            <span>Nombre de la sesión</span>
            <input value={draft.day || ""} onChange={(event) => setDraft((current) => ({ ...current, day: event.target.value }))} />
          </label>
          <div>
            <span>Fecha original</span>
            <strong>{draft.date || "Sin fecha"}</strong>
          </div>
          <div>
            <span>Volumen recalculado</span>
            <strong>{Math.round(volume).toLocaleString("es-CL")} kg</strong>
          </div>
        </section>

        <div className="workout-editor-categories">
          {(draft.exercises || []).map((category, categoryIndex) => (
            <section key={`${category.name}-${categoryIndex}`} className="workout-editor-category">
              <header>
                <input value={category.name || ""} onChange={(event) => updateCategory(categoryIndex, (current) => ({ ...current, name: event.target.value }))} />
                <button type="button" onClick={() => removeCategory(categoryIndex)} aria-label="Eliminar grupo"><Trash2 size={15} /></button>
              </header>

              <div className="workout-editor-exercises">
                {(category.exercises || []).map((exercise, exerciseIndex) => (
                  <article key={`${exercise.name}-${exerciseIndex}`} className="workout-editor-exercise">
                    <div className="workout-editor-exercise__heading">
                      <input value={exercise.name || ""} onChange={(event) => updateExercise(categoryIndex, exerciseIndex, (current) => ({ ...current, name: event.target.value }))} placeholder="Nombre del ejercicio" />
                      <button type="button" onClick={() => removeExercise(categoryIndex, exerciseIndex)} aria-label="Eliminar ejercicio"><Trash2 size={15} /></button>
                    </div>

                    <div className="workout-editor-sets">
                      {(exercise.sets || []).map((set, setIndex) => (
                        <div key={setIndex} className="workout-editor-set">
                          <span>{setIndex + 1}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayWeight(set.weight)}
                            onChange={(event) => updateSet(categoryIndex, exerciseIndex, setIndex, "weight", event.target.value)}
                            aria-label={`Peso serie ${setIndex + 1}`}
                          />
                          <small>kg</small>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={set.reps ?? ""}
                            onChange={(event) => updateSet(categoryIndex, exerciseIndex, setIndex, "reps", event.target.value)}
                            aria-label={`Repeticiones serie ${setIndex + 1}`}
                          />
                          <small>reps</small>
                          <button type="button" onClick={() => removeSet(categoryIndex, exerciseIndex, setIndex)} aria-label="Eliminar serie"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="workout-editor-add" onClick={() => addSet(categoryIndex, exerciseIndex)}><Plus size={14} /> Serie</button>
                  </article>
                ))}
              </div>

              <button type="button" className="workout-editor-add workout-editor-add--wide" onClick={() => addExercise(categoryIndex)}><Plus size={15} /> Añadir ejercicio</button>
            </section>
          ))}
        </div>

        <button type="button" className="workout-editor-add-category" onClick={addCategory}><Plus size={16} /> Añadir grupo muscular</button>

        <section className="workout-editor-note">
          <strong>Qué ocurre al guardar</strong>
          <p>Treino conserva la fecha original y recalcula volumen, récords, gráficos y próximas metas usando los datos corregidos.</p>
        </section>
      </div>

      <div className="sticky-footer">
        <button type="button" className="cta-button" onClick={handleSave} disabled={saving}>
          <Save size={17} /> {saving ? "Guardando…" : "Guardar correcciones"}
        </button>
      </div>
    </div>
  );
}
