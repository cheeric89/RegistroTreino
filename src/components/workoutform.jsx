// src/components/workoutform.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  saveWorkout,
  saveDraftWorkout,
  getDraftWorkout,
  clearDraftWorkout,
} from "../utils/storage";
import { getProgressionHint, getPRStatus } from "../utils/progressionEngine";
import ExerciseHint, { PRBadge } from "./ExerciseHint";

// ── Helpers puros ──────────────────────────────────────────
const newSet = () => ({
  id: Date.now() + Math.random(),
  weight: "",
  reps: "",
  done: false,
});

const initCategory = (name, presetExercises = null) => ({
  name,
  expanded: true,
  exercises: presetExercises
    ? presetExercises.map((ex) => ({
        name: ex.name || "",
        sets: ex.sets?.length > 0 ? ex.sets.map(() => newSet()) : [newSet()],
      }))
    : [{ name: "Ejercicio 1", sets: [newSet()] }],
});

// ── Componente ─────────────────────────────────────────────
export default function WorkoutForm({ day, categories, templateCategories, onSave, onBack }) {
  const [saving, setSaving] = useState(false);
  // Lista de { exerciseName, status } de los PRs detectados en el guardado
  const [prResults, setPrResults] = useState([]);

  // Misma lógica original, factorizada para poder reusarla si el
  // usuario decide descartar un borrador recuperado
  const buildFreshCatData = () => {
    if (templateCategories?.length > 0)
      return templateCategories.map((tc) => initCategory(tc.name, tc.exercises));
    if (categories?.length > 0)
      return categories.map((name) => initCategory(name));
    return [];
  };

  // Leemos el borrador UNA sola vez, en el primer render
  const [initialDraft] = useState(() => getDraftWorkout());

  const [catData, setCatData] = useState(() =>
    initialDraft?.catData?.length > 0 ? initialDraft.catData : buildFreshCatData()
  );

  // Aviso de recuperación: solo se dispara al montar el componente
  useEffect(() => {
    if (initialDraft?.catData?.length > 0) {
      toast.info("Recuperamos tu entrenamiento sin guardar", {
        description: initialDraft.day ? `Sesión: ${initialDraft.day}` : undefined,
        action: {
          label: "Descartar",
          onClick: () => {
            clearDraftWorkout();
            setCatData(buildFreshCatData());
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: persiste el borrador ante cada cambio del formulario
  useEffect(() => {
    if (!catData || catData.length === 0) return;
    saveDraftWorkout({ day, categories, templateCategories, catData });
  }, [catData, day, categories, templateCategories]);

  // Si el usuario sale a propósito (botón atrás), no es una pérdida
  // accidental — limpiamos el borrador para que no contamine la próxima sesión
  const handleBack = useCallback(() => {
    clearDraftWorkout();
    onBack?.();
  }, [onBack]);

  // ── Mutadores de estado ────────────────────────────────
  const toggleExpand = useCallback((ci) =>
    setCatData((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, expanded: !c.expanded } : c))
    ), []);

  const addExercise = useCallback((ci) =>
    setCatData((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, exercises: [...c.exercises, { name: "", sets: [newSet()] }] }
          : c
      )
    ), []);

  const removeExercise = useCallback((ci, ei) =>
    setCatData((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, exercises: c.exercises.filter((_, j) => j !== ei) } : c
      )
    ), []);

  const setExName = useCallback((ci, ei, val) =>
    setCatData((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, name: val } : ex)) }
          : c
      )
    ), []);

  const addSet = useCallback((ci, ei) =>
    setCatData((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              exercises: c.exercises.map((ex, j) =>
                j === ei ? { ...ex, sets: [...ex.sets, newSet()] } : ex
              ),
            }
          : c
      )
    ), []);

  const updateSet = useCallback((ci, ei, si, field, val) =>
    setCatData((prev) =>
      prev.map((c, i) =>
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
    ), []);

  const toggleDone = useCallback((ci, ei, si) =>
    setCatData((prev) =>
      prev.map((c, i) =>
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
    ), []);

  // ── Hints: se calculan ANTES de guardar, mientras el usuario edita ──
  // useMemo para no recalcular en cada keystroke de otros campos
  const hints = useMemo(() => {
    const map = {};
    for (const cat of catData) {
      for (const ex of cat.exercises ?? []) {
        if (ex.name && !map[ex.name]) {
          map[ex.name] = getProgressionHint(ex.name);
        }
      }
    }
    return map;
  }, [catData.flatMap((c) => c.exercises.map((e) => e.name)).join("|")]);

  // ── Guardar con detección de PR ───────────────────────
  const handleSave = useCallback((e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);

    // Detectar PRs ANTES de guardar (getLastSession lee historial previo)
    const detected = [];
    for (const cat of catData) {
      for (const ex of cat.exercises ?? []) {
        if (!ex.name?.trim()) continue;
        const status = getPRStatus(ex.name, ex.sets ?? []);
        if (status.isPR) detected.push({ exerciseName: ex.name, status });
      }
    }
    setPrResults(detected);

    const workout = {
      day: day || "Entrenamiento",
      date: new Date().toLocaleDateString("es-CL"),
      timestamp: Date.now(),
      exercises: catData,                      // WorkoutSummary lo usa
      categories: catData.map((c) => c.name), // Dashboard lo usa
    };

    const didSave = saveWorkout(workout);

    // Solo borramos el borrador si el guardado realmente tuvo éxito.
    // Si saveWorkout() falla (localStorage lleno, modo incógnito, etc.)
    // preferimos conservar el borrador para no perder el progreso.
    if (didSave) {
      clearDraftWorkout();
    }

    // Breve pausa para mostrar feedback antes de navegar
    setTimeout(() => {
      setSaving(false);
      onSave(workout);
    }, detected.length > 0 ? 2200 : 350);
  }, [saving, catData, day, onSave]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="screen">
      {/* Topbar */}
      <div className="topbar">
        <button type="button" className="back-btn" onClick={handleBack}>
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

      {/* Overlay de PRs — aparece encima del contenido al guardar */}
      {prResults.length > 0 && (
        <div className="pr-overlay" aria-live="assertive">
          <div className="pr-overlay-inner">
            <p className="pr-overlay-title">🏆 ¡Sesión épica!</p>
            <p className="pr-overlay-sub">Superaste tu marca en:</p>
            {prResults.map(({ exerciseName, status }, i) => (
              <PRBadge key={i} exerciseName={exerciseName} status={status} />
            ))}
          </div>
        </div>
      )}

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

            {cat.expanded && (
              <div className="wf-exercises">
                {cat.exercises.map((ex, ei) => (
                  <div key={ei} className="wf-ex-card">
                    {/* Nombre */}
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

                    {/* ── Hint de progresión ── */}
                    <ExerciseHint hint={hints[ex.name]} />

                    {/* Cabecera de columnas */}
                    <div className="wf-sets-header">
                      <span className="wf-col-num">#</span>
                      <span className="wf-col-label">Peso (kg)</span>
                      <span className="wf-col-label">Reps</span>
                      <span className="wf-col-label" style={{ textAlign: "center" }}>✓</span>
                    </div>

                    {/* Series */}
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
                          aria-label={set.done ? "Desmarcar" : "Marcar serie"}
                        >
                          <Check size={13} strokeWidth={3} />
                        </button>
                      </div>
                    ))}

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

      {/* Footer */}
      <div className="sticky-footer">
        <button
          type="button"
          className={`cta-button ${saving ? "cta-button--saving" : ""}`}
          onClick={handleSave}
        >
          {saving && prResults.length > 0 ? (
            <>🔥 ¡PR detectado! Guardando…</>
          ) : saving ? (
            <><Check size={18} strokeWidth={3} /> Guardando…</>
          ) : (
            <><CheckCircle2 size={18} /> Guardar entrenamiento</>
          )}
        </button>
      </div>
    </div>
  );
}
