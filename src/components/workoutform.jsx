// WorkoutForm.jsx — Formulario dinámico de registro de entrenamiento
// Para extender:
//   - Agregar un temporizador de descanso entre series
//   - Cargar el último peso usado en ese ejercicio desde historial
//   - Permitir elegir ejercicios específicos por categoría desde una biblioteca

import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Flame, Save, ChevronDown, ChevronUp } from "lucide-react";
import { saveWorkout } from "../utils/storage";

// Crea una serie vacía
const newSet = () => ({ reps: "", weight: "" });

// Crea la estructura inicial para una categoría
const initCategory = (name) => ({
  name,
  expanded: true,
  // Para extender: cambiar "Ejercicio" por nombres reales desde una biblioteca
  exercises: [
    {
      name: "Ejercicio 1",
      sets: [newSet()],
    },
  ],
});

export default function WorkoutForm({ day, categories, onSave, onBack }) {
  const [warmup, setWarmup] = useState({ weight: "", reps: "" });
  const [catData, setCatData] = useState(categories.map(initCategory));
  const [saving, setSaving] = useState(false);

  // ── Warmup ───────────────────────────────────────────────
  const updateWarmup = (field, val) =>
    setWarmup((prev) => ({ ...prev, [field]: val }));

  // ── Ejercicios ───────────────────────────────────────────
  const toggleCat = (ci) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  };

  const addExercise = (ci) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              exercises: [
                ...cat.exercises,
                {
                  name: `Ejercicio ${cat.exercises.length + 1}`,
                  sets: [newSet()],
                },
              ],
            }
          : cat
      )
    );
  };

  const removeExercise = (ci, ei) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? { ...cat, exercises: cat.exercises.filter((_, j) => j !== ei) }
          : cat
      )
    );
  };

  const updateExerciseName = (ci, ei, val) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === ei ? { ...ex, name: val } : ex
              ),
            }
          : cat
      )
    );
  };

  const addSet = (ci, ei) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === ei ? { ...ex, sets: [...ex.sets, newSet()] } : ex
              ),
            }
          : cat
      )
    );
  };

  const removeSet = (ci, ei, si) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === ei
                  ? { ...ex, sets: ex.sets.filter((_, k) => k !== si) }
                  : ex
              ),
            }
          : cat
      )
    );
  };

  const updateSet = (ci, ei, si, field, val) => {
    setCatData((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === ei
                  ? {
                      ...ex,
                      sets: ex.sets.map((s, k) =>
                        k === si ? { ...s, [field]: val } : s
                      ),
                    }
                  : ex
              ),
            }
          : cat
      )
    );
  };

  // ── Guardar ──────────────────────────────────────────────
  const handleSave = () => {
    setSaving(true);
    const workout = {
      day,
      categories,
      date: new Date().toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      timestamp: Date.now(),
      warmup,
      exercises: catData,
    };
    saveWorkout(workout);
    // Pequeño delay para feedback visual
    setTimeout(() => {
      onSave(workout);
    }, 400);
  };

  return (
    <div className="screen">
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Paso 3 de 3 · {day}</span>
          <h2>Registra tus series</h2>
        </div>
      </div>

      <div className="form-scroll">
        {/* ── Bloque Calentamiento ── */}
        <div className="section-block warmup-block">
          <div className="section-header">
            <Flame size={16} className="section-icon section-icon--warmup" />
            <span>Calentamiento</span>
          </div>
          <div className="warmup-fields">
            <div className="field-group">
              <label className="field-label">Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                className="field-input"
                value={warmup.weight}
                onChange={(e) => updateWarmup("weight", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Repeticiones</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="field-input"
                value={warmup.reps}
                onChange={(e) => updateWarmup("reps", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Bloques por categoría ── */}
        {catData.map((cat, ci) => (
          <div key={cat.name} className="section-block">
            {/* Header colapsable */}
            <button
              className="section-header section-header--clickable"
              onClick={() => toggleCat(ci)}
            >
              <span className="cat-dot" />
              <span className="section-title">{cat.name}</span>
              <span className="section-count">
                {cat.exercises.length} ejercicio{cat.exercises.length !== 1 ? "s" : ""}
              </span>
              {cat.expanded ? (
                <ChevronUp size={16} className="collapse-icon" />
              ) : (
                <ChevronDown size={16} className="collapse-icon" />
              )}
            </button>

            {cat.expanded && (
              <div className="exercises-list">
                {cat.exercises.map((ex, ei) => (
                  <div key={ei} className="exercise-card">
                    {/* Nombre del ejercicio editable */}
                    <div className="exercise-name-row">
                      <input
                        type="text"
                        className="exercise-name-input"
                        value={ex.name}
                        onChange={(e) =>
                          updateExerciseName(ci, ei, e.target.value)
                        }
                        placeholder="Nombre del ejercicio"
                      />
                      {cat.exercises.length > 1 && (
                        <button
                          className="icon-btn icon-btn--danger"
                          onClick={() => removeExercise(ci, ei)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Cabecera de columnas */}
                    <div className="sets-header">
                      <span className="col-serie">Serie</span>
                      <span className="col-reps">Reps</span>
                      <span className="col-weight">Peso (kg)</span>
                      <span className="col-del" />
                    </div>

                    {/* Filas de series */}
                    {ex.sets.map((s, si) => (
                      <div key={si} className="set-row">
                        <span className="set-num">{si + 1}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="—"
                          className="set-input"
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(ci, ei, si, "reps", e.target.value)
                          }
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="—"
                          className="set-input"
                          value={s.weight}
                          onChange={(e) =>
                            updateSet(ci, ei, si, "weight", e.target.value)
                          }
                        />
                        <button
                          className="icon-btn"
                          onClick={() => removeSet(ci, ei, si)}
                          disabled={ex.sets.length === 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Agregar serie */}
                    <button
                      className="add-set-btn"
                      onClick={() => addSet(ci, ei)}
                    >
                      <Plus size={13} />
                      Agregar serie
                    </button>
                  </div>
                ))}

                {/* Agregar ejercicio */}
                <button
                  className="add-exercise-btn"
                  onClick={() => addExercise(ci)}
                >
                  <Plus size={14} />
                  Agregar ejercicio a {cat.name}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Espacio para el footer sticky */}
        <div style={{ height: "90px" }} />
      </div>

      {/* Guardar */}
      <div className="sticky-footer">
        <button
          className={`cta-button ${saving ? "cta-button--saving" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={18} />
          {saving ? "Guardando..." : "Guardar Sesión"}
        </button>
      </div>
    </div>
  );
}