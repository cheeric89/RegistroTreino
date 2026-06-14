// src/components/workoutform.jsx
import React, { useState } from "react";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Check } from "lucide-react";
import { saveWorkout } from "../utils/storage";

// Genera una serie vacía con ID único
const newSet = () => ({
  id: Date.now() + Math.random(),
  weight: "",
  reps: "",
  done: false,
});

// Inicializa una categoría con sus ejercicios (de plantilla o vacíos)
const initCategory = (name, presetExercises = null) => ({
  name,
  expanded: true,
  exercises: presetExercises
    ? presetExercises.map((ex) => ({
        name: ex.name || "",
        sets: ex.sets && ex.sets.length > 0 ? ex.sets.map(() => newSet()) : [newSet()],
      }))
    : [{ name: "Ejercicio 1", sets: [newSet()] }],
});

export default function WorkoutForm({ day, categories, templateCategories, onSave, onBack }) {
  const [saving, setSaving] = useState(false);

  // Estado inicial: plantilla > categorías manuales > vacío
  const [catData, setCatData] = useState(() => {
    if (templateCategories && templateCategories.length > 0) {
      return templateCategories.map((tc) => initCategory(tc.name, tc.exercises));
    }
    if (categories && categories.length > 0) {
      return categories.map((name) => initCategory(name));
    }
    return [];
  });

  // ── Handlers ───────────────────────────────────────────
  const toggleExpand = (ci) =>
    setCatData(catData.map((c, i) => (i === ci ? { ...c, expanded: !c.expanded } : c)));

  const addExercise = (ci) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? { ...c, exercises: [...c.exercises, { name: `Ejercicio ${c.exercises.length + 1}`, sets: [newSet()] }] }
          : c
      )
    );

  const removeExercise = (ci, ei) =>
    setCatData(
      catData.map((c, i) =>
        i === ci ? { ...c, exercises: c.exercises.filter((_, j) => j !== ei) } : c
      )
    );

  const setExName = (ci, ei, val) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, name: val } : ex)) }
          : c
      )
    );

  const addSet = (ci, ei) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? {
              ...c,
              exercises: c.exercises.map((ex, j) =>
                j === ei ? { ...ex, sets: [...ex.sets, newSet()] } : ex
              ),
            }
          : c
      )
    );

  const removeSet = (ci, ei, si) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? {
              ...c,
              exercises: c.exercises.map((ex, j) =>
                j === ei ? { ...ex, sets: ex.sets.filter((_, k) => k !== si) } : ex
              ),
            }
          : c
      )
    );

  const updateSet = (ci, ei, si, field, val) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? {
              ...c,
              exercises: c.exercises.map((ex, j) =>
                j === ei
                  ? { ...ex, sets: ex.sets.map((s, k) => (k === si ? { ...s, [field]: val } : s)) }
                  : ex
              ),
            }
          : c
      )
    );

  const toggleDone = (ci, ei, si) =>
    setCatData(
      catData.map((c, i) =>
        i === ci
          ? {
              ...c,
              exercises: c.exercises.map((ex, j) =>
                j === ei
                  ? { ...ex, sets: ex.sets.map((s, k) => (k === si ? { ...s, done: !s.done } : s)) }
                  : ex
              ),
            }
          : c
      )
    );

  // ── Guardar ────────────────────────────────────────────
  // CRÍTICO: el objeto guardado usa la clave "exercises" para que WorkoutSummary pueda leerlo
  const handleSave = (e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);

    const workout = {
      day: day || "Entrenamiento",
      date: new Date().toLocaleDateString("es-CL"),
      timestamp: Date.now(),
      // WorkoutSummary espera workout.exercises (array de categorías)
      exercises: catData,
      // También guardamos categories (array de strings) para el dashboard
      categories: catData.map((c) => c.name),
    };

    saveWorkout(workout);

    setTimeout(() => {
      setSaving(false);
      onSave(workout);
    }, 300);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="screen">
      {/* Topbar */}
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">{day || "Entrenamiento"}</span>
          <h2>Registrar Series</h2>
        </div>
        <button
          type="button"
          className={`wf-save-btn ${saving ? "wf-save-btn--done" : ""}`}
          onClick={handleSave}
          aria-label="Guardar entrenamiento"
        >
          <CheckCircle2 size={22} />
        </button>
      </div>

      {/* Cuerpo scrollable */}
      <div className="form-scroll" style={{ paddingTop: 12 }}>
        {catData.map((cat, ci) => (
          <div key={ci} className="wf-cat-block">
            {/* Cabecera de categoría */}
            <button
              type="button"
              className="wf-cat-header"
              onClick={() => toggleExpand(ci)}
            >
              <span className="cat-dot" style={{ marginRight: 4 }} />
              <span className="wf-cat-title">{cat.name}</span>
              <span className="wf-cat-count">
                {cat.exercises.length} ejercicio{cat.exercises.length !== 1 ? "s" : ""}
              </span>
              <span className="wf-chevron">{cat.expanded ? "▾" : "▸"}</span>
            </button>

            {/* Ejercicios de la categoría */}
            {cat.expanded && (
              <div className="wf-exercises">
                {cat.exercises.map((ex, ei) => (
                  <div key={ei} className="wf-ex-card">
                    {/* Nombre del ejercicio */}
                    <div className="wf-ex-name-row">
                      <input
                        type="text"
                        className="wf-ex-name-input"
                        value={ex.name}
                        onChange={(e) => setExName(ci, ei, e.target.value)}
                        placeholder="Nombre del ejercicio"
                      />
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => removeExercise(ci, ei)}
                        disabled={cat.exercises.length === 1}
                        aria-label="Eliminar ejercicio"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Cabecera de columnas */}
                    <div className="wf-sets-header">
                      <span className="wf-col-num">#</span>
                      <span className="wf-col-label">Peso (kg)</span>
                      <span className="wf-col-label">Reps</span>
                      <span className="wf-col-label" style={{ textAlign: "center" }}>✓</span>
                    </div>

                    {/* Filas de series */}
                    {ex.sets.map((set, si) => (
                      <div
                        key={set.id}
                        className={`wf-set-row ${set.done ? "wf-set-row--done" : ""}`}
                      >
                        <span className="wf-set-num">{si + 1}</span>
                        <input
                          type="number"
                          className="wf-set-input"
                          placeholder="0"
                          value={set.weight}
                          inputMode="decimal"
                          onChange={(e) => updateSet(ci, ei, si, "weight", e.target.value)}
                        />
                        <input
                          type="number"
                          className="wf-set-input"
                          placeholder="0"
                          value={set.reps}
                          inputMode="numeric"
                          onChange={(e) => updateSet(ci, ei, si, "reps", e.target.value)}
                        />
                        <button
                          type="button"
                          className={`wf-done-btn ${set.done ? "wf-done-btn--active" : ""}`}
                          onClick={() => toggleDone(ci, ei, si)}
                          aria-label={set.done ? "Desmarcar" : "Marcar como hecha"}
                        >
                          <Check size={13} strokeWidth={3} />
                        </button>
                      </div>
                    ))}

                    {/* Añadir serie */}
                    <button
                      type="button"
                      className="wf-add-set-btn"
                      onClick={() => addSet(ci, ei)}
                    >
                      <Plus size={13} />
                      Añadir serie
                    </button>
                  </div>
                ))}

                {/* Añadir ejercicio */}
                <button
                  type="button"
                  className="wf-add-ex-btn"
                  onClick={() => addExercise(ci)}
                >
                  <Plus size={15} />
                  Añadir ejercicio a {cat.name}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer con botón principal */}
      <div className="sticky-footer">
        <button
          type="button"
          className={`cta-button ${saving ? "cta-button--saving" : ""}`}
          onClick={handleSave}
        >
          {saving ? (
            <>
              <Check size={18} strokeWidth={3} />
              Guardando…
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Guardar entrenamiento
            </>
          )}
        </button>
      </div>
    </div>
  );
}