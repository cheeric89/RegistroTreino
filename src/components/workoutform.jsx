// src/components/workoutform.jsx
import React, { useState } from "react";
import { ChevronLeft, Plus, Trash2, CheckCircle } from "lucide-react";

// Función auxiliar para generar la estructura de una serie vacía
const newSet = () => ({
  id: Date.now() + Math.random(),
  weight: "",
  reps: "",
  done: false,
});

// Función para inicializar una categoría (músculo) con o sin ejercicios predefinidos
const initCategory = (name, presetExercises = null) => ({
  name,
  expanded: true,
  exercises: presetExercises
    ? presetExercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets ? ex.sets.map(() => newSet()) : [newSet()],
      }))
    : [{ name: "Ejercicio 1", sets: [newSet()] }],
});

export default function WorkoutForm({ day, categories, templateCategories, onSave, onBack }) {
  // Estado inicial inteligente: usa la plantilla si existe, si no, las categorías manuales
  const [catData, setCatData] = useState(() => {
    if (templateCategories && templateCategories.length > 0) {
      return templateCategories.map((tc) => initCategory(tc.name, tc.exercises));
    }
    return categories ? categories.map((name) => initCategory(name)) : [];
  });

  // Métodos de interacción de la interfaz
  const toggleExpand = (index) => {
    setCatData(
      catData.map((cat, i) => (i === index ? { ...cat, expanded: !cat.expanded } : cat))
    );
  };

  const addExercise = (catIndex) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: [...cat.exercises, { name: `Ejercicio ${cat.exercises.length + 1}`, sets: [newSet()] }],
            }
          : cat
      )
    );
  };

  const removeExercise = (catIndex, exIndex) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: cat.exercises.filter((_, j) => j !== exIndex),
            }
          : cat
      )
    );
  };

  const handleExerciseNameChange = (catIndex, exIndex, value) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) => (j === exIndex ? { ...ex, name: value } : ex)),
            }
          : cat
      )
    );
  };

  const addSet = (catIndex, exIndex) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === exIndex ? { ...ex, sets: [...ex.sets, newSet()] } : ex
              ),
            }
          : cat
      )
    );
  };

  const updateSet = (catIndex, exIndex, setIndex, field, value) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === exIndex
                  ? {
                      ...ex,
                      sets: ex.sets.map((s, k) => (k === setIndex ? { ...s, [field]: value } : s)),
                    }
                  : ex
              ),
            }
          : cat
      )
    );
  };

  const toggleSetDone = (catIndex, exIndex, setIndex) => {
    setCatData(
      catData.map((cat, i) =>
        i === catIndex
          ? {
              ...cat,
              exercises: cat.exercises.map((ex, j) =>
                j === exIndex
                  ? {
                      ...ex,
                      sets: ex.sets.map((s, k) => (k === setIndex ? { ...s, done: !s.done } : s)),
                    }
                  : ex
              ),
            }
          : cat
      )
    );
  };

  const handleFinalSave = () => {
    onSave({
      day,
      date: new Date().toLocaleDateString(),
      categories: catData,
    });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">{day || "Entrenamiento"}</span>
          <h2>Registrar Series</h2>
        </div>
        <button className="save-btn" onClick={handleFinalSave}>
          <CheckCircle size={20} color="var(--primary)" />
        </button>
      </div>

      <div className="workout-container" style={{ padding: "16px", paddingBottom: "80px" }}>
        {catData.map((cat, catIdx) => (
          <div key={catIdx} className="category-section" style={{ marginBottom: "20px" }}>
            <div 
              className="category-header" 
              onClick={() => toggleExpand(catIdx)}
              style={{ display: "flex", justifyContent: "between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px" }}
            >
              <h3 style={{ margin: 0, flex: 1 }}>{cat.name}</h3>
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                {cat.expanded ? "Ocultar" : "Mostrar"}
              </span>
            </div>

            {cat.expanded && (
              <div className="category-content" style={{ marginTop: "10px" }}>
                {cat.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="exercise-card" style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      <input
                        type="text"
                        className="exercise-name-input"
                        value={ex.name}
                        onChange={(e) => handleExerciseNameChange(catIdx, exIdx, e.target.value)}
                        style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-1)", fontSize: "16px", padding: "4px" }}
                      />
                      <button onClick={() => removeExercise(catIdx, exIdx)} style={{ background: "transparent", border: "none", color: "var(--error)", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="sets-table">
                      {ex.sets.map((set, setIdx) => (
                        <div key={set.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <span style={{ width: "24px", color: "var(--text-3)" }}>#{setIdx + 1}</span>
                          <input
                            type="number"
                            placeholder="kg"
                            value={set.weight}
                            onChange={(e) => updateSet(catIdx, exIdx, setIdx, "weight", e.target.value)}
                            style={{ width: "60px", padding: "4px", textAlign: "center", borderRadius: "4px", border: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", color: "white" }}
                          />
                          <input
                            type="number"
                            placeholder="reps"
                            value={set.reps}
                            onChange={(e) => updateSet(catIdx, exIdx, setIdx, "reps", e.target.value)}
                            style={{ width: "60px", padding: "4px", textAlign: "center", borderRadius: "4px", border: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", color: "white" }}
                          />
                          <button 
                            onClick={() => toggleSetDone(catIdx, exIdx, setIdx)}
                            style={{ 
                              marginLeft: "auto", 
                              padding: "4px 8px", 
                              borderRadius: "4px", 
                              border: "none",
                              background: set.done ? "var(--primary)" : "rgba(255,255,255,0.1)",
                              color: set.done ? "black" : "white",
                              fontSize: "12px",
                              cursor: "pointer"
                            }}
                          >
                            {set.done ? "Hecho" : "Pendiente"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => addSet(catIdx, exIdx)} 
                      style={{ marginTop: "8px", background: "transparent", border: "1px dashed var(--border)", color: "var(--text-2)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                      <Plus size={12} /> Añadir Serie
                    </button>
                  </div>
                ))}

                <button 
                  onClick={() => addExercise(catIdx)} 
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "none", color: "white", padding: "8px", borderRadius: "6px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", cursor: "pointer", marginTop: "8px" }}
                >
                  <Plus size={16} /> Añadir Ejercicio
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}