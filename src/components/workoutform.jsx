import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "../hooks/useProfile";
import {
  clearDraftWorkout,
  getDraftWorkout,
  getExerciseSuggestions,
  saveDraftWorkout,
  saveWorkout,
} from "../utils/storage";
import { getPRStatus } from "../utils/progressionEngine";
import ExerciseLiveContext from "./ExerciseLiveContext";
import "./workoutform-autocomplete.css";

const newSet = (set = {}) => ({
  id: Date.now() + Math.random(),
  weight: set.weight ?? "",
  reps: set.reps ?? "",
  done: false,
});

const initCategory = (name, preset = null) => ({
  name,
  expanded: true,
  exercises: preset
    ? preset.map((exercise) => ({
        name: exercise.name || "",
        sets: exercise.sets?.length ? exercise.sets.map(() => newSet()) : [newSet()],
      }))
    : [{ name: "Ejercicio 1", sets: [newSet()] }],
});

const normalize = (value = "") => value.trim().toLocaleLowerCase("es");

const formatTime = (seconds) => {
  const values = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  return values.map((value) => String(value).padStart(2, "0")).join(":");
};

const formatRestTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const highlightMatch = (text = "", query = "") => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const index = normalize(text).indexOf(normalize(cleanQuery));
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="wf-suggestion-highlight">{text.slice(index, index + cleanQuery.length)}</span>
      {text.slice(index + cleanQuery.length)}
    </>
  );
};

const getVisibleSets = (sets = []) =>
  sets.filter((set) => String(set?.weight ?? "").trim() || String(set?.reps ?? "").trim()).slice(0, 4);

export default function WorkoutForm({
  day,
  categories = [],
  templateCategories = [],
  initialWorkout = null,
  repeatWorkout = null,
  workoutStartTime,
  onSave,
  onBack,
}) {
  const { profile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseSuggestions] = useState(() => getExerciseSuggestions());
  const [activeSuggestions, setActiveSuggestions] = useState({ ci: null, ei: null, list: [] });
  const [copiedExercise, setCopiedExercise] = useState(null);
  const copiedTimerRef = useRef(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [restEndTime, setRestEndTime] = useState(null);
  const [restRemaining, setRestRemaining] = useState(0);

  const buildFreshCatData = useCallback(() => {
    if (templateCategories.length) {
      return templateCategories.map((category) => initCategory(category.name, category.exercises));
    }
    return categories.map((name) => initCategory(name));
  }, [categories, templateCategories]);

  const [catData, setCatData] = useState(() => {
    const draft = getDraftWorkout();
    if (draft?.catData?.length && !repeatWorkout) return draft.catData;
    if (!initialWorkout?.exercises?.length) return buildFreshCatData();
    return initialWorkout.exercises.map((category) => ({
      name: category.name,
      expanded: true,
      exercises: (category.exercises || []).map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets?.length ? exercise.sets.map(() => newSet()) : [newSet()],
      })),
    }));
  });

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  useEffect(() => {
    if (!workoutStartTime) return undefined;
    const update = () => setElapsedTime(Math.max(0, Math.floor((Date.now() - workoutStartTime) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  useEffect(() => {
    const saved = localStorage.getItem("treino_rest_timer");
    if (!saved) return;
    try {
      const { endTime } = JSON.parse(saved);
      if (endTime > Date.now()) {
        setRestEndTime(endTime);
        toast.info("⏳ Descanso recuperado");
      } else localStorage.removeItem("treino_rest_timer");
    } catch {
      localStorage.removeItem("treino_rest_timer");
    }
  }, []);

  useEffect(() => {
    const draft = getDraftWorkout();
    if (repeatWorkout || !draft?.catData?.length) return;
    toast.info("💪 Entrenamiento recuperado", {
      description: `Continuamos tu sesión del ${draft.day}. Puedes seguir donde lo dejaste o descartarla.`,
      action: { label: "Seguir", onClick: () => {} },
      cancel: {
        label: "Descartar",
        onClick: () => {
          clearDraftWorkout();
          setCatData(buildFreshCatData());
        },
      },
    });
  }, [buildFreshCatData, repeatWorkout]);

  useEffect(() => {
    if (catData.length) {
      saveDraftWorkout({ day, categories, templateCategories, workoutStartTime, catData });
    }
  }, [catData, categories, day, templateCategories, workoutStartTime]);

  useEffect(() => {
    if (!restEndTime) return undefined;
    const update = () => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);
      if (remaining > 0) return setRestRemaining(remaining);
      setRestRemaining(0);
      setRestEndTime(null);
      localStorage.removeItem("treino_rest_timer");
      toast.success("🔥 Descanso terminado");
      if ("vibrate" in navigator) navigator.vibrate([300, 200, 300]);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [restEndTime]);

  const updateCategory = useCallback((ci, updater) => {
    setCatData((previous) => previous.map((category, index) => (index === ci ? updater(category) : category)));
  }, []);

  const updateExercise = useCallback((ci, ei, updater) => {
    updateCategory(ci, (category) => ({
      ...category,
      exercises: category.exercises.map((exercise, index) => (index === ei ? updater(exercise) : exercise)),
    }));
  }, [updateCategory]);

  const handleBack = useCallback(() => {
    clearDraftWorkout();
    onBack?.();
  }, [onBack]);

  const startRestTimer = useCallback(() => {
    const seconds = profile?.rest_time_seconds || 120;
    const endTime = Date.now() + seconds * 1000;
    setRestEndTime(endTime);
    localStorage.setItem("treino_rest_timer", JSON.stringify({ endTime }));
    toast.info(`⏳ Descanso iniciado: ${formatRestTime(seconds)}`);
  }, [profile]);

  const cancelRestTimer = useCallback(() => {
    setRestEndTime(null);
    setRestRemaining(0);
    localStorage.removeItem("treino_rest_timer");
    toast.info("❌ Descanso cancelado");
  }, []);

  const toggleExpand = useCallback((ci) => {
    updateCategory(ci, (category) => ({ ...category, expanded: !category.expanded }));
  }, [updateCategory]);

  const addExercise = useCallback((ci) => {
    updateCategory(ci, (category) => ({
      ...category,
      exercises: [...category.exercises, { name: "", sets: [newSet()] }],
    }));
  }, [updateCategory]);

  const addCategory = useCallback(() => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCatData((previous) => [...previous, { name, expanded: true, exercises: [{ name: "", sets: [newSet()] }] }]);
    setNewCategoryName("");
    setShowCategoryModal(false);
  }, [newCategoryName]);

  const removeExercise = useCallback((ci, ei) => {
    updateCategory(ci, (category) => ({
      ...category,
      exercises: category.exercises.filter((_, index) => index !== ei),
    }));
    setActiveSuggestions({ ci: null, ei: null, list: [] });
  }, [updateCategory]);

  const setExName = useCallback((ci, ei, value) => {
    updateExercise(ci, ei, (exercise) => ({ ...exercise, name: value }));
    const query = normalize(value);
    if (query.length < 2) return setActiveSuggestions({ ci: null, ei: null, list: [] });

    const matches = exerciseSuggestions
      .filter((suggestion) => normalize(suggestion.name).includes(query))
      .sort((a, b) => {
        const startsDifference = Number(!normalize(a.name).startsWith(query)) - Number(!normalize(b.name).startsWith(query));
        return startsDifference || a.name.localeCompare(b.name, "es");
      })
      .slice(0, 6);
    setActiveSuggestions({ ci, ei, list: matches });
  }, [exerciseSuggestions, updateExercise]);

  const applyExerciseSuggestion = useCallback((ci, ei, suggestion) => {
    const sourceSets = suggestion.lastSets?.length ? suggestion.lastSets : [{}];
    updateExercise(ci, ei, (exercise) => ({
      ...exercise,
      name: suggestion.name,
      sets: sourceSets.map((set) => newSet(set)),
    }));
    setActiveSuggestions({ ci: null, ei: null, list: [] });
    setCopiedExercise({ ci, ei });
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedExercise(null), 1800);
  }, [updateExercise]);

  const addSet = useCallback((ci, ei) => {
    updateExercise(ci, ei, (exercise) => ({ ...exercise, sets: [...exercise.sets, newSet()] }));
  }, [updateExercise]);

  const updateSet = useCallback((ci, ei, si, field, value) => {
    updateExercise(ci, ei, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => (index === si ? { ...set, [field]: value } : set)),
    }));
  }, [updateExercise]);

  const toggleDone = useCallback((ci, ei, si) => {
    updateExercise(ci, ei, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => (index === si ? { ...set, done: !set.done } : set)),
    }));
  }, [updateExercise]);

  const handleSave = useCallback((event) => {
    event?.preventDefault();
    if (saving) return;
    setSaving(true);
    let totalVolume = 0;
    let prCount = 0;

    catData.forEach((category) => category.exercises.forEach((exercise) => {
      if (exercise.name?.trim() && getPRStatus(exercise.name, exercise.sets || []).isPR) prCount += 1;
      (exercise.sets || []).forEach((set) => {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        if (Number.isFinite(weight) && Number.isFinite(reps)) totalVolume += weight * reps;
      });
    }));

    const workout = {
      day,
      date: new Date().toLocaleDateString("es-CL"),
      timestamp: Date.now(),
      duration: elapsedTime,
      volume: totalVolume,
      exercises: catData,
      categories: catData.map((category) => category.name),
    };
    if (saveWorkout(workout)) clearDraftWorkout();
    setTimeout(() => {
      setSaving(false);
      onSave?.(workout);
    }, prCount ? 2200 : 350);
  }, [catData, day, elapsedTime, onSave, saving]);

  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={handleBack} aria-label="Volver">
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">{day || "Entrenamiento"}</span>
          <h2>Entrenamiento en curso</h2>
          <span style={{ display: "block", marginTop: 4, color: "#a855f7", fontSize: ".85rem", fontWeight: 600 }}>
            ⏱ {formatTime(elapsedTime)}
          </span>
        </div>
        <button type="button" className={`wf-save-btn ${saving ? "wf-save-btn--done" : ""}`} onClick={handleSave} aria-label="Guardar entrenamiento">
          <CheckCircle2 size={22} />
        </button>
      </div>

      <div className="form-scroll" style={{ paddingTop: 12 }}>
        {catData.map((category, ci) => (
          <div key={`${category.name}-${ci}`} className="wf-cat-block">
            <button type="button" className="wf-cat-header" onClick={() => toggleExpand(ci)}>
              <span className="wf-cat-title">{category.name}</span>
              <span className="wf-chevron">{category.expanded ? "▾" : "▸"}</span>
            </button>

            {category.expanded && (
              <div className="wf-exercises">
                {category.exercises.map((exercise, ei) => {
                  const wasCopied = copiedExercise?.ci === ci && copiedExercise?.ei === ei;
                  return (
                    <div key={ei} className="wf-ex-card">
                      <div className="wf-ex-name-row" style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="wf-ex-name-input"
                          value={exercise.name}
                          onChange={(event) => setExName(ci, ei, event.target.value)}
                          placeholder="Nombre del ejercicio"
                          autoComplete="off"
                          aria-autocomplete="list"
                        />
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeExercise(ci, ei)} aria-label="Eliminar ejercicio">
                          <Trash2 size={16} />
                        </button>

                        {activeSuggestions.ci === ci && activeSuggestions.ei === ei && activeSuggestions.list.length > 0 && (
                          <div className="wf-suggestions" role="listbox" aria-label="Sugerencias de ejercicios">
                            {activeSuggestions.list.map((suggestion) => {
                              const visibleSets = getVisibleSets(suggestion.lastSets);
                              return (
                                <button
                                  key={`${suggestion.name}-${suggestion.category}`}
                                  type="button"
                                  className="wf-suggestion-item"
                                  role="option"
                                  aria-selected="false"
                                  onClick={() => applyExerciseSuggestion(ci, ei, suggestion)}
                                >
                                  <div className="wf-suggestion-main">
                                    <span className="wf-suggestion-icon" aria-hidden="true">🏋️</span>
                                    <span className="wf-suggestion-copy">
                                      <span className="wf-suggestion-name">{highlightMatch(suggestion.name, exercise.name)}</span>
                                      <span className="wf-suggestion-category">{suggestion.category}</span>
                                    </span>
                                  </div>
                                  {visibleSets.length > 0 && (
                                    <span className="wf-suggestion-sets">
                                      {visibleSets.map((set, index) => (
                                        <span key={`${suggestion.name}-${index}`} className="wf-suggestion-set">
                                          {set.weight || 0} × {set.reps || 0}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {wasCopied && <div className="wf-copied-banner" role="status">✨ Series copiadas automáticamente</div>}

                      <ExerciseLiveContext exerciseName={exercise.name} sets={exercise.sets} />

                      <div className="wf-sets-header">
                        <span className="header-space" />
                        <span className="header-weight">Peso (kg)</span>
                        <span className="header-reps">Reps</span>
                        <span className="header-check">✓</span>
                      </div>

                      {exercise.sets.map((set, si) => (
                        <div key={set.id} className={`wf-set-row ${set.done ? "wf-set-row--done" : ""}`}>
                          <div className="set-number-box"><span>{si + 1}</span></div>
                          <input
                            type="number"
                            inputMode="decimal"
                            className={`wf-set-input ${wasCopied ? "wf-set-input--copied" : ""}`}
                            placeholder="0"
                            value={set.weight}
                            onChange={(event) => updateSet(ci, ei, si, "weight", event.target.value)}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            className={`wf-set-input ${wasCopied ? "wf-set-input--copied" : ""}`}
                            placeholder="0"
                            value={set.reps}
                            onChange={(event) => updateSet(ci, ei, si, "reps", event.target.value)}
                          />
                          <button
                            type="button"
                            className={`wf-done-btn ${set.done ? "active wf-done-btn--active" : ""}`}
                            onClick={() => toggleDone(ci, ei, si)}
                            aria-label={`Marcar serie ${si + 1}`}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      ))}

                      <button type="button" className="wf-add-set-btn" onClick={() => addSet(ci, ei)}>+ Serie</button>
                      <button type="button" className="wf-rest-btn" onClick={restEndTime ? cancelRestTimer : startRestTimer}>
                        {restEndTime
                          ? `❌ Cancelar (${formatRestTime(restRemaining)})`
                          : `⏱ Descansar ${formatRestTime(profile?.rest_time_seconds || 120)}`}
                      </button>
                    </div>
                  );
                })}

                <button type="button" className="wf-add-ex-btn" onClick={() => addExercise(ci)}>
                  + Añadir ejercicio a {category.name}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="wf-add-category-btn" onClick={() => setShowCategoryModal(true)}>
        ➕ Añadir grupo muscular
      </button>

      {showCategoryModal && (
        <div className="wf-modal-overlay">
          <div className="wf-modal">
            <h3>Nuevo grupo muscular</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Ej: Abdomen"
              className="wf-modal-input"
            />
            <div className="wf-modal-actions">
              <button type="button" onClick={() => { setShowCategoryModal(false); setNewCategoryName(""); }}>Cancelar</button>
              <button type="button" onClick={addCategory}>Crear</button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky-footer">
        <button type="button" className="cta-button" onClick={handleSave}>Guardar entrenamiento</button>
      </div>
    </div>
  );
}
