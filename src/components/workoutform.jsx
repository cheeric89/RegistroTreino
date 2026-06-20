import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "../hooks/useProfile";
import {
  saveWorkout,
  saveDraftWorkout,
  getDraftWorkout,
  clearDraftWorkout,
} from "../utils/storage";
import { getProgressionHint, getPRStatus } from "../utils/progressionEngine";
import ExerciseHint, { PRBadge } from "./ExerciseHint";

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

export default function WorkoutForm({ day, categories = [], templateCategories = [], workoutStartTime, onSave, onBack }) {
  const { profile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [prResults, setPrResults] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [restEndTime, setRestEndTime] = useState(null);
  const [restRemaining, setRestRemaining] = useState(0);
  console.log("Inicio del entrenamiento:", workoutStartTime);
  useEffect(() => {
  if (!workoutStartTime) return;

  const updateTimer = () => {
    const seconds = Math.floor(
      (Date.now() - workoutStartTime) / 1000
    );

    setElapsedTime(seconds);
  };

  // Actualiza inmediatamente
  updateTimer();

  // Actualiza cada segundo
  const interval = setInterval(updateTimer, 1000);

  return () => clearInterval(interval);
}, [workoutStartTime]);

useEffect(() => {
  const savedRest = localStorage.getItem("treino_rest_timer");

  if (!savedRest) return;

  try {
    const { endTime } = JSON.parse(savedRest);

    // Si el descanso todavía no termina, lo recuperamos
    if (endTime > Date.now()) {
      setRestEndTime(endTime);

      toast.info("⏳ Descanso recuperado");
    } else {
      // Si ya pasó, limpiamos basura
      localStorage.removeItem("treino_rest_timer");
    }
  } catch {
    localStorage.removeItem("treino_rest_timer");
  }
}, []); 

  // Definimos la función de construcción usando las props que llegan al componente
  const buildFreshCatData = useCallback(() => {
    if (templateCategories && templateCategories.length > 0)
      return templateCategories.map((tc) => initCategory(tc.name, tc.exercises));
    if (categories && categories.length > 0)
      return categories.map((name) => initCategory(name));
    return [];
  }, [categories, templateCategories]);

  // Inicializamos el estado principal
  const [catData, setCatData] = useState(() => {
    const draft = getDraftWorkout();
    return draft?.catData?.length > 0 ? draft.catData : buildFreshCatData();
  });

  // Aviso de recuperación de borrador
  useEffect(() => {
    const draft = getDraftWorkout();
    if (draft?.catData?.length > 0) {
      toast.info("💪 Entrenamiento recuperado", {
  description: `Continuamos tu sesión del ${draft.day}. Puedes seguir donde lo dejaste o descartarla.`,
  action: {
    label: "Seguir",
    onClick: () => {}
  },
  cancel: {
    label: "Descartar",
    onClick: () => {
      clearDraftWorkout();
      setCatData(buildFreshCatData());
    }
  }
});
    }
  }, [buildFreshCatData]);

  // Autosave
  useEffect(() => {
  if (catData && catData.length > 0) {
    saveDraftWorkout({
      day,
      categories,
      templateCategories,
      workoutStartTime,
      catData
    });
  }
}, [
  catData,
  day,
  categories,
  templateCategories,
  workoutStartTime
]);
useEffect(() => {
  if (!restEndTime) return;

  const updateRestTimer = () => {
    const remaining = Math.ceil(
      (restEndTime - Date.now()) / 1000
    );

    if (remaining <= 0) {
      setRestRemaining(0);
      setRestEndTime(null);

      localStorage.removeItem("treino_rest_timer");

      toast.success("🔥 Descanso terminado");

      if ("vibrate" in navigator) {
        navigator.vibrate([300, 200, 300]);
      }

      return;
    }

    setRestRemaining(remaining);
  };

  // Actualizar inmediatamente
  updateRestTimer();

  // Luego cada segundo
  const interval = setInterval(updateRestTimer, 1000);

  return () => clearInterval(interval);
}, [restEndTime]);

  const handleBack = useCallback(() => {
    clearDraftWorkout();
    onBack?.();
  }, [onBack]);

  const startRestTimer = useCallback(() => {
  const seconds = profile?.rest_time_seconds || 120;

  const endTime = Date.now() + seconds * 1000;

  setRestEndTime(endTime);

  localStorage.setItem(
    "treino_rest_timer",
    JSON.stringify({
      endTime,
    })
  );

  toast.info(`⏳ Descanso iniciado: ${formatRestTime(seconds)}`);
}, [profile]);
const cancelRestTimer = useCallback(() => {
  setRestEndTime(null);
  setRestRemaining(0);

  localStorage.removeItem("treino_rest_timer");

  toast.info("❌ Descanso cancelado");
}, []);


  // ── Mutadores de estado ────────────────────────────────
  const toggleExpand = useCallback((ci) =>
    setCatData((prev) => prev.map((c, i) => (i === ci ? { ...c, expanded: !c.expanded } : c))), []);

  const addExercise = useCallback((ci) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: [...c.exercises, { name: "", sets: [newSet()] }] } : c
    )), []);
    const addCategory = useCallback(() => {
  const name = newCategoryName.trim();

  if (!name) return;

  setCatData((prev) => [
    ...prev,
    {
      name,
      expanded: true,
      exercises: [
        {
          name: "",
          sets: [newSet()]
        }
      ]
    }
  ]);

  setNewCategoryName("");
  setShowCategoryModal(false);
}, [newCategoryName]);

  const removeExercise = useCallback((ci, ei) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: c.exercises.filter((_, j) => j !== ei) } : c
    )), []);

  const setExName = useCallback((ci, ei, val) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, name: val } : ex)) } : c
    )), []);

  const addSet = useCallback((ci, ei) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, sets: [...ex.sets, newSet()] } : ex)) } : c
    )), []);

  const updateSet = useCallback((ci, ei, si, field, val) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, sets: ex.sets.map((s, k) => (k === si ? { ...s, [field]: val } : s)) } : ex)) } : c
    )), []);

  const toggleDone = useCallback((ci, ei, si) =>
    setCatData((prev) => prev.map((c, i) => 
      i === ci ? { ...c, exercises: c.exercises.map((ex, j) => (j === ei ? { ...ex, sets: ex.sets.map((s, k) => (k === si ? { ...s, done: !s.done } : s)) } : ex)) } : c
    )), []);

  const hints = useMemo(() => {
    const map = {};
    catData.forEach(cat => {
      cat.exercises.forEach(ex => {
        if (ex.name && !map[ex.name]) map[ex.name] = getProgressionHint(ex.name);
      });
    });
    return map;
  }, [catData]);

  const handleSave = useCallback((e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    const detected = [];
    catData.forEach(cat => {
      cat.exercises.forEach(ex => {
        if (!ex.name?.trim()) return;
        const status = getPRStatus(ex.name, ex.sets ?? []);
        if (status.isPR) detected.push({ exerciseName: ex.name, status });
      });
    });
    setPrResults(detected);
    const workout = { day, date: new Date().toLocaleDateString("es-CL"), timestamp: Date.now(), exercises: catData, categories: catData.map(c => c.name) };
    if (saveWorkout(workout)) clearDraftWorkout();
    setTimeout(() => { setSaving(false); onSave(workout); }, detected.length > 0 ? 2200 : 350);
  }, [saving, catData, day, onSave]);
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

const formatRestTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return `${mins}:${secs}`;
};

  return (
  <div className="screen">
    {/* Topbar */}
<div className="topbar">
  <button type="button" className="back-btn" onClick={onBack}>
    <ChevronLeft size={20} />
  </button>

  <div className="topbar-title">
    <span className="step-label">{day || "Entrenamiento"}</span>
    <h2>Entrenamiento en curso</h2>

    <span
      style={{
        fontSize: "0.85rem",
        color: "#a855f7",
        fontWeight: "600",
        marginTop: "4px",
        display: "block",
      }}
    >
      ⏱ {formatTime(elapsedTime)}
    </span>
  </div>

  <button
    type="button"
    className={`wf-save-btn ${saving ? "wf-save-btn--done" : ""}`}
    onClick={handleSave}
  >
    <CheckCircle2 size={22} />
  </button>
</div>

    {/* Formulario scrollable */}
    <div className="form-scroll" style={{ paddingTop: 12 }}>
      {catData.map((cat, ci) => (
        <div key={ci} className="wf-cat-block">
          <button type="button" className="wf-cat-header" onClick={() => toggleExpand(ci)}>
            <span className="wf-cat-title">{cat.name}</span>
            <span className="wf-chevron">{cat.expanded ? "▾" : "▸"}</span>
          </button>
          
          {cat.expanded && (
            <div className="wf-exercises">
              {cat.exercises.map((ex, ei) => (
                <div key={ei} className="wf-ex-card">
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
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Encabezados alineados */}
                  <div className="wf-sets-header">
                    <span className="header-space"></span>
                    <span className="header-weight">Peso (kg)</span>
                    <span className="header-reps">Reps</span>
                    <span className="header-check">✓</span>
                  </div>
                  
                  {/* Filas de series */}
                  {ex.sets.map((set, si) => (
                    <div key={set.id} className={`wf-set-row ${set.done ? "wf-set-row--done" : ""}`}>
                      <div className="set-number-box">
                        <span>{si + 1}</span>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="wf-set-input"
                        placeholder="0"
                        value={set.weight}
                        onChange={(e) => updateSet(ci, ei, si, "weight", e.target.value)}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        className="wf-set-input"
                        placeholder="0"
                        value={set.reps}
                        onChange={(e) => updateSet(ci, ei, si, "reps", e.target.value)}
                      />
                      <button
                        type="button"
                        className={`wf-done-btn ${set.done ? "active" : ""}`}
                        onClick={() => toggleDone(ci, ei, si)}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button type="button" className="wf-add-set-btn" onClick={() => addSet(ci, ei)}>
                    + Serie
                  </button>
                  <button
  type="button"
  className="wf-rest-btn"
  onClick={restEndTime ? cancelRestTimer : startRestTimer}
>
  {restEndTime
  ? `❌ Cancelar (${formatRestTime(restRemaining)})`
  : `⏱ Descansar ${formatRestTime(profile?.rest_time_seconds || 120)}`}
</button>
                </div>
              ))} 

              {/* Botón de "Añadir ejercicio" debajo de cada sección */}
              <button
                type="button"
                className="wf-add-ex-btn"
                onClick={() => addExercise(ci)}
              >
                + Añadir ejercicio a {cat.name}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
    <button
  type="button"
  className="wf-add-category-btn"
  onClick={() => setShowCategoryModal(true)}
>
  ➕ Añadir grupo muscular
</button>
{showCategoryModal && (
  <div className="wf-modal-overlay">
    <div className="wf-modal">
      <h3>Nuevo grupo muscular</h3>

      <input
        type="text"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        placeholder="Ej: Abdomen"
        className="wf-modal-input"
      />

      <div className="wf-modal-actions">
        <button
          type="button"
          onClick={() => {
            setShowCategoryModal(false);
            setNewCategoryName("");
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={addCategory}
        >
          Crear
        </button>
      </div>
    </div>
  </div>
)}

    {/* Footer */}
    <div className="sticky-footer">
      <button type="button" className="cta-button" onClick={handleSave}>
        Guardar entrenamiento
      </button>
    </div>
  </div>
);
}